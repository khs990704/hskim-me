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

/** 내보낸 HTML 의 경로. 라우트에 따라 파일이거나 폴더 안 index.html 이다 */
const pageOf = r => {
  const asFile = path.join(OUT, r + '.html')
  if (fs.existsSync(asFile)) return asFile
  const asDir = path.join(OUT, r, 'index.html')
  return fs.existsSync(asDir) ? asDir : null
}

const missing = routes.filter(r => !pageOf(r))

console.log(`\n  라우트 검사 — 문서 ${routes.length}개`)
if (!missing.length) {
  console.log('  모든 문서에 페이지가 있습니다')
} else {
  console.error(`  ⚠ 페이지가 없는 문서 ${missing.length}개\n`)
  for (const r of missing.slice(0, 20)) console.error(`    /${r}`)
  console.error('\n  해당 주소를 처리할 페이지를 추가하거나 라우트 규칙을 조정하세요.\n')
  process.exit(1)
}

// generateMetadata 가 빠진 라우트는 검색 결과에 제목만 나가고 설명이 비어 버린다.
// 콘텐츠 JSON 에 설명이 있어도 페이지가 그것을 쓰지 않으면 소용이 없으므로
// 내보낸 HTML 을 직접 확인한다.
const noMeta = []
for (const r of routes) {
  const html = fs.readFileSync(pageOf(r), 'utf8')
  const lacks = []
  if (!/<meta name="description"/.test(html)) lacks.push('description')
  if (!/<link rel="canonical"/.test(html)) lacks.push('canonical')
  if (lacks.length) noMeta.push([r, lacks.join(' · ')])
}

// 404 는 정적 내보내기에서 out/404.html 로 나간다. Cloudflare Pages 가 이 파일을 쓴다.
const has404 = fs.existsSync(path.join(OUT, '404.html'))

console.log(`\n  메타 태그 검사 — 페이지 ${routes.length}개`)
if (noMeta.length) {
  console.error(`  ⚠ 빠진 페이지 ${noMeta.length}개\n`)
  for (const [r, lacks] of noMeta.slice(0, 20)) console.error(`    /${r} — ${lacks}`)
  console.error('\n  해당 라우트의 generateMetadata 에 description 과 alternates.canonical 을 넣으세요.\n')
  process.exit(1)
}
console.log('  모든 페이지에 description 과 canonical 이 있습니다')
console.log(has404 ? '  404.html 있음\n' : '  ⚠ 404.html 없음 — app/not-found.tsx 를 확인하세요\n')
if (!has404) process.exit(1)
