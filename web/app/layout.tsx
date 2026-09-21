import type { Metadata } from 'next'
import './globals.css'

const SITE = 'hskim.me'
const BASE = 'https://www.hskim.me'

export const metadata: Metadata = {
  metadataBase: new URL(BASE),
  title: { default: SITE, template: `%s — ${SITE}` },
  description: '지식 노트와 프로젝트 기록을 연결해 공개하는 개인 사이트',
  robots: { index: false, follow: false },   // P7 공개 시점에 해제
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
        <link rel="preconnect" href="https://cdn.jsdelivr.net" />
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard-dynamic-subset.min.css"
        />
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/npm/@fontsource/jetbrains-mono@5/index.min.css"
        />
      </head>
      <body>{children}</body>
    </html>
  )
}
