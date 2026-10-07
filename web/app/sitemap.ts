import type { MetadataRoute } from 'next'
import { allDocs, docDates } from '../lib/content'
import { getLife } from '../lib/life'

// 정식 주소 (D-13). www 는 Cloudflare 규칙으로 여기로 301 된다
const BASE = 'https://hskim.me'

export const dynamic = 'force-static'

// 주소는 페이지의 정식 주소(canonical)와 똑같이 만든다 — Next.js 가 canonical 을 new URL 로 만들어, 한글은 바꾸고 + 는 그대로 둔다.
// 전에는 encodeURIComponent 로 + 까지 %2B 로 바꿔, 구글이 사이트맵의 C++ 노트를 "정식 주소가 따로 있는 대체 페이지"로 분류했다 (2026-10-07)
const url = (path: string) => new URL(path, BASE).href

export default function sitemap(): MetadataRoute.Sitemap {
  const dates = docDates()
  return [
    { url: BASE, priority: 1 },
    { url: `${BASE}/index-all`, priority: 0.8 },
    { url: `${BASE}/life`, priority: 0.5 },
    ...getLife().posts.map(p => ({ url: url(`/life/${p.slug}`), lastModified: p.date, priority: 0.4 })),
    ...allDocs().map(d => ({
      url: url('/' + d.route),
      // 마지막으로 고친 날 — 검색 엔진이 바뀐 문서부터 다시 읽는다
      lastModified: dates[d.source]?.[1],
      priority: d.kind === 'note' ? 0.6 : 0.7,
    })),
  ]
}
