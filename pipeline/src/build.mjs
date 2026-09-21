// 스테이지된 마크다운 -> out/content/*.json, out/graph.json, out/slug-map.json
//
// 3단계로 나눈다.
//   1) 파싱   : 모든 문서를 hast 로 변환하고 메타데이터를 뽑는다
//   2) 연결   : 링크를 공개 URL 로 치환하고 백링크를 역으로 모은다
//   3) 출력   : JSON 을 쓴다
import fs from 'node:fs'
import path from 'node:path'
import { VFile } from 'vfile'
import { visit } from 'unist-util-visit'
import { slugifyFilePath } from '@quartz-community/utils'
import { STAGE, ROOT } from '../config.mjs'
import { readFrontmatter } from './frontmatter.mjs'
import { publicRoute, kindOf } from './slug.mjs'
import { makeProcessor } from './render.mjs'
import { makeResolver } from './resolve.mjs'
import { rewriteLinks } from './rewrite-links.mjs'
import { pruneBrokenReferences, unwrapBrokenLinks, removeSections, markDeadAnchors } from './prune.mjs'

const OUT = path.join(ROOT, 'out')

// 섹션 단위 제외 규칙
const SECTION_EXCLUDES = new Map()
for (const line of fs.readFileSync(path.join(ROOT, 'exclude-sections.txt'), 'utf8').split('\n')) {
  const t = line.trim()
  if (!t || t.startsWith('#')) continue
  const [file, title] = t.split('|').map(x => x.trim())
  if (!SECTION_EXCLUDES.has(file)) SECTION_EXCLUDES.set(file, [])
  SECTION_EXCLUDES.get(file).push(title)
}
const toPosix = p => p.split(path.sep).join('/')

function walk(dir, rel = '', out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const abs = path.join(dir, e.name)
    const r = rel ? `${rel}/${e.name}` : e.name
    if (e.isDirectory()) walk(abs, r, out)
    else if (e.name.endsWith('.md')) out.push({ abs, rel: toPosix(r) })
  }
  return out
}

// 검색 결과에 그대로 뜨는 문장이므로 중간에 끊지 않고 문장 단위로 끝낸다.
// Vault 노트는 첫 문장에 정의를 완결시키는 형식이라 그 한 문장이면 충분하다.
function firstSentence(t) {
  if (!t) return ''
  const END = /(?:다|요|음|임|함)\.(?=\s|$)|(?<=[a-zA-Z0-9)\]])\.(?=\s[A-Z가-힣])/
  const m = t.match(END)
  let s = m ? t.slice(0, m.index + m[0].length) : t
  if (s.length < 40 && t.length > s.length) {          // 너무 짧으면 다음 문장까지
    const rest = t.slice(s.length)
    const m2 = rest.match(END)
    if (m2) s = (s + rest.slice(0, m2.index + m2[0].length)).trim()
  }
  if (s.length > 180) s = s.slice(0, 157).trimEnd() + '…'
  return s.trim()
}

const text = node => {
  const acc = []
  const go = n => { if (n.type === 'text') acc.push(n.value); (n.children ?? []).forEach(go) }
  go(node)
  return acc.join('')
}

// ---------- 준비 ----------
const docs = walk(STAGE).map(f => ({
  ...f,
  slug: slugifyFilePath(f.rel),
  route: publicRoute(f.rel),
  kind: kindOf(f.rel),
}))

const dupRoutes = Object.entries(
  docs.reduce((m, d) => ((m[d.route] = (m[d.route] ?? 0) + 1), m), {})
).filter(([, n]) => n > 1)

const allSlugs = docs.map(d => d.slug)
const slugToRoute = new Map(docs.map(d => [d.slug, d.route]))
const resolve = makeResolver(allSlugs)
const ctx = { allSlugs, cfg: { configuration: { baseUrl: 'hskim.me' } }, argv: {} }
const { proc, textTransform } = makeProcessor(ctx)

const report = {
  total: docs.length, ok: 0, failed: [], duplicateRoutes: dupRoutes,
  noH1: [], brokenLinks: [], ambiguousLinks: [], emptyDescription: [], longDescription: [],
  linkCount: 0, tables: 0, code: 0, callouts: 0, math: 0, images: 0,
  pruned: { rows: 0, items: 0, paragraphs: 0, tables: 0, lists: 0, headings: 0, unwrapped: 0, dropped: 0, detail: [] },
  sectionsRemoved: [],
}

