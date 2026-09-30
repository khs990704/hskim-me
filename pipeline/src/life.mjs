// 사진 기록 — Vault `06 Life/*.md` → out/life.json
//
// /life 의 데이터를 만든다 (기획 docs/01-planning/profile-and-life.md §6).
// 글 한 편 = 노트 하나. 머리말은 날짜 · 분류 · 장소, 본문은 사진 삽입(`![[파일|설명]]`)과 짧은 글.
// 쓰는 중인 글은 `publish: false` — 스테이지가 이미 걸러 여기까지 오지 않는다.
//
// 형식이 틀리면 빌드를 멈추고 어느 글의 어느 칸인지 알린다 (프로필과 같은 원칙).
// 사진 파일 처리(메타데이터 삭제 · 크기 변환)는 media.mjs 가 이 목록을 읽어 한다.
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { parse as parseYaml } from 'yaml'
import { STAGE, ROOT, VAULT, LIFE } from '../config.mjs'
import { MEDIA_ROOTS } from './media.mjs'
import { normalizeSegment } from './slug.mjs'

const OUT = path.join(ROOT, 'out')
const SRC = path.join(STAGE, LIFE)

export const CATEGORIES = ['여행', '음식', '카페', '일상', '전시·공연', '운동']
// 가운뎃점은 치기 번거로워 짧게 적어도 받는다 (2026-09-30 전시 → 전시·공연)
const ALIAS = { 전시: '전시·공연', 공연: '전시·공연' }
const canon = s => { const t = s.replace(/\s*[·,/ ]\s*/g, '·').trim(); return ALIAS[t] ?? t }
// 분류마다 더 쓸 수 있는 칸 (모두 선택). 다른 분류의 칸을 쓰면 알려 준다 — 화면에 안 나와 헷갈리므로
const EXTRA = { 여행: ['until'], 음식: ['spot'], 카페: ['spot'], '전시·공연': ['title', 'venue'], 운동: ['sport', 'record'], 일상: [] }
const COMMON = ['publish', 'date', 'category', 'place', 'consent', 'tags', 'slug', 'address']
const DATE = /^\d{4}-\d{2}-\d{2}$/
const IMG = /\.(jpe?g|png|webp|avif|gif|tiff?|heic|heif)$/i

const errors = []
const warns = []
const err = (where, msg) => errors.push(`${where} — ${msg}`)

// ---------- 첨부 찾기 ----------
// Obsidian 은 `![[IMG_0001.jpg]]` 처럼 파일 이름만 적는다. 첨부 폴더에서 같은 이름을 찾는다.
const byName = new Map()
const walkMedia = (abs, rel) => {
  if (!fs.existsSync(abs)) return
  for (const e of fs.readdirSync(abs, { withFileTypes: true })) {
    if (e.name.startsWith('.')) continue
    const a = path.join(abs, e.name), r = `${rel}/${e.name}`
    if (e.isDirectory()) walkMedia(a, r)
    else if (IMG.test(e.name)) {
      const k = e.name.normalize('NFC').toLowerCase()
      byName.set(k, [...(byName.get(k) ?? []), r])
    }
  }
}
for (const root of MEDIA_ROOTS) walkMedia(path.join(VAULT, root), root)

function findAttachment(target) {
  const t = target.normalize('NFC').replace(/\\/g, '/')
  if (t.includes('/')) {                                           // 경로로 적은 경우
    const hit = [...byName.values()].flat().find(r => r === t || r.endsWith('/' + t))
    return hit ? { rel: hit } : { error: `첨부를 찾을 수 없습니다: ${target}` }
  }
  const hits = byName.get(t.toLowerCase()) ?? []
  if (!hits.length) return { error: `첨부를 찾을 수 없습니다: ${target} (${MEDIA_ROOTS.join(', ')} 아래에 있어야 합니다)` }
  if (hits.length > 1) return { error: `같은 이름의 첨부가 여러 개입니다: ${target} → ${hits.join(', ')}. 경로까지 적어 주세요` }
  return { rel: hits[0] }
}

