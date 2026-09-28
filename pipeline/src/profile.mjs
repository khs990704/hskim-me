// 프로필 — Vault `03 Portfolio/Profile.md` → out/profile.json
//
// /about 스탯창의 데이터를 만든다 (기획 docs/01-planning/profile-and-life.md §5).
// 머리말(YAML)은 칸이 정해진 데이터, 본문은 `## 제목` 절 단위의 글이다.
//
// 형식이 틀리면 빌드를 멈춘다. 날짜 모양 하나 틀린 것으로 경력 칸이 조용히
// 사라지면, 사이트를 보기 전까지 아무도 모른다.
import fs from 'node:fs'
import path from 'node:path'
import { parse as parseYaml } from 'yaml'
import { unified } from 'unified'
import remarkParse from 'remark-parse'
import remarkGfm from 'remark-gfm'
import remarkRehype from 'remark-rehype'
import rehypeStringify from 'rehype-stringify'
import { STAGE, ROOT, PROFILE } from '../config.mjs'
import { RECORD_IDS, CERT_FIELDS } from '../achievements.mjs'

const OUT = path.join(ROOT, 'out')
const SRC = path.join(STAGE, PROFILE)

const errors = []
const warns = []
const err = (where, msg) => errors.push(`${where} — ${msg}`)

if (!fs.existsSync(SRC)) {
  // 아직 Vault 에 없거나 공개 규칙에서 빠진 경우. /about 은 예전 방식으로 남는다.
  console.log(`\n  프로필 — ${PROFILE} 없음, 건너뜀`)
  process.exit(0)
}

// ---------- 읽기 ----------
const raw = fs.readFileSync(SRC, 'utf8')
const m = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/)
if (!m) {
  console.error(`\n  ✗ 프로필 — ${PROFILE} 맨 위에 --- 로 감싼 머리말이 없습니다`)
  process.exit(1)
}
let data
try {
  data = parseYaml(m[1]) ?? {}
} catch (e) {
  console.error(`\n  ✗ 프로필 — 머리말 YAML 을 읽지 못했습니다 (${e.message.split('\n')[0]})`)
  process.exit(1)
}
// Obsidian 주석(%% … %%)은 작성 안내용이다. 공개하지 않는다.
const body = m[2].replace(/%%[\s\S]*?%%/g, '')

// ---------- 검사 도구 ----------
const YM = /^\d{4}-(0[1-9]|1[0-2])$/
const YMD = /^\d{4}-(0[1-9]|1[0-2])(-(0[1-9]|[12]\d|3[01]))?$/
const URL_RE = /^https?:\/\/\S+$/
const str = (v, where, { required = true } = {}) => {
  if (v === undefined || v === null || v === '') {
    if (required) err(where, '비어 있습니다')
    return ''
  }
  if (typeof v !== 'string') { err(where, `글자여야 합니다 (지금: ${JSON.stringify(v)})`); return '' }
  return v.trim()
}
// YAML 은 2024-08 을 글자로, 2024-08-01 을 날짜 객체로 읽는다. 모두 글자로 맞춘다.
const dateStr = v => (v instanceof Date ? v.toISOString().slice(0, 10) : v === undefined || v === null ? '' : String(v))
const list = (v, where) => {
  if (v === undefined || v === null) return []
  if (!Array.isArray(v)) { err(where, '목록(- 로 시작하는 줄)이어야 합니다'); return [] }
  return v
}

// ---------- 기본 ----------
const profile = {
  name: str(data.name, 'name'),
  nameEn: str(data.name_en, 'name_en'),
  class: str(data.class, 'class'),
  tagline: str(data.tagline, 'tagline'),
  // 장착 칭호 — 본문 `## 칭호 장착` 의 체크박스로 고른다 (아래). 얻었는지는 character.mjs 가 확인한다
  title: '',
  titleList: [],
  avatar: str(data.avatar, 'avatar', { required: false }),
  links: {},
  career: [],
  education: [],
  training: [],
  certs: [],
  featured: [],
  traits: [],
  records: [],
  sections: {},
}

if (data.title) err('title', '장착 칭호는 머리말 title 대신 본문 "## 칭호 장착" 의 체크박스로 고릅니다. title 줄을 지워 주세요')

