import { allDocs, docDates } from '../../lib/content'
import { getLife } from '../../lib/life'

// RSS 2.0 — 네이버 서치어드바이저 · Bing 이 새 글을 빨리 알아채도록 (2026-10-02).
// 새로 만든 순서로 일상 글 · 지식 노트 · 프로젝트 기록을 섞어 최근 50편. 날짜는 Vault git 이력 (pipeline/src/dates.mjs)
export const dynamic = 'force-static'

const BASE = 'https://hskim.me'
const LIMIT = 50
const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
// 정식 주소(canonical)와 같은 모양 — app/sitemap.ts 참고
const url = (route: string) => new URL('/' + route, BASE).href
// 날짜만 아는 글은 한국 시각 정오로 둔다 — 시간대 경계에서 하루가 밀리지 않게
const rfc822 = (day: string) => new Date(`${day}T12:00:00+09:00`).toUTCString()

type Item = { title: string; link: string; date: string; description: string; category: string }

export function GET() {
  const dates = docDates()
  const life: Item[] = getLife().posts.map(p => ({
    title: p.heading, link: url(`life/${p.slug}`), date: p.date, description: p.description, category: p.category === '일상' ? '일상' : `일상 · ${p.category}`,
  }))
  const docs: Item[] = allDocs()
    .filter(d => d.kind !== 'portfolio' && dates[d.source])
    .map(d => ({
      title: d.title, link: url(d.route), date: dates[d.source][0], description: d.description,
      category: d.kind === 'project' ? '프로젝트' : d.category.map(c => c.replace(/^\d{2}\s+/, ''))[1] ?? '지식 노트',
    }))
  const items = [...life, ...docs].sort((a, b) => b.date.localeCompare(a.date) || a.title.localeCompare(b.title)).slice(0, LIMIT)
  const latest = items[0]?.date

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
<channel>
<title>hskim.me</title>
<link>${BASE}</link>
<description>김희섭의 지식 노트 · 프로젝트 기록 · 일상</description>
<language>ko</language>
<atom:link href="${BASE}/rss.xml" rel="self" type="application/rss+xml"/>
${latest ? `<lastBuildDate>${rfc822(latest)}</lastBuildDate>\n` : ''}${items.map(i => `<item>
<title>${esc(i.title)}</title>
<link>${i.link}</link>
<guid isPermaLink="true">${i.link}</guid>
<pubDate>${rfc822(i.date)}</pubDate>
<category>${esc(i.category)}</category>
<description>${esc(i.description)}</description>
</item>`).join('\n')}
</channel>
</rss>
`
  return new Response(xml, { headers: { 'Content-Type': 'application/rss+xml; charset=utf-8' } })
}
