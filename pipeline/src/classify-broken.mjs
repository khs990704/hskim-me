// 깨진 링크가 '정책상 제외'인지 'Vault 자체의 오류'인지 구분한다.
import fs from 'node:fs'
import path from 'node:path'
import { slugifyFilePath } from '@quartz-community/utils'
import { VAULT, ROOT } from '../config.mjs'
import { makeResolver } from './resolve.mjs'

const toPosix = p => p.split(path.sep).join('/')
function walk(dir, rel = '', out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.name.startsWith('.')) continue
    const abs = path.join(dir, e.name), r = rel ? `${rel}/${e.name}` : e.name
    if (e.isDirectory()) walk(abs, r, out)
    else if (e.name.endsWith('.md')) out.push(toPosix(r))
  }
  return out
}

const all = walk(VAULT).map(slugifyFilePath)
const resolveAll = makeResolver(all)
const report = JSON.parse(fs.readFileSync(path.join(ROOT, 'build-report.json'), 'utf8'))

const buckets = { excludedCompany: [], excludedOther: [], missing: [] }
for (const b of report.brokenLinks) {
  const r = resolveAll(b.to)
  if (r.status !== 'ok') { buckets.missing.push(b); continue }
  if (/03-company/.test(r.slug)) buckets.excludedCompany.push({ ...b, resolved: r.slug })
  else buckets.excludedOther.push({ ...b, resolved: r.slug })
}

const uniq = arr => [...new Set(arr.map(x => x.to))]
console.log(`\n  깨진 링크 ${report.brokenLinks.length}개 분류`)
console.log(`    회사 케이스 제외로 인한 것 : ${buckets.excludedCompany.length}  (대상 ${uniq(buckets.excludedCompany).length}종)`)
console.log(`    비공개 폴더 참조           : ${buckets.excludedOther.length}  (대상 ${uniq(buckets.excludedOther).length}종)`)
console.log(`    Vault 에 없는 대상          : ${buckets.missing.length}  (대상 ${uniq(buckets.missing).length}종)`)
if (buckets.excludedOther.length) {
  console.log('\n  비공개 폴더 참조 대상:')
  for (const t of uniq(buckets.excludedOther).slice(0, 10)) console.log('    ' + t)
}
console.log('\n  Vault 에 없는 대상 (원본 수정 후보):')
const missCount = {}
for (const m of buckets.missing) missCount[m.to] = (missCount[m.to] || 0) + 1
for (const [t, c] of Object.entries(missCount).sort((a,b)=>b[1]-a[1]).slice(0, 15)) {
  console.log(`    ${String(c).padStart(3)}  ${t}`)
}
fs.writeFileSync(path.join(ROOT, 'broken-links-report.json'), JSON.stringify(buckets, null, 2))
console.log('')
