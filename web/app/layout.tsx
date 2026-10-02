import type { Metadata } from 'next'
import { social } from '../lib/og'
import NeroRoot from '../components/nero/NeroRoot'
import './globals.css'

const SITE = 'hskim.me'
// 정식 주소 (D-13). www 는 Cloudflare 규칙으로 여기로 301 된다
const BASE = 'https://hskim.me'

export const metadata: Metadata = {
  metadataBase: new URL(BASE),
  title: { default: SITE, template: `%s — ${SITE}` },
  description: '지식 노트와 프로젝트 기록을 연결해 공개하는 개인 사이트',
  // 페이지가 따로 정하지 않으면 사이트 카드를 쓴다
  ...social('_site', SITE, '지식 노트와 프로젝트 기록을 연결해 공개하는 개인 사이트', 'website'),
  // 검색 엔진 소유 확인 (P7-5). 구글은 DNS 로 확인해 태그가 필요 없다. 네이버는 DNS 확인이 없어 태그로
  verification: { other: { 'naver-site-verification': 'c8a532ffe3bed2f906fb32eb843358c6be2f029c' } },
  // 선언이 없으면 브라우저가 /favicon.ico 를 찾다가 404 를 낸다
  icons: { icon: '/icon.svg', apple: '/apple-icon.png' },
}

// 첫 페인트 전에 테마를 결정한다. 없으면 화면이 번쩍인다.
// 테마는 그리기 전에 정한다 (깜빡임 방지). /about 스탯창의 어두운 우주는 .hud 안에서만 칠한다 (globals.css).
const themeScript = `(function(){try{var t=localStorage.getItem('theme');
if(!t)t=matchMedia('(prefers-color-scheme: light)').matches?'light':'dark';
document.documentElement.dataset.theme=t;}catch(e){}})();`

// 방문 통계 (Cloudflare Web Analytics, P7-6). 쿠키 없음.
// 처음에는 Cloudflare 가 응답에 끼워 넣게(자동 설정) 두었는데, 무료 요금제 zone 프록시가 한국 접속을
// 유럽 거점으로 보내 첫 응답이 0.9초였다. 프록시를 끄면 자동 삽입도 멈추므로 직접 넣는다 (2026-09-30).
// 정식 주소에서만 센다 — 같은 빌드가 테스트 주소(*.pages.dev)로도 나가기 때문. 토큰은 공개 값이다.
// 허용 주소는 public/_headers 의 CSP (script-src static.cloudflareinsights.com, connect-src cloudflareinsights.com)
const analyticsScript = `if(location.hostname==='hskim.me'){var s=document.createElement('script');s.type='module';
s.src='https://static.cloudflareinsights.com/beacon.min.js';s.setAttribute('data-cf-beacon','{"token":"f9bbfb7bf46b44b49c087c84dfcb44a1"}');
document.head.appendChild(s)}`

// suppressHydrationWarning 이 붙는 이유
//   html — 첫 페인트 전 themeScript 가 data-theme 을 바꿔 서버 값과 달라질 수 있다
//   head — 브라우저 확장이 <head> 에 속성을 주입하는 경우가 있다 (개발용 확장 등)
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko" data-theme="dark" suppressHydrationWarning>
      <head suppressHydrationWarning>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        <script dangerouslySetInnerHTML={{ __html: analyticsScript }} />
        {/*
          폰트는 우리가 들고 있다 (scripts/fetch-fonts.mjs).
          CDN 에 두었을 때는 렌더 차단 경로에 남의 서버가 끼어 300ms 를 먹었다.

          preload 하는 네 조각은 우리 글 전체 글자의 96%를 덮는다.
          한글 서브셋은 쓰임이 한쪽으로 몰려 있어 — 91번 하나가 69%다 —
          몇 개만 미리 당겨도 첫 화면이 대체 폰트로 그려졌다가 밀리는 일이 없다.
        */}
        {[91, 90, 89, 88].map(n => (
          <link
            key={n}
            rel="preload"
            as="font"
            type="font/woff2"
            crossOrigin=""
            href={`/fonts/pretendard-1.3.9/PretendardVariable.subset.${n}.woff2`}
          />
        ))}
        <link rel="stylesheet" href="/fonts/fonts.css" />
        {/* RSS — 페이지마다 metadata.alternates 가 canonical 로 덮어써서 여기에 직접 둔다 */}
        <link rel="alternate" type="application/rss+xml" title="hskim.me" href="/rss.xml" />
      </head>
      <body>{children}<NeroRoot /></body>
    </html>
  )
}