// ---------- 1) 파싱 ----------
const pages = []
for (const d of docs) {
  try {
    const raw = fs.readFileSync(d.abs, 'utf8')
    const { data: fm, body } = readFrontmatter(raw)
    const vfile = new VFile({ value: textTransform(body), path: d.abs })
    vfile.data.slug = d.slug
    vfile.data.frontmatter = fm

    const tree = await proc.run(proc.parse(vfile), vfile)

    let title = null
    const toc = []
    const features = { math: false, mermaid: false, code: false, table: false, image: false }
    visit(tree, 'element', node => {
      const tag = node.tagName
      const cls = String(node.properties?.className ?? '')
      if (/^h[1-6]$/.test(tag)) {
        const t = text(node).trim()
        const depth = Number(tag[1])
        if (depth === 1 && !title) title = t
        else if (depth <= 3) toc.push({ depth, text: t, id: node.properties?.id ?? '' })
      }
      if (tag === 'table') { report.tables++; features.table = true }
      if (tag === 'pre') { report.code++; features.code = true }
      if (tag === 'img') { report.images++; features.image = true }
      if (cls.includes('callout')) report.callouts++
      if (cls.includes('katex')) { report.math++; features.math = true }
      if (cls.includes('mermaid')) features.mermaid = true
    })
    if (!title) { title = path.basename(d.rel, '.md'); report.noH1.push(d.rel) }

    let para = ''
    visit(tree, 'element', node => {
      if (para || node.tagName !== 'p') return
      const t = text(node).replace(/\s+/g, ' ').trim()
      if (t.length >= 20) para = t
    })
    let description = firstSentence(para)
    if (!description) report.emptyDescription.push(d.rel)
    if (para.length > description.length) report.longDescription.push({ file: d.rel, full: para.length, kept: description.length })

    pages.push({ ...d, title, description, tree, toc, features, tags: vfile.data.frontmatter?.tags ?? [] })
    report.ok++
  } catch (err) {
    report.failed.push({ file: d.rel, error: String(err?.message ?? err).slice(0, 200) })
  }
}

const routeToTitle = new Map(pages.map(p => [p.route, p.title]))

// ---------- 2) 연결 ----------
const backlinks = new Map()
for (const p of pages) {
  const outgoing = rewriteLinks(p.tree, { resolve, slugToRoute })
  p.outgoing = [...outgoing].filter(s => s !== p.slug)
  report.linkCount += outgoing.size
  for (const t of p.outgoing) {
    if (!backlinks.has(t)) backlinks.set(t, new Set())
    backlinks.get(t).add(p.slug)
  }
  // 리포트용 진단 (정리 전에 수집한다)
  visit(p.tree, 'element', node => {
    if (node.tagName === 'a' && node.properties?.['data-broken']) {
      const r = resolve(String(node.properties['data-slug']).split('#')[0])
      if (r.status === 'ambiguous') report.ambiguousLinks.push({ from: p.rel, to: node.properties['data-slug'], candidates: r.candidates })
      else report.brokenLinks.push({ from: p.rel, to: node.properties['data-slug'] })
    }
  })

  // 섹션 단위 제외를 먼저 적용하고, 그 섹션을 가리키는 앵커를 비공개로 표시한다
  const titles = SECTION_EXCLUDES.get(p.rel) ?? []
  if (titles.length) {
    const { removed, deadAnchors } = removeSections(p.tree, titles)
    if (removed.length) report.sectionsRemoved.push({ file: p.rel, sections: removed.map(r => r.title) })
    markDeadAnchors(p.tree, deadAnchors)
  }

  // 비공개 대상만 참조하는 행·항목 제거 → 남은 비공개 링크는 평문화
  const pr = pruneBrokenReferences(p.tree)
  report.pruned.rows += pr.rows.length
  report.pruned.items += pr.items.length
  report.pruned.paragraphs += pr.paragraphs.length
  report.pruned.tables += pr.tables
  report.pruned.lists += pr.lists
  report.pruned.headings += pr.headings
  if (pr.rows.length || pr.items.length || pr.paragraphs.length) {
    report.pruned.detail.push({ file: p.rel, rows: pr.rows, items: pr.items, paragraphs: pr.paragraphs })
  }
  const uw = unwrapBrokenLinks(p.tree)
  report.pruned.unwrapped += uw.unwrapped
  report.pruned.dropped = (report.pruned.dropped ?? 0) + uw.dropped

  // 목차는 정리 후 다시 만든다. 제거된 섹션 제목이 목차에 남으면 안 된다.
  const toc = []
  visit(p.tree, 'element', node => {
    if (!/^h[2-3]$/.test(node.tagName)) return
    toc.push({ depth: Number(node.tagName[1]), text: text(node).trim(), id: node.properties?.id ?? '' })
  })
  p.toc = toc
}

// ---------- 3) 출력 ----------
fs.rmSync(OUT, { recursive: true, force: true })
fs.mkdirSync(path.join(OUT, 'content'), { recursive: true })

const linkInfo = slug => ({ route: slugToRoute.get(slug), title: routeToTitle.get(slugToRoute.get(slug)) })