// ---------- 링크 ----------
const links = data.links ?? {}
if (typeof links !== 'object' || Array.isArray(links)) err('links', '이름: 주소 형태여야 합니다')
else {
  for (const [k, v] of Object.entries(links)) {
    const s = str(v, `links.${k}`)
    if (!s) continue
    if (k === 'email') {
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(s)) err(`links.${k}`, `이메일 모양이 아닙니다: ${s}`)
    } else if (!URL_RE.test(s)) err(`links.${k}`, `https:// 로 시작하는 주소여야 합니다: ${s}`)
    profile.links[k] = s
  }
}

// ---------- 경력 · 학력 · 교육 과정 ----------
// to 가 비어 있거나 '현재' 면 진행 중
function period(item, where) {
  const from = dateStr(item.from)
  const to = dateStr(item.to)
  if (!YM.test(from)) err(`${where}.from`, `2024-08 모양이어야 합니다 (지금: ${from || '비어 있음'})`)
  const ongoing = !to || to === '현재'
  if (!ongoing && !YM.test(to)) err(`${where}.to`, `2026-03 모양이거나 '현재' 여야 합니다 (지금: ${to})`)
  if (!ongoing && YM.test(from) && YM.test(to) && to < from) err(where, `끝(${to})이 시작(${from})보다 앞섭니다`)
  return { from, to: ongoing ? null : to }
}
list(data.career, 'career').forEach((c, i) => {
  const w = `career[${i + 1}]`
  profile.career.push({ ...period(c, w), org: str(c.org, `${w}.org`), role: str(c.role, `${w}.role`), note: str(c.note, `${w}.note`, { required: false }) })
})
list(data.education, 'education').forEach((c, i) => {
  const w = `education[${i + 1}]`
  profile.education.push({ ...period(c, w), org: str(c.org, `${w}.org`), major: str(c.major, `${w}.major`), note: str(c.note, `${w}.note`, { required: false }) })
})
list(data.training, 'training').forEach((c, i) => {
  const w = `training[${i + 1}]`
  profile.training.push({ ...period(c, w), org: str(c.org, `${w}.org`), name: str(c.name, `${w}.name`), note: str(c.note, `${w}.note`, { required: false }) })
})

