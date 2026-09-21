// 빌드 후 검사: 모든 공개 문서에 실제 페이지가 있는가.
//
// 파이프라인이 만든 라우트와 Next 가 뽑은 HTML 을 대조한다.
// 라우트 규칙(폴더 노트·컨테이너 폴더 제거 등)이 바뀌면 문서가 페이지 없는
// 주소로 밀려나 404 가 된다. 실제로 /projects 에서 한 번 발생했다.
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = path.dirname(fileURLToPath(import.meta.url))
const CONTENT = path.join(HERE, '..', '..', 'pipeline', 'out', 'content')
const OUT = path.join(HERE, '..', 'out')

function walk(dir, out = []) {
  if (!fs.existsSync(dir)) return out
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name)
    if (e.isDirectory()) walk(p, out)
    else out.push(p)
  }
  return out
}

const routes = walk(CONTENT)
  .filter(f => f.endsWith('.json'))
  .map(f => JSON.parse(fs.readFileSync(f, 'utf8')).route)

const missing = routes.filter(r => {
  const asFile = path.join(OUT, r + '.html')
  const asDir = path.join(OUT, r, 'index.html')
  return !fs.existsSync(asFile) && !fs.existsSync(asDir)
})

console.log(`\n  라우트 검사 — 문서 ${routes.length}개`)
if (!missing.length) {
  console.log('  모든 문서에 페이지가 있습니다\n')
} else {
  console.error(`  ⚠ 페이지가 없는 문서 ${missing.length}개\n`)
  for (const r of missing.slice(0, 20)) console.error(`    /${r}`)
  console.error('\n  해당 주소를 처리할 페이지를 추가하거나 라우트 규칙을 조정하세요.\n')
  process.exit(1)
}
