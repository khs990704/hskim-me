import type { Metadata } from 'next'
import './globals.css'

const SITE = 'hskim.me'
const BASE = 'https://www.hskim.me'

export const metadata: Metadata = {
  metadataBase: new URL(BASE),
  title: { default: SITE, template: `%s — ${SITE}` },
  description: '지식 노트와 프로젝트 기록을 연결해 공개하는 개인 사이트',
  robots: { index: false, follow: false },   // P7 공개 시점에 해제
  // 선언이 없으면 브라우저가 /favicon.ico 를 찾다가 404 를 낸다
  icons: { icon: '/icon.svg', apple: '/apple-icon.png' },
}

// 첫 페인트 전에 테마를 결정한다. 없으면 화면이 번쩍인다.
const themeScript = `(function(){try{var t=localStorage.getItem('theme');
if(!t)t=matchMedia('(prefers-color-scheme: light)').matches?'light':'dark';
document.documentElement.dataset.theme=t;}catch(e){}})();`

// suppressHydrationWarning 이 붙는 이유
//   html — 첫 페인트 전 themeScript 가 data-theme 을 바꿔 서버 값과 달라질 수 있다
//   head — 브라우저 확장이 <head> 에 속성을 주입하는 경우가 있다 (개발용 확장 등)
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko" data-theme="dark" suppressHydrationWarning>
      <head suppressHydrationWarning>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
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
      </head>
      <body>{children}</body>
    </html>
  )
}
