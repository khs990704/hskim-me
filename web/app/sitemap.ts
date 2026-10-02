import type { MetadataRoute } from 'next'
import { allDocs, docDates } from '../lib/content'
import { getLife } from '../lib/life'

// 정식 주소 (D-13). www 는 Cloudflare 규칙으로 여기로 301 된다
const BASE = 'https://hskim.me'

export const dynamic = 'force-static'

export default function sitemap(): MetadataRoute.Sitemap {
  const dates = docDates()
  return [
    { url: BASE, priority: 1 },
    { url: `${BASE}/index-all`, priority: 0.8 },
    { url: `${BASE}/life`, priority: 0.5 },
    ...getLife().posts.map(p => ({ url: `${BASE}/life/${encodeURIComponent(p.slug)}`, lastModified: p.date, priority: 0.4 })),
    ...allDocs().map(d => ({
      url: `${BASE}/${d.route.split('/').map(encodeURIComponent).join('/')}`,
      // 마지막으로 고친 날 — 검색 엔진이 바뀐 문서부터 다시 읽는다
      lastModified: dates[d.source]?.[1],
      priority: d.kind === 'note' ? 0.6 : 0.7,
    })),
  ]
}