for (const p of pages) {
  const doc = {
    route: p.route,
    slug: p.slug,
    title: p.title,
    description: p.description,
    source: p.rel,
    kind: p.kind,
    category: p.rel.replace(/\.md$/, '').split('/').slice(0, -1),
    html: proc.stringify(p.tree),
    toc: p.toc,
    links: p.outgoing.map(linkInfo),
    backlinks: [...(backlinks.get(p.slug) ?? [])].map(linkInfo),
    tags: p.tags,
    features: p.features,   // 프론트엔드가 KaTeX·Mermaid 를 필요한 문서에서만 로드하기 위한 힌트
    locale: 'ko',
  }
  const dest = path.join(OUT, 'content', p.route + '.json')
  fs.mkdirSync(path.dirname(dest), { recursive: true })
  fs.writeFileSync(dest, JSON.stringify(doc, null, 2))
}

// MOC(Map of Content) 는 분류 안의 거의 모든 문서를 가리키는 색인 문서다.
// 연결이 많지만 '어떤 문서끼리 실제로 관련 있는가' 라는 정보는 주지 않는다.
// 그래프에서는 허브로 표시하되 배치 계산에서는 링크를 빼야 주제 군집이 드러난다.
// (MOC 링크를 전부 빼도 고립되는 문서는 0개임을 확인했다)
const isHub = title => /\bMOC\b/i.test(title)

const nodes = pages.map(p => ({
  id: p.route,
  title: p.title,
  kind: p.kind,
  group: p.rel.split('/').slice(0, 2).map(s => s.replace(/^\d{2}\s+/, '')).join('/'),
  degree: p.outgoing.length + (backlinks.get(p.slug)?.size ?? 0),
  hub: isHub(p.title) || undefined,
}))
const hubIds = new Set(nodes.filter(n => n.hub).map(n => n.id))
const edges = []
const seen = new Set()
for (const p of pages) for (const t of p.outgoing) {
  const key = `${p.route}->${slugToRoute.get(t)}`
  if (!seen.has(key)) {
    const target = slugToRoute.get(t)
    const hub = hubIds.has(p.route) || hubIds.has(target)
    edges.push({ source: p.route, target, ...(hub ? { hub: true } : {}) })
    seen.add(key)
  }
}

fs.writeFileSync(path.join(OUT, 'graph.json'), JSON.stringify({ nodes, links: edges }))
fs.writeFileSync(path.join(OUT, 'slug-map.json'),
  JSON.stringify(Object.fromEntries(pages.map(p => [p.route, { slug: p.slug, source: p.rel }])), null, 2))
fs.writeFileSync(path.join(ROOT, 'build-report.json'), JSON.stringify(report, null, 2))

// ---------- 보고 ----------
const isolated = nodes.filter(n => n.degree === 0)
const hubs = [...nodes].sort((a, b) => b.degree - a.degree).slice(0, 5)
console.log(`\n  문서 ${report.total}개 → 성공 ${report.ok} / 실패 ${report.failed.length}`)
console.log(`  링크 ${report.linkCount}개 → 엣지 ${edges.length}개`)
console.log(`    해석 실패 ${report.brokenLinks.length} · 중복 이름 ${report.ambiguousLinks.length}`)
console.log(`  노드 ${nodes.length}개 · 고립 ${isolated.length}개 · URL 충돌 ${report.duplicateRoutes.length}건`)
console.log(`  허브(MOC) ${hubIds.size}개 · 허브 엣지 ${edges.filter(e => e.hub).length}개 (배치 계산에서 제외)`)
console.log(`  표 ${report.tables} · 코드 ${report.code} · 수식 ${report.math} · 콜아웃 ${report.callouts} · 이미지 ${report.images}`)
console.log(`  H1 없음 ${report.noH1.length} · 요약 없음 ${report.emptyDescription.length} · 첫 문장만 사용 ${report.longDescription.length}`)
const pd = report.pruned
if (report.sectionsRemoved.length) {
  for (const s of report.sectionsRemoved) console.log(`  섹션 제외 — ${s.file}: ${s.sections.join(', ')}`)
}
console.log(`  비공개 참조 정리 — 표 행 ${pd.rows} · 목록 항목 ${pd.items} · 문단 ${pd.paragraphs} · 빈 표 ${pd.tables} · 빈 목록 ${pd.lists} · 빈 섹션 제목 ${pd.headings} · 링크 평문화 ${pd.unwrapped} · 항목 제거 ${pd.dropped ?? 0}`)
console.log('\n  연결 상위 5개')
for (const h of hubs) console.log(`    ${String(h.degree).padStart(4)}  ${h.title}`)
if (report.failed.length) { console.log('\n  실패:'); for (const f of report.failed.slice(0,5)) console.log(`    ${f.file} — ${f.error}`) }
if (report.duplicateRoutes.length) { console.log('\n  URL 충돌:'); for (const [r,n] of report.duplicateRoutes) console.log(`    ${r} (${n})`) }
console.log('')
