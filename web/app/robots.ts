import type { MetadataRoute } from 'next'

export const dynamic = 'force-static'

// 2026-09-29 공개 전환 (P7-4) — 전체 허용. 비공개 노트는 애초에 빌드에 들어오지 않는다 (화이트리스트 · 가드).
// 테스트 주소(*.pages.dev)는 robots 가 아니라 _headers 의 X-Robots-Tag 로 막는다 — 같은 파일이 두 주소에 나가기 때문
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: '*', allow: '/' }],
    sitemap: 'https://hskim.me/sitemap.xml',
  }
}
