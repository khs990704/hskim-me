// 캐릭터 — 레벨 · 능력치 · 스킬 · 칭호 도감 → out/character.json
// (기획 docs/01-planning/profile-and-life.md §4.2 ~ §4.5.1)
//
// 스탯창의 숫자는 전부 여기서 나온다. 스스로 매긴 점수는 없다.
// 숫자마다 무엇을 셌는지(어느 프로젝트 · 어느 수료증)를 함께 내보내, 화면에서 눌러 볼 수 있게 한다.
import fs from 'node:fs'
import path from 'node:path'
import { execFileSync } from 'node:child_process'
import { STAGE, ROOT, VAULT } from '../config.mjs'
import { SKILLS, DOMAINS, IMPLIES, NO_CODE_PROJECTS } from '../skills.mjs'
import { ACHIEVEMENTS, RARITY, GROUPS } from '../achievements.mjs'

const OUT = path.join(ROOT, 'out')
const PROFILE_JSON = path.join(OUT, 'profile.json')
if (!fs.existsSync(PROFILE_JSON)) {
  console.log('\n  캐릭터 — 프로필이 없어 건너뜀')
  process.exit(0)
}
const profile = JSON.parse(fs.readFileSync(PROFILE_JSON, 'utf8'))
const warns = []
const toPosix = p => p.split(path.sep).join('/')

// ---------- 공개 문서 ----------
const docs = []
const walkJson = dir => {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const abs = path.join(dir, e.name)
    if (e.isDirectory()) walkJson(abs)
    else if (e.name.endsWith('.json')) docs.push(JSON.parse(fs.readFileSync(abs, 'utf8')))
  }
}
walkJson(path.join(OUT, 'content'))
const bySource = new Map(docs.map(d => [d.source, d]))
const graph = JSON.parse(fs.readFileSync(path.join(OUT, 'graph.json'), 'utf8'))

// 지식 분야 — 01 Knowledge DB 바로 아래 폴더
const stripNo = s => s.replace(/^\d+\s+/, '')
const domainCount = new Map()
for (const d of docs) {
  if (d.kind !== 'note' || !d.category?.[1]) continue
  const name = stripNo(d.category[1])
  domainCount.set(name, (domainCount.get(name) ?? 0) + 1)
}
const domains = [...domainCount].map(([name, notes]) => ({ name, notes })).sort((a, b) => b.notes - a.notes)

// ---------- 프로젝트 — Project Index 의 분류 폴더 아래 한 칸 = 프로젝트 하나 ----------
// 한 프로젝트를 하위 노트 여러 개로 정리해도 하나로 센다 (중복 가산 안 함).
const INDEX = '02 Project Cases/Project Index'
const projects = []
const indexAbs = path.join(STAGE, INDEX)
const mdUnder = abs => {
  const out = []
  const go = d => {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const a = path.join(d, e.name)
      if (e.isDirectory()) go(a)
      else if (e.name.endsWith('.md')) out.push(a)
    }
  }
  go(abs)
  return out
}
for (const cat of fs.existsSync(indexAbs) ? fs.readdirSync(indexAbs, { withFileTypes: true }) : []) {
  if (!cat.isDirectory()) continue
  const catAbs = path.join(indexAbs, cat.name)
  for (const e of fs.readdirSync(catAbs, { withFileTypes: true })) {
    let files, name
    if (e.isDirectory()) { files = mdUnder(path.join(catAbs, e.name)); name = e.name }
    else if (e.name.endsWith('.md') && !/Projects\.md$/.test(e.name)) { files = [path.join(catAbs, e.name)]; name = e.name.slice(0, -3) }
    else continue
    if (!files.length) continue
    const rels = files.map(f => toPosix(path.relative(STAGE, f)))
    // 대표 문서: 폴더와 이름이 같은 노트(폴더 노트), 없으면 가장 얕은 노트
    const lead = rels.find(r => path.posix.basename(r, '.md').toLowerCase() === name.toLowerCase())
      ?? [...rels].sort((a, b) => a.split('/').length - b.split('/').length)[0]
    const leadDoc = bySource.get(lead)
    const techs = new Set()
    for (const f of files) {
      for (const line of fs.readFileSync(f, 'utf8').split('\n')) {
        if (!line.startsWith('관련 기술:')) continue
        for (let t of line.slice('관련 기술:'.length).split(',')) {
          t = t.trim().replace(/\[\[([^\]|]*)(\|[^\]]*)?\]\]/g, '$1').split('/').pop().trim()
          if (t) techs.add(t)
        }
      }
    }
    projects.push({
      name: leadDoc?.title ?? name,
      category: stripNo(cat.name),
      route: leadDoc?.route ?? null,
      techs: [...techs],
    })
  }
}

