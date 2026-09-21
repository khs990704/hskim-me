// 빌드 전에 정적 자산을 만든다.
//
// 사이드 트리(477개 항목)를 서버 컴포넌트로 렌더하면 모든 페이지 HTML 에
// 통째로 박혀 페이지당 ~95KB 가 된다. 한 번만 받아 캐시되도록 분리한다.
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { DROP_SEGMENTS } from '../../pipeline/config.mjs'

const HERE = path.dirname(fileURLToPath(import.meta.url))
const CONTENT = path.join(HERE, '..', '..', 'pipeline', 'out', 'content')
const PUBLIC = path.join(HERE, '..', 'public')

function walk(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name)
    if (e.isDirectory()) walk(p, out)
    else if (e.name.endsWith('.json')) out.push(p)
  }
  return out
}

if (!fs.existsSync(CONTENT)) {
  console.error(`
  콘텐츠가 없습니다: ${path.relative(process.cwd(), CONTENT)}

  Vault 를 먼저 변환해야 합니다. 저장소 루트에서:

    npm run content

  (Vault 경로가 기본값과 다르면 VAULT_PATH 환경변수로 지정합니다)
`)
  process.exit(1)
}

const docs = walk(CONTENT)
  .map(f => JSON.parse(fs.readFileSync(f, 'utf8')))
  .sort((a, b) => a.source.localeCompare(b.source, 'ko'))

const stripOrder = seg => seg.replace(/^\d{2}\s+/, '')
const display = seg => stripOrder(seg).replace(/\.md$/, '')

// URL 에서 걷어내는 컨테이너 폴더는 트리에서도 걷어낸다.
// 한쪽에만 남으면 사이드 트리 구조와 주소 구조가 어긋난다.
const isContainer = seg => DROP_SEGMENTS.includes(stripOrder(seg).toLowerCase())

const root = { children: [] }
for (const d of docs) {
  let node = root
  const parts = d.source.split('/').filter((seg, i, arr) => i === arr.length - 1 || !isContainer(seg))
  parts.forEach((seg, i) => {
    let next = node.children.find(c => c.k === seg)
    if (!next) { next = { n: display(seg), k: seg, children: [] }; node.children.push(next) }
    if (i === parts.length - 1) next.r = d.route
    node = next
  })
}

const sortRec = n => {
  n.children.sort((a, b) => {
    const af = a.children.length > 0, bf = b.children.length > 0
    if (af !== bf) return af ? -1 : 1
    return a.k.localeCompare(b.k, 'ko')
  })
  n.children.forEach(sortRec)
}
sortRec(root)

// 빈 children 배열은 지워 용량을 줄인다
const prune = n => {
  if (!n.children.length) delete n.children
  else n.children.forEach(prune)
  return n
}
root.children.forEach(prune)

fs.mkdirSync(PUBLIC, { recursive: true })
fs.writeFileSync(path.join(PUBLIC, 'tree.json'), JSON.stringify(root.children))

const size = fs.statSync(path.join(PUBLIC, 'tree.json')).size
console.log(`  tree.json  문서 ${docs.length}개 · ${(size / 1024).toFixed(0)}KB`)
