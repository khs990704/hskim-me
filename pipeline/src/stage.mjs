// Vault -> .vault-cache 스테이징.
//
// 공개 규칙(D-01 / D-06 / D-08)을 적용해 통과한 마크다운만 복사한다.
// Vault 원본은 읽기만 하며 어떤 경우에도 쓰지 않는다.
import fs from 'node:fs'
import path from 'node:path'
import { VAULT, STAGE, WHITELIST, OPT_IN, ROOT } from '../config.mjs'
import { readFrontmatter } from './frontmatter.mjs'

const EXCLUDE = fs.readFileSync(path.join(ROOT, 'exclude.txt'), 'utf8')
  .split('\n')
  .map(l => l.trim())
  .filter(l => l && !l.startsWith('#'))

const stats = {
  scanned: 0,
  included: 0,
  excluded: { optInMissing: 0, publishFalse: 0, underscore: 0, excludeList: 0 },
  byFolder: {},
  optInCandidates: [],
}

const toPosix = p => p.split(path.sep).join('/')
const isUnder = (rel, base) => rel === base || rel.startsWith(base + '/')

function matchesExclude(rel) {
  return EXCLUDE.some(pattern => {
    const re = new RegExp(
      '^' + pattern.replace(/[.+^${}()|[\]\\]/g, '\\$&')
                   .replace(/\*\*/g, '\u0000')
                   .replace(/\*/g, '[^/]*')
                   .replace(/\u0000/g, '.*') + '$'
    )
    return re.test(rel)
  })
}

function decide(rel, raw) {
  const base = path.basename(rel)
  if (base.startsWith('_')) return { ok: false, reason: 'underscore' }
  if (matchesExclude(rel)) return { ok: false, reason: 'excludeList' }

  const { data } = readFrontmatter(raw)
  if (data.publish === false) return { ok: false, reason: 'publishFalse' }

  // D-08: 회사 케이스는 기본 비공개. publish: true 가 있어야 통과.
  if (OPT_IN.some(base => isUnder(rel, base))) {
    if (data.publish !== true) {
      stats.optInCandidates.push(rel)
      return { ok: false, reason: 'optInMissing' }
    }
  }
  return { ok: true }
}

function walk(absDir, relDir, out) {
  for (const entry of fs.readdirSync(absDir, { withFileTypes: true })) {
    if (entry.name.startsWith('.')) continue
    const abs = path.join(absDir, entry.name)
    const rel = relDir ? `${relDir}/${entry.name}` : entry.name
    if (entry.isDirectory()) walk(abs, rel, out)
    else if (entry.name.endsWith('.md')) out.push({ abs, rel: toPosix(rel) })
  }
}

// --- 수집 ---
const candidates = []
for (const item of WHITELIST) {
  const abs = path.join(VAULT, item)
  if (!fs.existsSync(abs)) {
    console.error(`  ! 화이트리스트 경로 없음: ${item}`)
    continue
  }
  if (fs.statSync(abs).isDirectory()) walk(abs, item, candidates)
  else candidates.push({ abs, rel: toPosix(item) })
}

// --- 판정 및 복사 ---
fs.rmSync(STAGE, { recursive: true, force: true })
fs.mkdirSync(STAGE, { recursive: true })

for (const { abs, rel } of candidates) {
  stats.scanned++
  const raw = fs.readFileSync(abs, 'utf8')
  const verdict = decide(rel, raw)
  if (!verdict.ok) {
    stats.excluded[verdict.reason]++
    continue
  }
  const dest = path.join(STAGE, rel)
  fs.mkdirSync(path.dirname(dest), { recursive: true })
  fs.writeFileSync(dest, raw)
  stats.included++
  const top = rel.split('/').slice(0, 2).join('/')
  stats.byFolder[top] = (stats.byFolder[top] || 0) + 1
}

fs.writeFileSync(path.join(ROOT, 'stage-report.json'), JSON.stringify(stats, null, 2))

// --- 보고 ---
const ex = stats.excluded
console.log(`\n  스캔 ${stats.scanned}개 → 통과 ${stats.included}개`)
console.log(`  제외 ${stats.scanned - stats.included}개`)
console.log(`    회사 케이스 옵트인 미표기 : ${ex.optInMissing}`)
console.log(`    publish: false           : ${ex.publishFalse}`)
console.log(`    '_' 접두사               : ${ex.underscore}`)
console.log(`    제외 목록                : ${ex.excludeList}`)
console.log('\n  폴더별 통과 수')
for (const [k, v] of Object.entries(stats.byFolder).sort()) {
  console.log(`    ${String(v).padStart(4)}  ${k}`)
}
console.log('')