// ---------- 스킬 · 능력치 ----------
const unknown = new Set()
const skillMap = new Map()      // 표시 이름 → { name, domain, type, projects:Set }
for (const p of projects) {
  for (const t of p.techs) {
    const row = SKILLS[t]
    if (!row) { unknown.add(t); continue }
    const [domain, type, label] = row
    if (type === 'skip') continue
    const key = label ?? t
    if (!skillMap.has(key)) skillMap.set(key, { name: key, domain, type, projects: new Set() })
    skillMap.get(key).projects.add(p.name)
  }
}
if (unknown.size) warns.push(`기술 분류표(skills.mjs)에 없는 항목 ${unknown.size}개 — 능력치에 넣지 않았습니다: ${[...unknown].join(', ')}`)

const listSkills = type => [...skillMap.values()]
  .filter(s => s.type === type)
  .map(s => ({ name: s.name, domain: s.domain, projects: [...s.projects].sort() }))
  .sort((a, b) => b.projects.length - a.projects.length || a.name.localeCompare(b.name))
const tools = listSkills('tool')

// 언어 — 프로젝트 케이스에 적힌 것만 센다
const languages = listSkills('language')

// 언어 누락 검사 — Pandas 를 썼는데 Python 이 없다면 적는 것을 잊은 것이다
for (const p of projects) {
  if (NO_CODE_PROJECTS.includes(p.name)) continue
  for (const [lang, from] of Object.entries(IMPLIES)) {
    const via = p.techs.find(t => from.includes(t))
    if (via && !p.techs.includes(lang)) warns.push(`언어 누락 의심 — ${p.name}: ${via} 를 썼는데 관련 기술에 ${lang} 이 없습니다`)
  }
}

// 능력치 = 그 분야의 기술(도구 · 개념)을 하나라도 쓴 프로젝트 수
const stats = Object.entries(DOMAINS).map(([key, label]) => {
  const ps = projects.filter(p => p.techs.some(t => SKILLS[t]?.[0] === key)).map(p => p.name).sort()
  return { key, label, value: ps.length, projects: ps }
})

// ---------- 경력 개월 ----------
const now = new Date()
const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
const monthsBetween = (from, to) => {
  const [fy, fm] = from.split('-').map(Number)
  const [ty, tm] = to.split('-').map(Number)
  return (ty - fy) * 12 + (tm - fm) + 1      // 시작 달과 끝 달을 모두 센다
}
const careerMonths = profile.career.reduce((s, c) => s + monthsBetween(c.from, c.to ?? thisMonth), 0)

// ---------- 자격 ----------
const licenses = profile.certs.filter(c => c.kind === 'license')
const courses = profile.certs.filter(c => c.kind === 'course')
const byYear = new Map()
for (const c of courses) {
  const y = c.date.slice(0, 4)
  if (!byYear.has(y)) byYear.set(y, [])
  byYear.get(y).push(c.date)
}
const bestYear = [...byYear.values()].sort((a, b) => b.length - a.length)[0] ?? []
const coursesBestYear = { count: bestYear.length, fifth: bestYear.length >= 5 ? [...bestYear].sort()[4] : null }

