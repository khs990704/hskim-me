// Nero 색인 조각 (P8, docs/01-planning/ai-nero.md §3 · §6.3).
//
// 공개 승인된 산출물(out/content · out/life.json)만 읽어 문단 조각으로 자른다 — Vault 를 직접 읽지 않는다.
// 조각마다 내용 해시를 붙여, 배포 때 바뀐 조각만 다시 임베딩한다 (scripts: nero-index).
// 마지막에 조각 전체를 유출 검사한다 — 걸리면 빌드를 멈춘다. 근거 자료에 비공개 정보가 섞이면
// Nero 가 그걸 그대로 읽어 말할 수 있기 때문이다.
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { ROOT } from '../config.mjs'
import { privateTitles } from './private-titles.mjs'

const OUT = path.join(ROOT, 'out')
const MAX = 900          // 조각 하나의 글자 수 상한 (제목 줄 제외)
const MIN = 120          // 이보다 짧은 꼬리는 앞 조각에 붙인다

const walk = (d, o = []) => {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, e.name)
    e.isDirectory() ? walk(p, o) : p.endsWith('.json') && o.push(p)
  }
  return o
}
const sha = s => crypto.createHash('sha1').update(s).digest('hex')

const decode = s => s.replace(/&nbsp;/g, ' ').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, '&')
/** HTML 한 구간 → 문단 목록. 목록은 "- ", 표는 칸을 " | " 로, 코드는 그대로 */
const blocks = html => decode(html
  .replace(/<(script|style|svg)[\s\S]*?<\/\1>/g, ' ')
  .replace(/<li[^>]*>/g, '\n- ').replace(/<\/(td|th)>/g, ' | ').replace(/<\/tr>/g, '\n')
  .replace(/<\/(p|div|ul|ol|pre|table|blockquote|h[1-6])>/g, '\n\n').replace(/<br\s*\/?>/g, '\n')
  .replace(/<[^>]+>/g, ''))
  .split(/\n{2,}/).map(b => b.replace(/[ \t]+/g, ' ').replace(/\n /g, '\n').trim()).filter(Boolean)

/**
 * 문서 하나 → 조각들. h2 · h3 구간마다 문단을 모은 뒤, 같은 문서 안에서 상한(900자)까지 이어 붙인다.
 * 구간마다 따로 자르면 짧은 구간이 많아 조각이 너무 작아졌다(중앙 144자) — 근거로서 맥락이 모자란다.
 * 구간이 바뀌는 곳에는 [구간 이름] 을 넣어, 이어 붙여도 어느 구간 이야기인지 남긴다.
 */
function split(doc) {
  const units = []          // { section, text } — 문단 하나씩
  let h2 = ''
  for (const part of doc.html.split(/(?=<h[23][\s>])/)) {
    const m = part.match(/^<h([23])[^>]*>([\s\S]*?)<\/h\1>/)
    let section = h2, body = part
    if (m) {
      const name = decode(m[2].replace(/<[^>]+>/g, '')).trim()
      if (m[1] === '2') { h2 = name; section = name } else section = h2 ? `${h2} › ${name}` : name
      body = part.slice(m[0].length)
    }
    for (const b of blocks(body)) {
      // 한 문단이 상한보다 길면 문장 경계에서 다시 자른다
      const pieces = b.length > MAX ? b.match(new RegExp(`[\\s\\S]{1,${MAX}}(?:[.!?。]\\s|\\n|$)`, 'g')) ?? [b] : [b]
      for (const p of pieces) units.push({ section, text: p.trim() })
    }
  }
  const out = []
  let cur = null
  for (const u of units) {
    const head = cur && u.section !== cur.last ? `[${u.section}]\n` : ''
    if (cur && cur.text.length + head.length + u.text.length > MAX) { out.push(cur); cur = null }
    if (!cur) cur = { section: u.section, text: u.text, last: u.section }
    else { cur.text += '\n' + (u.section !== cur.last ? `[${u.section}]\n` : '') + u.text; cur.last = u.section }
  }
  if (cur) out.push(cur)
  // 아주 짧은 꼬리는 앞 조각에 붙인다
  if (out.length > 1 && out.at(-1).text.length < MIN) { const t = out.pop(); out.at(-1).text += '\n' + t.text }
  return out.map(({ section, text }) => ({ section, text }))
}

const docs = walk(path.join(OUT, 'content')).map(f => JSON.parse(fs.readFileSync(f, 'utf8')))
const lifeFile = path.join(OUT, 'life.json')
const life = fs.existsSync(lifeFile) ? JSON.parse(fs.readFileSync(lifeFile, 'utf8')).posts : []

