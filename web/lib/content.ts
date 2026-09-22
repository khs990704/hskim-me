// 파이프라인이 만든 JSON 을 읽는다. 빌드 시점에만 실행된다.
import fs from 'node:fs'
import path from 'node:path'

const OUT = path.join(process.cwd(), '..', 'pipeline', 'out')
const CONTENT = path.join(OUT, 'content')

export type LinkRef = { route: string; title: string }
/** 같은 프로젝트를 다루는 다른 성격의 문서 (포트폴리오 ↔ 프로젝트 케이스) */
export type RelatedRef = { route: string; title: string; kind: 'portfolio' | 'project' }
export type TocItem = { depth: number; text: string; id: string }
export type Features = { math: boolean; mermaid: boolean; code: boolean; table: boolean; image: boolean }

export type Doc = {
  route: string
  slug: string
  title: string
  description: string
  source: string
  kind: 'note' | 'project' | 'portfolio'
  category: string[]
  html: string
  toc: TocItem[]
  links: LinkRef[]
  backlinks: LinkRef[]
  tags: string[]
  related?: RelatedRef[]
  features: Features
  locale: string
}

function walk(dir: string, out: string[] = []): string[] {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name)
    if (e.isDirectory()) walk(p, out)
    else if (e.name.endsWith('.json')) out.push(p)
  }
  return out
}

let cache: Doc[] | null = null

export function allDocs(): Doc[] {
  if (cache) return cache
  cache = walk(CONTENT).map(f => JSON.parse(fs.readFileSync(f, 'utf8')) as Doc)
  cache.sort((a, b) => a.source.localeCompare(b.source, 'ko'))
  return cache
}

export function getDoc(route: string): Doc | null {
  const file = path.join(CONTENT, route + '.json')
  if (!fs.existsSync(file)) return null
  return JSON.parse(fs.readFileSync(file, 'utf8')) as Doc
}

export function docsByPrefix(prefix: string): Doc[] {
  return allDocs().filter(d => d.route === prefix || d.route.startsWith(prefix + '/'))
}

// --- 사이드 트리 -------------------------------------------------------------
// Vault 의 폴더 구조를 그대로 따른다 (요구사항 5·6).
// 정렬은 원본의 번호 접두사(01, 02 …)를 쓰고, 화면에는 번호를 떼고 보여준다.
export type TreeNode = {
  name: string        // 화면 표시용 (번호 제거)
  sortKey: string     // 원본 이름 (번호 포함)
  route?: string      // 문서면 있음
  children: TreeNode[]
}

const display = (seg: string) => seg.replace(/^\d{2}\s+/, '').replace(/\.md$/, '')

export function buildTree(): TreeNode[] {
  const root: TreeNode = { name: '', sortKey: '', children: [] }

  for (const d of allDocs()) {
    const parts = d.source.split('/')
    let node = root
    parts.forEach((seg, i) => {
      const leaf = i === parts.length - 1
      let next = node.children.find(c => c.sortKey === seg)
      if (!next) {
        next = { name: display(seg), sortKey: seg, children: [] }
        node.children.push(next)
      }
      if (leaf) next.route = d.route
      node = next
    })
  }

  const sortRec = (n: TreeNode) => {
    // 폴더 먼저, 그다음 문서. 각각 원본 이름 순
    n.children.sort((a, b) => {
      const af = a.children.length > 0, bf = b.children.length > 0
      if (af !== bf) return af ? -1 : 1
      return a.sortKey.localeCompare(b.sortKey, 'ko')
    })
    n.children.forEach(sortRec)
  }
  sortRec(root)
  return root.children
}

export function graph() {
  return JSON.parse(fs.readFileSync(path.join(OUT, 'graph.json'), 'utf8')) as {
    nodes: { id: string; title: string; kind: string; group: string; degree: number; pos: [number, number, number] }[]
    links: { source: string; target: string }[]
  }
}
