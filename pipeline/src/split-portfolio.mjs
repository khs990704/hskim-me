// Portfolio.md 한 파일을 페이지 여러 개로 나눈다 (D-14).
//
// Vault 는 그대로 둔다. 나누는 것은 빌드 시점뿐이다.
//   ## 소개 · ## 핵심 역량        → /about
//   ## 프로젝트 한눈에 보기          → /portfolio  (인덱스)
//   ### <프로젝트>                → /portfolio/<slug>
//
// 분류(## 개인·팀 프로젝트 등)는 URL 에 넣지 않고 category 로만 싣는다.
// 분류는 바뀌지만 프로젝트 이름은 잘 안 바뀌기 때문이다.
import { visit } from 'unist-util-visit'
import { normalizeSegment } from './slug.mjs'

/** /about 으로 갈 섹션. 나머지 ## 는 프로젝트 분류로 본다 */
const ABOUT_SECTIONS = ['소개', '핵심 역량']
/** 인덱스(/portfolio)로 갈 섹션 */
const INDEX_SECTIONS = ['프로젝트 한눈에 보기']
/** 사이트에 자체 목차가 있으므로 원본 목차는 버린다 */
const DROP_SECTIONS = ['목차']

const textOf = node => {
  const out = []
  const go = n => { if (n.type === 'text') out.push(n.value); (n.children ?? []).forEach(go) }
  go(node)
  return out.join('').trim()
}

const level = n => (n.type === 'element' && /^h[1-6]$/.test(n.tagName) ? Number(n.tagName[1]) : 0)

/**
 * @returns {{ route, title, category, nodes, headingId }[]}
 *   nodes 는 그 페이지에 들어갈 hast 노드 배열(제목 제외)
 */
export function splitPortfolio(tree) {
  const top = tree.children ?? []
  const parts = []
  let currentH2 = null          // 현재 분류 (## 제목)
  let bucket = null             // 지금 쌓고 있는 조각

  const flush = () => { if (bucket && bucket.nodes.length) parts.push(bucket); bucket = null }

  for (const node of top) {
    const lv = level(node)

    if (lv === 1) continue                       // 문서 제목(# Portfolio)은 버린다

    if (lv === 2) {
      flush()
      const title = textOf(node)
      currentH2 = title
      if (DROP_SECTIONS.includes(title)) { bucket = null; continue }
      if (ABOUT_SECTIONS.includes(title)) {
        bucket = { kind: 'about', title, nodes: [node], headingId: node.properties?.id }
        continue
      }
      if (INDEX_SECTIONS.includes(title)) {
        bucket = { kind: 'index', title, nodes: [node], headingId: node.properties?.id }
        continue
      }
      // 프로젝트 분류 제목 자체는 페이지를 만들지 않는다. 하위 ### 가 만든다.
      bucket = null
      continue
    }

    if (lv === 3 && currentH2 && !ABOUT_SECTIONS.includes(currentH2) && !INDEX_SECTIONS.includes(currentH2)) {
      flush()
      const title = textOf(node)
      bucket = {
        kind: 'project',
        title,
        category: currentH2,
        slug: normalizeSegment(title),
        nodes: [node],
        headingId: node.properties?.id,
      }
      continue
    }

    if (bucket) bucket.nodes.push(node)
  }
  flush()

  // about 은 여러 ## 를 한 페이지로 합친다
  const about = parts.filter(p => p.kind === 'about')
  const index = parts.filter(p => p.kind === 'index')
  const projects = parts.filter(p => p.kind === 'project')

  const pages = []
  if (about.length) {
    pages.push({
      route: 'about',
      title: '소개',
      category: [],
      nodes: about.flatMap(p => p.nodes),
      headingIds: about.map(p => p.headingId).filter(Boolean),
    })
  }
  pages.push({
    route: 'portfolio',
    title: '포트폴리오',
    category: [],
    nodes: index.flatMap(p => p.nodes),
    headingIds: index.map(p => p.headingId).filter(Boolean),
  })
  for (const p of projects) {
    pages.push({
      route: `portfolio/${p.slug}`,
      title: p.title,
      category: ['포트폴리오', p.category],
      nodes: p.nodes,
      headingIds: [p.headingId].filter(Boolean),
    })
  }
  // 어느 페이지도 만들지 못한 ## 섹션을 알린다.
  // '## 연락처' 같은 새 섹션을 추가했는데 하위 ### 가 없으면 조용히 사라진다.
  const madeProjects = new Set(projects.map(p => p.category))
  const orphan = []
  let seen = null
  for (const node of top) {
    if (level(node) !== 2) continue
    const t = textOf(node)
    if (DROP_SECTIONS.includes(t) || ABOUT_SECTIONS.includes(t) || INDEX_SECTIONS.includes(t)) continue
    if (!madeProjects.has(t)) orphan.push(t)
  }

  return { pages, orphan }
}

/**
 * 문서 내 앵커(#bidvett)를 페이지 간 링크(/portfolio/bidvett)로 바꾼다.
 * 나누기 전에는 같은 문서 안이었으므로 전부 앵커로 되어 있다.
 */
export function rewriteAnchors(pages) {
  const map = new Map()
  for (const p of pages) for (const id of p.headingIds) map.set(id, p.route)

  let rewritten = 0, dropped = 0
  for (const p of pages) {
    const root = { type: 'root', children: p.nodes }
    visit(root, 'element', (node, index, parent) => {
      if (node.tagName !== 'a') return
      const href = node.properties?.href
      if (typeof href !== 'string' || !href.startsWith('#')) return
      let id
      try { id = decodeURIComponent(href.slice(1)) } catch { id = href.slice(1) }

      const target = map.get(id)
      if (target) {
        node.properties.href = '/' + target
        rewritten++
        return
      }
      // 나뉘면서 사라진 대상(예: 제외된 회사 섹션)은 평문으로 되돌린다
      if (parent && index !== undefined) {
        parent.children.splice(index, 1, ...(node.children ?? []))
        dropped++
      }
    })
  }
  return { rewritten, dropped }
}