const chunks = []
for (const d of docs) {
  // 첫 조각 앞에는 한 줄 설명을 둔다 — "이 노트가 무엇인지"를 묻는 질문이 설명으로 걸리게
  const pieces = split(d)
  if (d.description && pieces.length) pieces[0].text = `${d.description}\n${pieces[0].text}`
  if (!pieces.length && d.description) pieces.push({ section: '', text: d.description })
  pieces.forEach((p, i) => chunks.push({ route: d.route, title: d.title, kind: d.kind, section: p.section, n: i, text: p.text }))
}
for (const p of life) {
  const text = [p.description, ...p.text].filter(Boolean).join('\n')
  if (text) chunks.push({ route: `life/${p.slug}`, title: p.heading, kind: 'life', section: p.category, n: 0, text: text.slice(0, MAX * 2) })
}
for (const c of chunks) {
  // Vectorize 의 id 는 64 바이트까지 — 주소(한글 가능)를 해시로 줄인다
  c.id = `${sha(c.route).slice(0, 20)}-${c.n}`
  // 임베딩에 넣는 글 — 제목 · 구간 이름을 앞에 붙여 짧은 조각도 맥락을 갖게
  c.embed = [c.title, c.section, c.text].filter(Boolean).join('\n')
  c.hash = sha(c.embed).slice(0, 16)
}

// ── 유출 검사 (ai-nero.md §6.3) ─────────────────────────────────────────
// 걸리면 멈춘다: 비공개 회사 케이스 제목, 공개 주소 외 이메일, 전화번호, 주민등록번호 모양, 비밀값 모양.
// 사설 IP 는 네트워크 지식 노트가 예시로 쓰므로(192.168.0.1 등) 알리기만 한다.
const PUBLIC_EMAIL = 'mail@hskim.me'
const RULES = [
  ['이메일', /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g, m => m.toLowerCase() !== PUBLIC_EMAIL && !/@(example|test)\.(com|org)$/i.test(m)],
  ['전화번호', /(?<![\d.])01[016789][- .]?\d{3,4}[- .]?\d{4}(?![\d.])/g],
  ['주민등록번호', /(?<!\d)\d{6}-[1-4]\d{6}(?!\d)/g],
  ['비밀값', /(AKIA[0-9A-Z]{16}|sk-[A-Za-z0-9_-]{20,}|ghp_[A-Za-z0-9]{30,}|xox[abp]-[A-Za-z0-9-]{10,}|-----BEGIN [A-Z ]*PRIVATE KEY-----)/g],
]
const WARN = [['사설 IP', /(?<![\d.])(10\.\d{1,3}|192\.168|172\.(1[6-9]|2\d|3[01]))\.\d{1,3}\.\d{1,3}(?![\d.])/g]]
const titles = privateTitles()
const stops = [], warns = []
for (const c of chunks) {
  for (const t of titles) if (c.embed.includes(t)) stops.push([c, '비공개 케이스 제목', t])
  for (const [name, re, keep = () => true] of RULES) for (const m of c.embed.match(re) ?? []) if (keep(m)) stops.push([c, name, m])
  for (const [name, re] of WARN) for (const m of c.embed.match(re) ?? []) warns.push([c, name, m])
}

const lens = chunks.map(c => c.text.length).sort((a, b) => a - b)
console.log(`  Nero 색인 조각 — 문서 ${docs.length + life.length}편 → 조각 ${chunks.length}개 (글자 중앙 ${lens[lens.length >> 1]} · 최대 ${lens.at(-1)})`)
if (warns.length) console.log(`  ⚠ 알림: ${[...new Set(warns.map(([c, n, m]) => `${n} ${m} (${c.route})`))].slice(0, 8).join(', ')}${warns.length > 8 ? ' …' : ''}`)
if (stops.length) {
  console.error(`\n  ✗ Nero 색인 유출 검사 — ${stops.length}건. 근거 자료에 넣을 수 없는 내용이 있습니다:`)
  for (const [c, n, m] of stops.slice(0, 20)) console.error(`     ${n}: ${m}  ←  ${c.route} (${c.section || '첫 구간'})`)
  console.error('  Vault 의 해당 노트에서 지우거나 가린 뒤 다시 빌드하세요.\n')
  process.exit(1)
}

fs.writeFileSync(path.join(OUT, 'chunks.json'), JSON.stringify(chunks.map(({ embed, ...c }) => ({ ...c, embed }))))
