// 콘텐츠 가드 (기획 §10 계층 2).
// 공개 대상으로 통과한 문서에 금칙 패턴이 있는지 검사한다.
// error 가 하나라도 나오면 종료 코드 1 로 빌드를 실패시킨다.
import fs from 'node:fs'
import path from 'node:path'
import { STAGE, ROOT } from '../config.mjs'

const RULES = fs.readFileSync(path.join(ROOT, 'guard-rules.txt'), 'utf8')
  .split('\n')
  .map(l => l.trim())
  .filter(l => l && !l.startsWith('#'))
  .map(line => {
    // 정규식 자체에 '|' 가 들어가므로 설명은 마지막 필드로 고정해 파싱한다.
    const m = line.match(/^(\w+)\s*\|\s*([\w-]+)\s*\|\s*(.+?)\s*\|\s*([^|]*)$/)
    if (!m) throw new Error(`guard-rules.txt 형식 오류: ${line}`)
    const [, severity, category, pattern, description] = m
    return { severity, category, description, re: new RegExp(pattern, 'g') }
  })

// 예외 목록 — '검토했고 안전하다고 판단했다'는 기록
const ALLOW = fs.readFileSync(path.join(ROOT, 'guard-allow.txt'), 'utf8')
  .split('\n').map(l => l.trim()).filter(l => l && !l.startsWith('#'))
  .map(line => {
    const [pathPattern, category, reason] = line.split('|').map(s => s.trim())
    return { pathPattern, category, reason }
  })

const allowed = (file, category) => ALLOW.some(a =>
  (a.category === '*' || a.category === category) &&
  (a.pathPattern.endsWith('*')
    ? file.startsWith(a.pathPattern.slice(0, -1))
    : file === a.pathPattern))

const toPosix = p => p.split(path.sep).join('/')
function walk(dir, rel = '', out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const abs = path.join(dir, e.name), r = rel ? `${rel}/${e.name}` : e.name
    if (e.isDirectory()) walk(abs, r, out)
    else if (e.name.endsWith('.md')) out.push({ abs, rel: toPosix(r) })
  }
  return out
}

const findings = []
let suppressed = 0
for (const f of walk(STAGE)) {
  const lines = fs.readFileSync(f.abs, 'utf8').split('\n')
  lines.forEach((line, i) => {
    for (const rule of RULES) {
      rule.re.lastIndex = 0
      const m = rule.re.exec(line)
      if (!m) continue
      if (allowed(f.rel, rule.category)) { suppressed++; continue }
      findings.push({
        severity: rule.severity,
        category: rule.category,
        description: rule.description,
        file: f.rel,
        line: i + 1,
        match: m[0].length > 60 ? m[0].slice(0, 57) + '…' : m[0],
      })
    }
  })
}

const errors = findings.filter(f => f.severity === 'error')
const warns = findings.filter(f => f.severity === 'warn')
fs.writeFileSync(path.join(ROOT, 'guard-report.json'), JSON.stringify({ errors, warns }, null, 2))

const summarize = list => {
  const by = {}
  for (const f of list) (by[`${f.category} — ${f.description}`] ??= []).push(f)
  return Object.entries(by).sort((a, b) => b[1].length - a[1].length)
}

console.log(`\n  콘텐츠 가드 — 규칙 ${RULES.length}개 / 문서 ${walk(STAGE).length}개`)
console.log(`  error ${errors.length}건 · warn ${warns.length}건 · 예외 처리 ${suppressed}건\n`)

for (const [label, items] of summarize(errors)) {
  console.log(`  [error] ${label}  ${items.length}건`)
  for (const i of items.slice(0, 5)) console.log(`      ${i.file}:${i.line}  ${i.match}`)
}
for (const [label, items] of summarize(warns)) {
  console.log(`  [warn]  ${label}  ${items.length}건`)
  for (const i of items.slice(0, 3)) console.log(`      ${i.file}:${i.line}  ${i.match}`)
}
console.log('')

if (errors.length) {
  console.error(`  빌드 중단: error ${errors.length}건. 노트를 수정하거나 guard-rules.txt 에서 예외 처리하세요.\n`)
  process.exit(1)
}
