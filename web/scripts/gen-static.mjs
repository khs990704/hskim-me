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

// 포트폴리오는 한 파일(Portfolio.md)이 여러 페이지로 나뉜다 (D-14).
// source 경로로 묶으면 전부 같은 노드가 되어 하나만 남으므로 따로 만든다.
const isPortfolio = d => d.kind === 'portfolio'

for (const d of docs) {
  if (isPortfolio(d)) continue
  let node = root
  const parts = d.source.split('/').filter((seg, i, arr) => i === arr.length - 1 || !isContainer(seg))
  parts.forEach((seg, i) => {
    let next = node.children.find(c => c.k === seg)
    if (!next) { next = { n: display(seg), k: seg, children: [] }; node.children.push(next) }
    if (i === parts.length - 1) next.r = d.route
    node = next
  })
}

const portfolio = docs.filter(isPortfolio)
if (portfolio.length) {
  // 분류(개인·팀 / 데이터 분석 …)로 묶어서 보여준다.
  // URL 에는 분류를 넣지 않지만(D-14) 화면에서는 나눠서 보여준다.
  const branch = { n: 'Portfolio', k: '03 Portfolio', children: [] }

  // 상위 페이지 먼저
  for (const route of ['about', 'portfolio']) {
    const d = portfolio.find(x => x.route === route)
    if (d) branch.children.push({ n: d.title, k: d.route, r: d.route, children: [] })
  }

  // 그다음 분류별 묶음. 원본 문서의 등장 순서를 유지한다
  for (const d of portfolio) {
    if (d.route === 'about' || d.route === 'portfolio') continue
    const group = d.category[1] ?? '기타'
    let g = branch.children.find(c => c.k === `group:${group}`)
    if (!g) { g = { n: group, k: `group:${group}`, children: [] }; branch.children.push(g) }
    g.children.push({ n: d.title, k: d.route, r: d.route, children: [] })
  }

  root.children.push(branch)
}

const sortRec = n => {
  if (n.k === '03 Portfolio') { n.children.forEach(sortRec); return }   // 원본 등장 순서 유지
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

const treeSize = fs.statSync(path.join(PUBLIC, 'tree.json')).size
console.log(`  tree.json   문서 ${docs.length}개 · ${(treeSize / 1024).toFixed(0)}KB`)

// 그래프는 메인 화면에서만 쓴다. 페이지에 박지 않고 따로 받아 캐시되게 한다.
const GRAPH_SRC = path.join(HERE, '..', '..', 'pipeline', 'out', 'graph.json')
const g = JSON.parse(fs.readFileSync(GRAPH_SRC, 'utf8'))

// 좌표는 layout.mjs 가 붙인다. build.mjs 만 돌리면 좌표 없는 파일이 남고,
// 화면에서는 그래프가 통째로 사라진다(예외가 조용히 삼켜져 오류도 안 보인다).
// 여기서 끊는다.
const missing = g.nodes.filter(n => !n.pos).length
if (missing) {
  console.error(`
  graph.json 에 좌표가 없습니다 (${missing}/${g.nodes.length} 노드).

  layout.mjs 가 실행되지 않았습니다. build.mjs 만 따로 돌리면 이렇게 됩니다.
  저장소 루트에서 전체 파이프라인을 돌리세요:

    npm run content
`)
  process.exit(1)
}

fs.copyFileSync(GRAPH_SRC, path.join(PUBLIC, 'graph.json'))
const graphSize = fs.statSync(path.join(PUBLIC, 'graph.json')).size
console.log(`  graph.json  노드 ${g.nodes.length} · 엣지 ${g.links.length} · ${(graphSize / 1024).toFixed(0)}KB`)