// ---------- 기록 날짜 — Vault 커밋 ----------
// 노트 머리말에 작성일이 없으므로 커밋 날짜를 쓴다.
// Vault 저장소를 만들 때 수백 개를 한꺼번에 올렸다. 그런 대량 가져오기 커밋은 그날 쓴 것이
// 아니므로 뺀다. 빼지 않으면 "하루에 500개" 가 되어 꾸준함 칭호가 거짓으로 풀린다.
const BULK = 50
function readDates() {
  const git = args => execFileSync('git', ['-C', VAULT, '-c', 'core.quotepath=false', ...args], { encoding: 'utf8', maxBuffer: 64 << 20, stdio: ['ignore', 'pipe', 'ignore'] })
  try {
    if (git(['rev-parse', '--is-shallow-repository']).trim() === 'true') {
      warns.push('Vault 저장소가 얕은 복제(shallow)라 커밋 날짜를 셀 수 없습니다 — 꾸준함 칭호는 판정 보류')
      return null
    }
  } catch {
    warns.push('Vault 가 git 저장소가 아니어서 커밋 날짜를 셀 수 없습니다 — 꾸준함 칭호는 판정 보류')
    return null
  }
  const publicMd = new Set(fs.existsSync(STAGE) ? mdUnder(STAGE).map(f => toPosix(path.relative(STAGE, f))) : [])
  const log = git(['log', '--no-renames', '--name-status', '--format=@@%aI', '--', '*.md'])
  const commits = []
  let cur = null
  for (const line of log.split('\n')) {
    if (line.startsWith('@@')) { cur = { at: line.slice(2), added: [], touched: [] }; commits.push(cur); continue }
    const m = line.match(/^([AM])\t(.+)$/)
    if (!cur || !m) continue
    const file = m[2]
    if (!publicMd.has(file)) continue
    cur.touched.push(file)
    if (m[1] === 'A') cur.added.push(file)
  }
  const real = commits.filter(c => c.added.length <= BULK && c.touched.length)
  const bulk = commits.length - commits.filter(c => c.added.length <= BULK).length
  // 날짜 · 시각은 커밋한 곳의 현지 시각 그대로 (%aI 의 앞부분)
  const days = new Set(real.map(c => c.at.slice(0, 10)))
  const addedByMonth = new Map()
  for (const c of real) {
    const mo = c.at.slice(0, 7)
    addedByMonth.set(mo, (addedByMonth.get(mo) ?? 0) + c.added.length)
  }
  const sortedDays = [...days].sort()
  let longestStreak = 0, run = 0, prev = null
  for (const d of sortedDays) {
    run = prev && (Date.parse(d) - Date.parse(prev)) === 86400000 ? run + 1 : 1
    longestStreak = Math.max(longestStreak, run)
    prev = d
  }
  const months = [...new Set(sortedDays.map(d => d.slice(0, 7)))].sort()
  let longestMonthRun = 0; run = 0; prev = null
  for (const mo of months) {
    const next = prev ? (() => { const [py, pm] = prev.split('-').map(Number); return pm === 12 ? `${py + 1}-01` : `${py}-${String(pm + 1).padStart(2, '0')}` })() : null
    run = next === mo ? run + 1 : 1
    longestMonthRun = Math.max(longestMonthRun, run)
    prev = mo
  }
  return {
    since: sortedDays[0] ?? null,
    bulkCommits: bulk,
    activeDays: days.size,
    longestStreak,
    bestMonth: Math.max(0, ...addedByMonth.values()),
    longestMonthRun,
    dawn: real.filter(c => { const h = Number(c.at.slice(11, 13)); return h >= 3 && h < 5 }).length,
    aprilFools: real.filter(c => c.at.slice(5, 10) === '04-01').length,
  }
}
const dates = readDates()

// ---------- 생활 (/life) — 아직 없음 ----------
const life = { total: 0, categories: 0, places: 0, by: () => 0 }

