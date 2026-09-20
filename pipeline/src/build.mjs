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

const OUT = path.join(ROOT, 'out')
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
    visit(tree, 'element', node => {
      const tag = node.tagName
      const cls = String(node.properties?.className ?? '')
      if (/^h[1-6]$/.test(tag)) {
        const t = text(node).trim()
        const depth = Number(tag[1])
        if (depth === 1 && !title) title = t
        else if (depth <= 3) toc.push({ depth, text: t, id: node.properties?.id ?? '' })
      }
      if (tag === 'table') report.tables++
      if (tag === 'pre') report.code++
      if (tag === 'img') report.images++
      if (cls.includes('callout')) report.callouts++
      if (cls.includes('katex')) report.math++
    })
    if (!title) { title = path.basename(d.rel, '.md'); report.noH1.push(d.rel) }

    let description = ''
    visit(tree, 'element', node => {
      if (description || node.tagName !== 'p') return
      const t = text(node).replace(/\s+/g, ' ').trim()
      if (t.length >= 20) description = t
    })
    if (!description) report.emptyDescription.push(d.rel)
    else if (description.length > 160) {
      report.longDescription.push({ file: d.rel, length: description.length })
      description = description.slice(0, 157).trimEnd() + '…'
    }

    pages.push({ ...d, title, description, tree, toc, tags: vfile.data.frontmatter?.tags ?? [] })
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
  // 리포트용 진단
  visit(p.tree, 'element', node => {
    if (node.tagName === 'a' && node.properties?.['data-broken']) {
      const r = resolve(String(node.properties['data-slug']).split('#')[0])
      if (r.status === 'ambiguous') report.ambiguousLinks.push({ from: p.rel, to: node.properties['data-slug'], candidates: r.candidates })
      else report.brokenLinks.push({ from: p.rel, to: node.properties['data-slug'] })
    }
  })
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
    locale: 'ko',
  }
  const dest = path.join(OUT, 'content', p.route + '.json')
  fs.mkdirSync(path.dirname(dest), { recursive: true })
  fs.writeFileSync(dest, JSON.stringify(doc, null, 2))
}

const nodes = pages.map(p => ({
  id: p.route,
  title: p.title,
  kind: p.kind,
  group: p.rel.split('/').slice(0, 2).map(s => s.replace(/^\d{2}\s+/, '')).join('/'),
  degree: p.outgoing.length + (backlinks.get(p.slug)?.size ?? 0),
}))
const edges = []
const seen = new Set()
for (const p of pages) for (const t of p.outgoing) {
  const key = `${p.route}->${slugToRoute.get(t)}`
  if (!seen.has(key)) { seen.add(key); edges.push({ source: p.route, target: slugToRoute.get(t) }) }
}

fs.writeFileSync(path.join(OUT, 'graph.json'), JSON.stringify({ nodes, links: edges }, null, 2))
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
console.log(`  표 ${report.tables} · 코드 ${report.code} · 수식 ${report.math} · 콜아웃 ${report.callouts} · 이미지 ${report.images}`)
console.log(`  H1 없음 ${report.noH1.length} · 요약 없음 ${report.emptyDescription.length} · 요약 잘림 ${report.longDescription.length}`)
console.log('\n  연결 상위 5개')
for (const h of hubs) console.log(`    ${String(h.degree).padStart(4)}  ${h.title}`)
if (report.failed.length) { console.log('\n  실패:'); for (const f of report.failed.slice(0,5)) console.log(`    ${f.file} — ${f.error}`) }
if (report.duplicateRoutes.length) { console.log('\n  URL 충돌:'); for (const [r,n] of report.duplicateRoutes) console.log(`    ${r} (${n})`) }
console.log('')