// ---------- 한 편 읽기 ----------
function readPost(file, rel) {
  const where = rel
  const raw = fs.readFileSync(file, 'utf8')
  const m = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/)
  if (!m) return err(where, '맨 위에 --- 로 감싼 머리말이 없습니다 (템플릿: 00 Inbox/Templates/Life - 분류)')
  let data
  // `tags: [여행, #바다]` 처럼 # 을 붙이면 YAML 이 그 뒤를 주석으로 읽어 머리말이 깨진다 — tags 줄의 # 은 먼저 뗀다
  const head = m[1].replace(/^(tags\s*:.*)$/m, line => line.replace(/(^|[\[,\s])#(?=\S)/g, '$1'))
  try { data = parseYaml(head) ?? {} } catch (e) { return err(where, `머리말 형식 오류 — ${e.message.split('\n')[0]}`) }
  // %% … %% 는 Obsidian 주석 — 템플릿 안내가 여기 있다. 안의 예시 사진까지 읽지 않도록 먼저 뺀다
  const body = m[2].replace(/%%[\s\S]*?%%/g, '')

  // 날짜 — YAML 이 Date 로 읽을 수도, 문자열로 읽을 수도 있다
  const asDate = v => v instanceof Date ? v.toISOString().slice(0, 10) : String(v ?? '')
  const date = asDate(data.date)
  if (!DATE.test(date)) err(where, `date 는 2026-10-03 모양이어야 합니다 (지금: ${data.date ?? '비어 있음'})`)
  // 분류 — 머리말 category, 없으면 폴더(06 Life/여행/…). 둘 다 있는데 다르면 멈춘다 (폴더를 옮기고 칸을 안 고친 경우)
  const parts = rel.split('/')
  const folder = parts.length >= 3 ? canon(parts[1]) : ''
  const fromData = canon(String(data.category ?? ''))
  const category = fromData || folder
  if (fromData && folder && CATEGORIES.includes(folder) && fromData !== folder) err(where, `폴더(${parts[1]})와 category(${data.category})가 다릅니다. 둘 중 하나를 맞춰 주세요`)
  if (!CATEGORIES.includes(category)) err(where, `category 는 ${CATEGORIES.join(' · ')} 중 하나여야 합니다 (지금: ${category || '비어 있음'})`)
  const place = data.place == null ? '' : String(data.place).trim()

  // 태그 — `tags: [킹누, 콘서트]` 또는 `tags: 킹누, 콘서트`. # 은 떼고, 겹치면 하나로
  const rawTags = Array.isArray(data.tags) ? data.tags : data.tags == null ? [] : String(data.tags).split(/[,，]/)
  const tags = [...new Set(rawTags.map(x => String(x ?? '').replace(/^#/, '').trim()).filter(Boolean))]
  if (tags.some(x => x.length > 30)) err(where, '태그가 너무 깁니다 (30자 이하)')

  const extra = {}
  const allowed = new Set([...COMMON, ...(EXTRA[category] ?? [])])
  for (const [k, v] of Object.entries(data)) {
    // 비워 둔 칸(템플릿의 `spot:` 등)은 없는 칸으로 — 그대로 두면 화면에 null 이 찍힌다
    if (v == null || String(v).trim() === '') continue
    if (allowed.has(k)) { if (!COMMON.includes(k)) extra[k] = k === 'until' ? asDate(v) : String(v).trim() }
    else if (Object.values(EXTRA).flat().includes(k)) warns.push(`${where} — '${k}' 는 ${category} 글에서 쓰지 않는 칸이라 화면에 나오지 않습니다`)
    else warns.push(`${where} — 모르는 칸 '${k}' (무시)`)
  }
  if (extra.until && (!DATE.test(extra.until) || extra.until < date)) err(where, `until 은 date 이후의 날짜여야 합니다 (지금: ${extra.until})`)

  // 사진 — `![[파일]]` 또는 `![[파일|설명]]`. 본문의 순서가 화면의 순서다
  const photos = []
  for (const mm of body.matchAll(/!\[\[([^\]|#]+)(?:#[^\]|]*)?(?:\|([^\]]*))?\]\]/g)) {
    const target = mm[1].trim()
    if (!IMG.test(target)) continue
    if (/\.(heic|heif)$/i.test(target)) { err(where, `${target} — HEIC 는 처리할 수 없습니다. iPhone 설정 → 카메라 → 포맷 → '높은 호환성'으로 찍거나 JPEG 로 내보내 주세요`); continue }
    const hit = findAttachment(target)
    if (hit.error) { err(where, hit.error); continue }
    let alt = (mm[2] ?? '').trim()
    if (/^\d+(x\d+)?$/.test(alt)) alt = ''                           // `|300` 은 Obsidian 의 크기 지정
    if (!alt) warns.push(`${where} — ${target} 에 사진 설명이 없습니다 (|설명). 화면을 못 보는 사람에게 읽히는 글이라 채워 주세요`)
    photos.push({ src: hit.rel, alt })
  }
  if (!photos.length) err(where, '사진이 없습니다. 본문에 ![[사진.jpg|설명]] 을 하나 이상 넣어 주세요')

  // 글 — 사진 줄 · 머리 · 주석을 빼고 문단으로. 빈 줄은 문단, 한 줄 바꿈은 쓴 그대로 줄바꿈 (인스타그램처럼)
  const text = body
    .replace(/!\[\[[^\]]*\]\]/g, '')
    .split(/\r?\n\s*\r?\n/)
    .map(p => p.replace(/^#+\s*/gm, '').replace(/\[\[([^\]|]+)\|([^\]]+)\]\]/g, '$2').replace(/\[\[([^\]]+)\]\]/g, '$1').split(/\r?\n/).map(l => l.trim()).filter(Boolean).join('\n'))
    .filter(Boolean)

  const name = path.basename(rel, '.md')
  const id = crypto.createHash('sha1').update(rel).digest('hex').slice(0, 8)
  // 주소 — 영문 · 숫자 · - 만. 기본은 날짜(같은 날이 여럿이면 뒤에서 번호를 붙인다), slug 칸으로 직접 정할 수 있다.
  // 한글 주소는 공유 링크가 %ED%82… 로 길어지고 개발 서버가 맞춰 보지 못했다 (2026-09-30). 파일 이름과 무관해
  // 이름을 바꿔도 링크가 깨지지 않는다
  let slug = date
  if (data.slug != null && String(data.slug).trim()) {
    const s = normalizeSegment(String(data.slug))
    if (!/^[a-z0-9][a-z0-9-]*$/.test(s)) err(where, `slug 는 영문 소문자 · 숫자 · - 만 쓸 수 있습니다 (지금: ${data.slug})`)
    else slug = s
  }
  // 제목 — 전시 · 공연 이름, 가게 이름, 장소, 없으면 분류와 날짜
  const heading = extra.title || extra.spot || place || `${category} · ${date.replace(/-/g, '.')}`
  // 설명 — 검색 결과 · 공유 카드에 나간다. 글의 첫 문장, 없으면 짧게 만든다
  const plain = s => s.replace(/\n/g, ' ').replace(/`([^`]+)`/g, '$1').replace(/\*\*([^*]+)\*\*/g, '$1').replace(/(^|\s)[*_]([^*_]+)[*_](?=\s|$)/g, '$1$2')
  const first = plain(text[0] ?? '').match(/^.{8,}?(?:[다요음]\.|[.!?])(?=\s|$)/)?.[0] ?? plain(text[0] ?? '')
  // 첫 문장이 짧으면(30자 미만) 문단 전체를 쓴다 — "첫 콘서트 관람." 만으로는 검색 결과에서 뜻이 약하다
  const lead = first.length < 30 ? plain(text[0] ?? '') : first
  // 150자 안에서 문장 끝에 맞춰 자른다. 한 문장이 너무 길면 띄어쓰기에서 자르고 … 을 붙인다 — 단어 중간에서 끊기지 않게
  const clip = s => {
    if (s.length <= 150) return s
    const cut = s.slice(0, 150)
    const end = Math.max(...[...cut.matchAll(/(?:[다요음]\.|[.!?])(?=\s)/g)].map(m => m.index + m[0].length), 0)
    return end >= 40 ? cut.slice(0, end) : cut.slice(0, cut.lastIndexOf(' ') > 40 ? cut.lastIndexOf(' ') : 149) + '…'
  }
  const description = clip(lead.length >= 8 ? lead : [place, extra.spot || extra.venue, category].filter(Boolean).join(' · ') + ' — 일상 기록')
  // 지도 링크 — address 에 넣은 것으로만 (2026-09-30 고객 결정).
  //   지도 링크(네이버 · 카카오 · Google 공유 링크) → 그 링크로 바로
  //   주소 글자 → 주소를 보여 주고 그 주소로 검색 (한글이면 네이버, 아니면 Google)
  //   비움 → 링크 없음
  // 링크는 지도 서비스 주소만 받는다. 오타 · 엉뚱한 링크가 공개 페이지에 걸리지 않게
  const MAPS = [
    [/^(map\.naver\.com|naver\.me|m\.map\.naver\.com)$/, 'naver', '네이버 지도에서 보기'],
    [/^(map\.kakao\.com|place\.map\.kakao\.com|kko\.to|kakaomap\.)/, 'kakao', '카카오맵에서 보기'],
    [/^(maps\.app\.goo\.gl|goo\.gl|(www\.)?google\.[a-z.]+|maps\.google\.[a-z.]+)$/, 'google', 'Google 지도에서 보기'],
  ]
  const rawAddr = data.address == null ? '' : String(data.address).trim()
  let address = '', mapLink = null
  if (/^https?:\/\//i.test(rawAddr)) {
    let u = null
    try { u = new URL(rawAddr) } catch {}
    const hit = u && u.protocol === 'https:' && MAPS.find(([re]) => re.test(u.hostname))
    if (!hit || (hit[1] === 'google' && /^(www\.)?google\./.test(u.hostname) && !u.pathname.startsWith('/maps')) || (u.hostname === 'goo.gl' && !u.pathname.startsWith('/maps')))
      err(where, `address 링크는 네이버 지도 · 카카오맵 · Google 지도 주소만 받습니다 (지금: ${rawAddr})`)
    else mapLink = { provider: hit[1], label: hit[2], url: u.href }
  } else if (rawAddr) {
    address = rawAddr
    mapLink = /[\uac00-\ud7a3]/.test(rawAddr)
      ? { provider: 'naver', label: '네이버 지도에서 보기', url: `https://map.naver.com/p/search/${encodeURIComponent(rawAddr)}` }
      : { provider: 'google', label: 'Google 지도에서 보기', url: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(rawAddr)}` }
  }
  return { id, slug, name, heading, description, address, mapLink, date, category, place, consent: data.consent === true, tags, ...extra, photos, text }
}

// ---------- 실행 ----------
const posts = []
if (fs.existsSync(SRC)) {
  const walk = (abs, rel) => {
    for (const e of fs.readdirSync(abs, { withFileTypes: true })) {
      if (e.name.startsWith('.')) continue
      const a = path.join(abs, e.name), r = `${rel}/${e.name}`
      if (e.isDirectory()) walk(a, r)
      else if (e.name.endsWith('.md')) { const p = readPost(a, r); if (p) posts.push(p) }
    }
  }
  walk(SRC, LIFE)
}

if (errors.length) {
  console.error(`\n  ✗ 사진 기록 — ${errors.length}건. 노트를 고친 뒤 다시 빌드하세요`)
  for (const e of errors) console.error(`    ${e}`)
  process.exit(1)
}

// 얼굴 자동 흐림(L2) 전까지는 consent: true 인 글만 공개한다.
// 사람이 없는 사진이거나, 찍힌 사람이 동의했으면 consent: true 를 넣는다.
const held = posts.filter(p => !p.consent)
// 주소가 겹치면(파일 이름이 대소문자 · 공백만 다름) 멈춘다
// 같은 날짜 주소는 오래된 글(파일 이름 순)부터 2026-06-21, 2026-06-21-2 … — 직접 정한 slug 가 겹치면 멈춘다
const bySlug = new Map()
for (const p of [...posts].sort((a, b) => a.name.localeCompare(b.name, 'ko'))) {
  if (!bySlug.has(p.slug)) { bySlug.set(p.slug, p.name); continue }
  if (p.slug !== p.date) { errors.push(`${LIFE}/${p.name} — slug '${p.slug}' 가 ${LIFE}/${bySlug.get(p.slug)} 와 겹칩니다`); continue }
  let n = 2
  while (bySlug.has(`${p.date}-${n}`)) n++
  p.slug = `${p.date}-${n}`
  bySlug.set(p.slug, p.name)
}
if (errors.length) { console.error(`\n  ✗ 사진 기록 — ${errors.length}건`); for (const e of errors) console.error(`    ${e}`); process.exit(1) }

const shown = posts.filter(p => p.consent).sort((a, b) => b.date.localeCompare(a.date) || a.name.localeCompare(b.name, 'ko'))
for (const p of held) warns.push(`${LIFE}/${p.name} — consent: true 가 없어 아직 공개하지 않습니다 (얼굴 흐림 기능 전). 사람이 없거나 동의한 사진이면 consent: true 를 넣어 주세요`)

fs.mkdirSync(OUT, { recursive: true })
fs.writeFileSync(path.join(OUT, 'life.json'), JSON.stringify({ categories: CATEGORIES, posts: shown }, null, 2))

console.log(`\n  사진 기록 — 글 ${shown.length}편 · 사진 ${shown.reduce((s, p) => s + p.photos.length, 0)}장${held.length ? ` · 보류 ${held.length}편` : ''}`)
if (warns.length) for (const w of warns) console.warn(`    ! ${w}`)
