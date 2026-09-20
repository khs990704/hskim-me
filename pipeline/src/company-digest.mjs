// 회사 케이스 76개의 판정용 요약을 만든다. 본문 전체가 아니라 제목·첫 문단·소제목만 본다.
import fs from 'node:fs'
import path from 'node:path'
import { VAULT, ROOT, OPT_IN } from '../config.mjs'

const base = path.join(VAULT, OPT_IN[0])
const toPosix = p => p.split(path.sep).join('/')
function walk(dir, rel = '', out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const abs = path.join(dir, e.name), r = rel ? `${rel}/${e.name}` : e.name
    if (e.isDirectory()) walk(abs, r, out)
    else if (e.name.endsWith('.md')) out.push({ abs, rel: toPosix(r) })
  }
  return out
}

// 위험 신호 패턴
const SIGNALS = [
  ['수치', /\b\d+(\.\d+)?\s*(ms|초|분|시간|배|%|건|만|억|GB|TB|MB|req\/s|QPS)\b/g],
  ['내부주소', /(https?:\/\/(?:localhost|\d+\.\d+\.\d+\.\d+|[\w.-]*\.(?:internal|local|corp))|(?:10|172|192)\.\d+\.\d+\.\d+)/g],
  ['자격증명', /(api[_-]?key|secret|token|password|passwd|credential)\s*[:=]/gi],
  ['파일경로', /(\/home\/\w+|[A-Z]:\\\\|\/opt\/|\/etc\/)/g],
]

const rows = []
for (const f of walk(base)) {
  const raw = fs.readFileSync(f.abs, 'utf8')
  const lines = raw.split('\n')
  const title = (lines.find(l => l.startsWith('# ')) ?? '# ' + path.basename(f.rel, '.md')).slice(2).trim()
  const firstPara = lines.slice(lines.findIndex(l => l.startsWith('# ')) + 1)
    .find(l => l.trim() && !l.startsWith('#')) ?? ''
  const headings = lines.filter(l => /^##\s/.test(l)).map(l => l.replace(/^##\s*/, '').trim())
  const hits = {}
  for (const [name, re] of SIGNALS) {
    const m = raw.match(re)
    if (m) hits[name] = m.length
  }
  rows.push({
    group: f.rel.split('/')[0],
    file: f.rel,
    title,
    summary: firstPara.trim().slice(0, 140),
    headings: headings.slice(0, 6),
    bytes: raw.length,
    signals: hits,
  })
}

rows.sort((a, b) => a.file.localeCompare(b.file))
fs.writeFileSync(path.join(ROOT, 'company-digest.json'), JSON.stringify(rows, null, 2))

const byGroup = {}
for (const r of rows) (byGroup[r.group] ??= []).push(r)
console.log(`\n  회사 케이스 ${rows.length}개 / 묶음 ${Object.keys(byGroup).length}개\n`)
for (const [g, items] of Object.entries(byGroup)) {
  const sig = items.filter(i => Object.keys(i.signals).length).length
  console.log(`  ${g}  (${items.length}개, 위험신호 ${sig}개)`)
  for (const i of items) {
    const s = Object.entries(i.signals).map(([k, v]) => `${k}×${v}`).join(' ')
    console.log(`    - ${i.title}${s ? '   [' + s + ']' : ''}`)
  }
  console.log('')
}
