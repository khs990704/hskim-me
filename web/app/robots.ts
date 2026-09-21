import type { MetadataRoute } from 'next'

export const dynamic = 'force-static'

// 공개 전까지 전체 차단. P7 정식 공개 시점에 허용으로 바꾸고 sitemap 을 노출한다.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: '*', disallow: '/' }],
  }
}