// ---------- 자격증 · 수료증 ----------
const CERT_KINDS = { license: '자격증', course: '수료증' }
const certNames = new Set()
list(data.certs, 'certs').forEach((c, i) => {
  const w = `certs[${i + 1}]`
  const name = str(c.name, `${w}.name`)
  const date = dateStr(c.date)
  if (!YMD.test(date)) err(`${w}.date`, `2024-05 또는 2024-05-12 모양이어야 합니다 (지금: ${date || '비어 있음'})`)
  const kind = str(c.kind, `${w}.kind`)
  if (kind && !CERT_KINDS[kind]) err(`${w}.kind`, `license(자격증) 또는 course(수료증) 여야 합니다 (지금: ${kind})`)
  // 확인 링크는 하나 또는 여럿 (같은 과정의 한 · 영 두 판처럼)
  const urls = (Array.isArray(c.url) ? c.url : c.url ? [c.url] : []).map(u => String(u).trim().replace(/#$/, ''))
  urls.forEach(u => { if (!URL_RE.test(u)) err(`${w}.url`, `https:// 로 시작하는 주소여야 합니다: ${u}`) })
  const field = str(c.field, `${w}.field`, { required: false })
  if (field && !CERT_FIELDS[field]) err(`${w}.field`, `모르는 분야입니다: ${field} (쓸 수 있는 것: ${Object.entries(CERT_FIELDS).map(([k, v]) => `${k}(${v})`).join(', ')})`)
  if (certNames.has(name)) warns.push(`${w} — 같은 이름이 두 번 있습니다: ${name}`)
  certNames.add(name)
  profile.certs.push({ name, nameAlt: str(c.name_alt, `${w}.name_alt`, { required: false }), issuer: str(c.issuer, `${w}.issuer`), date, kind, field: field || null, urls })
})
// 최근 것부터
profile.certs.sort((a, b) => b.date.localeCompare(a.date))

// ---------- 포트폴리오 참조 (대표 프로젝트 · 핵심 역량) ----------
// 없는 이름을 적으면 카드가 빈 채로 뜬다. 빌드된 포트폴리오 페이지와 대조한다.
const PORTFOLIO_DIR = path.join(OUT, 'content', 'portfolio')
const portfolio = new Map(
  (fs.existsSync(PORTFOLIO_DIR) ? fs.readdirSync(PORTFOLIO_DIR) : [])
    .filter(f => f.endsWith('.json'))
    .map(f => JSON.parse(fs.readFileSync(path.join(PORTFOLIO_DIR, f), 'utf8')))
    .map(d => [d.route.slice('portfolio/'.length), d]),
)
const refProject = (slug, where) => {
  const s = str(slug, where)
  if (!s) return null
  const d = portfolio.get(s)
  if (!d) {
    err(where, `포트폴리오에 없는 이름입니다: ${s} (있는 것: ${[...portfolio.keys()].join(', ')})`)
    return null
  }
  return { slug: s, route: d.route, title: d.title, description: d.description, category: d.category }
}
list(data.featured, 'featured').forEach((s, i) => {
  const p = refProject(s, `featured[${i + 1}]`)
  if (p) profile.featured.push(p)
})
list(data.traits, 'traits').forEach((t, i) => {
  const w = `traits[${i + 1}]`
  profile.traits.push({
    name: str(t.name, `${w}.name`),
    desc: str(t.desc, `${w}.desc`),
    projects: list(t.projects, `${w}.projects`).map((s, j) => refProject(s, `${w}.projects[${j + 1}]`)).filter(Boolean),
  })
})

// ---------- 기록 업적 ----------
// 숫자로 셀 수 없는 일 (패키지 배포, 연구과제 참여 …). id 는 achievements.mjs 의 record 값
list(data.records, 'records').forEach((r, i) => {
  const w = `records[${i + 1}]`
  const id = str(r.id, `${w}.id`)
  if (id && !RECORD_IDS[id]) err(`${w}.id`, `모르는 기록입니다: ${id} (쓸 수 있는 것: ${Object.entries(RECORD_IDS).map(([k, v]) => `${k}(${v})`).join(', ')})`)
  const date = dateStr(r.date)
  if (date && !YMD.test(date)) err(`${w}.date`, `2024-05 또는 2024-05-12 모양이어야 합니다 (지금: ${date})`)
  profile.records.push({ id, date: date || null, note: str(r.note, `${w}.note`, { required: false }) })
})

// ---------- 본문 절 ----------
// `## 자기소개` 처럼 제목으로 나눈다. 화면의 어느 칸에 들어갈지는 제목으로 정한다.
const md = unified().use(remarkParse).use(remarkGfm).use(remarkRehype).use(rehypeStringify)
let current = null
const chunks = {}
for (const line of body.split('\n')) {
  const h = line.match(/^##\s+(.+?)\s*$/)
  if (h) { current = h[1]; chunks[current] = []; continue }
  if (current) chunks[current].push(line)
}
// `## 칭호 장착` — 칭호 목록의 체크박스. 체크한 하나가 장착 칭호다. 사이트에는 싣지 않는다.
//   - [x] 별을 잇는 자 — 공개 문서 500개 · 영웅
const TITLE_SECTION = '칭호 장착'
if (chunks[TITLE_SECTION]) {
  const checked = []
  for (const raw of chunks[TITLE_SECTION]) {
    const m = raw.replace(/\r$/, '').match(/^\s*[-*]\s+\[([ xX])\]\s+(.+?)(?:\s+—\s.*)?\s*$/)
    if (!m) continue
    const name = m[2].replace(/^「|」$/g, '').trim()
    profile.titleList.push(name)
    if (m[1] !== ' ') checked.push(name)
  }
  if (checked.length > 1) err(TITLE_SECTION, `칭호는 하나만 장착할 수 있습니다 — 체크된 것 ${checked.length}개: ${checked.join(', ')}`)
  profile.title = checked[0] ?? ''
  delete chunks[TITLE_SECTION]
}

for (const [title, lines] of Object.entries(chunks)) {
  const text = lines.join('\n').trim()
  if (!text) continue
  if (/\[\[/.test(text)) warns.push(`본문 "${title}" — 위키링크([[...]])는 프로필에서 링크가 되지 않습니다. 대표 프로젝트는 머리말 featured 로 적으세요`)
  profile.sections[title] = String(md.processSync(text))
}

// ---------- 보고 ----------
if (errors.length) {
  console.error(`\n  ✗ 프로필 — ${PROFILE} 형식 오류 ${errors.length}건`)
  for (const e of errors) console.error(`    ${e}`)
  process.exit(1)
}
fs.writeFileSync(path.join(OUT, 'profile.json'), JSON.stringify(profile, null, 2))

// ---------- /about 문서 ----------
// 스탯창은 profile.json 으로 그리지만, 검색 · 문서 트리 · 링크 미리보기 이미지 · 경로 검사는
// 다른 페이지처럼 문서(content/about.json)를 본다. 프로필 내용을 글로 풀어 문서 하나를 만든다.
// 예전에는 Portfolio.md 의 ## 소개 · ## 핵심 역량 에서 만들었다 — 있으면 이것이 덮어쓴다.
const esc = t => String(t).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]))
const ym = d => (d ? d.replace('-', '.') : '현재')
const parts = []
const toc = []
const h2 = title => { const id = title.replace(/\s+/g, '-'); toc.push({ depth: 2, text: title, id }); parts.push(`<h2 id="${esc(id)}">${esc(title)}</h2>`) }
if (profile.sections['자기소개']) { h2('자기소개'); parts.push(profile.sections['자기소개']) }
if (profile.traits.length) {
  h2('핵심 역량')
  parts.push('<ul>' + profile.traits.map(t => `<li>${esc(t.name)} — ${esc(t.desc)}${t.projects.length ? ` (${t.projects.map(p => esc(p.title)).join(', ')})` : ''}</li>`).join('') + '</ul>')
}
if (profile.career.length || profile.education.length || profile.training.length) {
  h2('경력 · 학력')
  parts.push('<ul>' + [
    ...profile.career.map(c => `<li>${ym(c.from)} ~ ${ym(c.to)} ${esc(c.org)} · ${esc(c.role)}</li>`),
    ...profile.training.map(c => `<li>${ym(c.from)} ~ ${ym(c.to)} ${esc(c.org)} · ${esc(c.name)}</li>`),
    ...profile.education.map(c => `<li>${ym(c.from)} ~ ${ym(c.to)} ${esc(c.org)} · ${esc(c.major)}</li>`),
  ].join('') + '</ul>')
}
if (profile.certs.length) {
  h2('자격 · 수료')
  parts.push('<ul>' + profile.certs.map(c => `<li>${esc(c.name)}${c.nameAlt ? ` (${esc(c.nameAlt)})` : ''} · ${esc(c.issuer)} · ${ym(c.date.slice(0, 7))}</li>`).join('') + '</ul>')
}
if (profile.sections['사이드 퀘스트']) { h2('사이드 퀘스트'); parts.push(profile.sections['사이드 퀘스트']) }

const projLinks = new Map()
for (const p of [...profile.featured, ...profile.traits.flatMap(t => t.projects)]) projLinks.set(p.route, { route: p.route, title: p.title })
const aboutDoc = {
  route: 'about',
  slug: '03-portfolio/profile',
  title: '소개',
  // 검색 결과 · 링크 미리보기에 뜨는 한 줄
  description: `${profile.class} ${profile.name} — ${profile.tagline}`,
  source: PROFILE,
  kind: 'portfolio',
  category: [],
  html: parts.join('\n'),
  toc,
  links: [...projLinks.values()],
  backlinks: [],
  tags: [],
  features: { math: false, mermaid: false, code: false, table: false, image: false },
  related: [],
  locale: 'ko',
}
fs.mkdirSync(path.join(OUT, 'content'), { recursive: true })
fs.writeFileSync(path.join(OUT, 'content', 'about.json'), JSON.stringify(aboutDoc, null, 2))
console.log(`\n  프로필 — 경력 ${profile.career.length} · 학력 ${profile.education.length} · 교육 ${profile.training.length} · 자격 ${profile.certs.length} · 대표 프로젝트 ${profile.featured.length} · 핵심 역량 ${profile.traits.length} · 기록 업적 ${profile.records.length} · 본문 절 ${Object.keys(profile.sections).length}`)
for (const w of warns) console.log(`  ! ${w}`)
