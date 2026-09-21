import type { MetadataRoute } from 'next'
import { allDocs } from '../lib/content'

const BASE = 'https://www.hskim.me'

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