// ---------- 업적 판정 ----------
const M = {
  profile,
  docs: docs.length,
  links: graph.links.length,
  titles: docs.map(d => d.title),
  domains,
  domain: name => domainCount.get(name) ?? 0,
  projects,
  projectsIn: cat => projects.filter(p => p.category === cat).length,
  portfolio: docs.filter(d => d.route.startsWith('portfolio/')).length,
  tools, languages, stats,
  careerMonths,
  licenses, courses, coursesBestYear,
  licensesIn: field => licenses.filter(c => c.field === field),
  dates,
  life,
}
const records = new Map(profile.records.map(r => [r.id, r]))
const achievements = ACHIEVEMENTS.map(a => {
  const base = { id: a.id, group: a.group, groupLabel: GROUPS[a.group], title: a.title, cond: a.cond, rarity: a.rarity, rarityLabel: RARITY[a.rarity], hidden: !!a.hidden }
  if (a.record) {
    const r = records.get(a.record)
    return { ...base, state: r ? 'done' : 'locked', date: r?.date ?? null, note: r?.note ?? null }
  }
  if (a.check) {
    const ok = a.check(M)
    return { ...base, state: ok ? 'done' : 'locked', date: ok ? a.when?.(M) ?? null : null }
  }
  const value = a.count(M)
  const target = typeof a.target === 'function' ? a.target(M) : a.target
  if (value === null || value === undefined) return { ...base, state: 'unknown', value: null, target }
  const done = value >= target
  return { ...base, state: done ? 'done' : value > 0 ? 'progress' : 'locked', value, target, date: done ? a.when?.(M) ?? null : null }
})
const earned = new Set(achievements.filter(a => a.state === 'done').map(a => a.title))
if (profile.title && !earned.has(profile.title)) {
  const exists = ACHIEVEMENTS.some(a => a.title === profile.title)
  console.error(`\n  ✗ 캐릭터 — 장착 칭호 「${profile.title}」 ${exists ? '은(는) 아직 얻지 않은 칭호입니다' : '이라는 칭호는 없습니다'} (Profile.md ## 칭호 장착)`)
  process.exit(1)
}
// 칭호 장착 목록과 칭호 표가 어긋나면 알린다 — 칭호를 새로 추가했거나 이름을 바꿨을 때
if (profile.titleList?.length) {
  const all = new Set(ACHIEVEMENTS.map(a => a.title))
  const listed = new Set(profile.titleList)
  const missing = ACHIEVEMENTS.filter(a => !listed.has(a.title)).map(a => a.title)
  const stale = profile.titleList.filter(t => !all.has(t))
  if (missing.length) warns.push(`Profile.md ## 칭호 장착 목록에 없는 칭호 ${missing.length}개 — 추가해 주세요: ${missing.join(', ')}`)
  if (stale.length) warns.push(`Profile.md ## 칭호 장착 목록에 있지만 이제 없는 칭호 ${stale.length}개: ${stale.join(', ')}`)
}

// ---------- 레벨 · 경험치 ----------
// 쌓인 기록에 비례. 레벨 n 까지 필요한 경험치 = 100 × n^1.5
const XP_RULES = [
  { key: 'notes', label: '지식 노트', each: 10, count: docs.filter(d => d.kind === 'note').length },
  { key: 'cases', label: '프로젝트 기록', each: 30, count: docs.filter(d => d.kind === 'project').length },
  { key: 'portfolio', label: '포트폴리오', each: 100, count: M.portfolio },
  { key: 'certs', label: '자격 · 수료', each: 150, count: profile.certs.length },
  { key: 'career', label: '경력 (개월)', each: 20, count: careerMonths },
]
const xp = XP_RULES.reduce((s, r) => s + r.each * r.count, 0)
const need = n => Math.ceil(100 * n ** 1.5)
let level = Math.max(1, Math.floor((xp / 100) ** (2 / 3)))
while (need(level + 1) <= xp) level++
while (level > 1 && need(level) > xp) level--

const character = {
  level,
  xp,
  xpLevelStart: need(level),
  xpNextLevel: need(level + 1),
  xpRules: XP_RULES.map(r => ({ ...r, xp: r.each * r.count })),
  xpFormula: '레벨 n 까지 필요한 경험치 = 100 × n^1.5',
  stats,
  tools,
  languages,
  projects: projects.map(({ techs, ...p }) => ({ ...p, techs: techs.length })),
  domains,
  dates,
  achievements,
  summary: Object.fromEntries(['done', 'progress', 'locked', 'unknown'].map(k => [k, achievements.filter(a => a.state === k).length])),
}
fs.writeFileSync(path.join(OUT, 'character.json'), JSON.stringify(character, null, 2))

const s = character.summary
console.log(`\n  캐릭터 — Lv.${level} (경험치 ${xp.toLocaleString()} / 다음 ${character.xpNextLevel.toLocaleString()}) · 프로젝트 ${projects.length} · 도구 ${tools.length} · 언어 ${languages.length}`)
console.log(`    능력치 ${stats.map(x => `${x.label} ${x.value}`).join(' · ')}`)
console.log(`    칭호 ${achievements.length} — 획득 ${s.done} · 진행 중 ${s.progress} · 미획득 ${s.locked} · 판정 보류 ${s.unknown}`)
if (dates) console.log(`    기록 날짜 — ${dates.since} 부터 ${dates.activeDays}일 (대량 가져오기 커밋 ${dates.bulkCommits}개 제외)`)
for (const w of warns) console.log(`  ! ${w}`)
