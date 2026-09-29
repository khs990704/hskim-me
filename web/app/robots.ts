import type { MetadataRoute } from 'next'

export const dynamic = 'force-static'

/**
 * AI 학습 전용 로봇 — 학습에만 쓰는 이름만 막는다. 검색 로봇과 사용자 질문에 답하려고 읽는 로봇
 * (OAI-SearchBot, ChatGPT-User, Claude-User, PerplexityBot 등)은 막지 않는다.
 *
 * 처음에는 Cloudflare 의 AI bot policies > Training: Block 으로 막았는데, Cloudflare 가 Googlebot 도
 * 학습 로봇으로 분류해 구글 검색까지 403 을 받았다 (2026-09-29, 규칙 BOBA-199). 분류 단위로만 고를 수 있어
 * Cloudflare 쪽은 풀고 여기서 이름별로 나눈다. Google-Extended 는 구글이 따로 둔 "AI 학습에는 쓰지 말라"
 * 표시라, 이것만 막으면 검색에는 나오고 Gemini 학습에는 쓰이지 않는다.
 * robots.txt 는 강제가 아니라 약속이지만, 아래 회사들은 모두 공식적으로 따른다.
 */
const AI_TRAINING = [
  'GPTBot',             // OpenAI 학습
  'ClaudeBot',          // Anthropic 학습
  'anthropic-ai',       // Anthropic 옛 이름
  'Google-Extended',    // Gemini 학습 · 근거 자료 (검색 색인과 무관)
  'Applebot-Extended',  // Apple 학습 (Applebot 검색과 무관)
  'CCBot',              // Common Crawl — 여러 모델의 학습 자료
  'Bytespider',         // ByteDance 학습
  'meta-externalagent', // Meta 학습
  'cohere-training-data-crawler',
]

// 2026-09-29 공개 전환 (P7-4) — 그 밖에는 전체 허용. 비공개 노트는 애초에 빌드에 들어오지 않는다 (화이트리스트 · 가드).
// 테스트 주소(*.pages.dev)는 robots 가 아니라 _headers 의 X-Robots-Tag 로 막는다 — 같은 파일이 두 주소에 나가기 때문
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: '*', allow: '/' },
      { userAgent: AI_TRAINING, disallow: '/' },
    ],
    sitemap: 'https://hskim.me/sitemap.xml',
  }
}
