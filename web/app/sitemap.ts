import type { MetadataRoute } from 'next'
import { allDocs } from '../lib/content'

// 정식 주소 (D-13). www 는 Cloudflare 규칙으로 여기로 301 된다
const BASE = 'https://hskim.me'

export const dynamic = 'force-static'

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: BASE, priority: 1 },
    { url: `${BASE}/index-all`, priority: 0.8 },
    ...allDocs().map(d => ({
      url: `${BASE}/${d.route.split('/').map(encodeURIComponent).join('/')}`,
      priority: d.kind === 'note' ? 0.6 : 0.7,
    })),
  ]
}
