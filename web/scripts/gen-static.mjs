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

  // 포트폴리오 첫 화면을 맨 위에. 소개(about)는 문서 목록이 아니라 트리에서 뺀다 — 헤더 · 모바일 서랍 바로가기에 있다 (2026-10-01)
  const top = portfolio.find(x => x.route === 'portfolio')
  if (top) branch.children.push({ n: top.title, k: top.route, r: top.route, children: [] })

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

// 폴더 노트를 그 폴더의 맨 위로 올린다 — 폴더를 펼치면 개요(MOC · 같은 이름 노트)가 먼저 보이게 (2026-10-01).
// 폴더 이름 자체를 링크로 만들어 보니 여닫기가 화살표로만 되어 불편했다 — 합치지 않고 순서만 바꾼다.
// 일반 개념 노트가 잘못 올라가지 않도록 셋 중 하나일 때만:
//   제목이 "… MOC" · 폴더와 이름이 같다 (KMS ↔ kms) · 프로젝트 문서이고 하위 케이스 목록을 가진 묶음 노트 ("… Projects", "## 하위 …")
const byRoute = new Map(docs.map(d => [d.route, d]))
const norm = s => s.toLowerCase().replace(/[^a-z0-9가-힣]/g, '')
const folderNote = n => {
  const score = c => {
    const d = byRoute.get(c.r)
    if (!d) return 0
    if (/ MOC$/.test(d.title)) return 3
    if (norm(c.n) === norm(n.n)) return 2
    if (d.kind === 'project' && (/ Projects$/.test(d.title) || d.toc.some(t => t.depth === 2 && /^(하위|프로젝트 사례)/.test(t.text)))) return 1
    return 0
  }
  return n.children.filter(c => !c.children.length && c.r).map(c => [c, score(c)]).filter(([, s]) => s).sort((a, b) => b[1] - a[1])[0]?.[0]
}
const hoistNotes = n => {
  n.children.forEach(hoistNotes)
  if (!n.children.length || n.k === '03 Portfolio') return
  const note = folderNote(n)
  if (note) n.children = [note, ...n.children.filter(c => c !== note)]
}
root.children.forEach(hoistNotes)

// 일상(사진 기록) — 분류별로 묶고 최신 글이 위로. 목록 · 순서는 파이프라인의 out/life.json 이 정한다
const lifeFile = path.join(HERE, '..', '..', 'pipeline', 'out', 'life.json')
if (fs.existsSync(lifeFile)) {
  const { categories, posts } = JSON.parse(fs.readFileSync(lifeFile, 'utf8'))
  if (posts.length) {
    const branch = { n: 'Life', k: '06 Life', children: [{ n: '전체 보기', k: 'life', r: 'life', children: [] }] }
    for (const c of categories) {
      const list = posts.filter(p => p.category === c).sort((a, b) => b.date.localeCompare(a.date))
      if (list.length) branch.children.push({ n: c, k: `life:${c}`, children: list.map(p => ({ n: p.heading, k: 'life/' + p.slug, r: 'life/' + p.slug, children: [] })) })
    }
    root.children.push(branch)
  }
}

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

// Nero 설정 (P8) — 파이프라인이 Vault Nero.md 로 만든 프롬프트를 서버(Pages Functions)가 묶어 갈 자리로 옮긴다
const neroSrc = path.join(HERE, '..', '..', 'pipeline', 'out', 'nero.json')
const neroDst = path.join(HERE, '..', 'functions', '_lib', 'prompt.json')
fs.mkdirSync(path.dirname(neroDst), { recursive: true })
fs.writeFileSync(neroDst, fs.existsSync(neroSrc) ? fs.readFileSync(neroSrc) : JSON.stringify({ prompt: '', hash: '' }))

// 메인 그래프 별 카드의 설명 한두 줄 (주소 → 설명). graph.json 과 따로 둬서 그래프가 뜬 뒤에 받는다 (2026-10-02)
const clip = (s, n = 110) => (s.length > n ? s.slice(0, n).replace(/\s+\S*$/, '') + '…' : s)
const info = Object.fromEntries(docs.filter(d => d.description).map(d => [d.route, clip(d.description)]))
fs.writeFileSync(path.join(PUBLIC, 'graph-info.json'), JSON.stringify(info))
console.log(`  graph-info.json  설명 ${Object.keys(info).length}개 · ${(fs.statSync(path.join(PUBLIC, 'graph-info.json')).size / 1024).toFixed(0)}KB`)

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

// 검색 색인. 검색을 처음 열 때만 받으므로 페이지 로딩에는 영향이 없다.
const SEARCH_SRC = path.join(HERE, '..', '..', 'pipeline', 'out', 'search-index.json')
if (!fs.existsSync(SEARCH_SRC)) {
  console.error('\n  search-index.json 이 없습니다. 저장소 루트에서 `npm run content` 를 실행하세요.\n')
  process.exit(1)
}
fs.copyFileSync(SEARCH_SRC, path.join(PUBLIC, 'search-index.json'))
const searchSize = fs.statSync(path.join(PUBLIC, 'search-index.json')).size
console.log(`  search-index.json  ${(searchSize / 1024).toFixed(0)}KB`)
const graphSize = fs.statSync(path.join(PUBLIC, 'graph.json')).size
console.log(`  graph.json  노드 ${g.nodes.length} · 엣지 ${g.links.length} · ${(graphSize / 1024).toFixed(0)}KB`)
