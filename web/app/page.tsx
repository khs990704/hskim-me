import Link from 'next/link'
import type { Metadata } from 'next'
import { allDocs, graph } from '../lib/content'
import GraphStage from '../components/GraphStage'
import Search from '../components/Search'

export const metadata: Metadata = {
  title: 'hskim.me',
  description: '지식 노트와 프로젝트 기록을 연결해 공개하는 개인 사이트',
  alternates: { canonical: '/' },
}

/**
 * 메인 — 3D 지식 그래프 (D-07)
 *
 * 그래프가 화면을 채우고 그 위에 최소한의 오버레이만 얹는다.
 * 오버레이는 서버에서 렌더되므로 JavaScript 나 WebGL 이 없어도 남는다.
 */
const LINKS = [
  { href: '/about', label: '소개' },
  { href: '/index-all', label: '전체 목록' },
  { href: '/portfolio', label: '포트폴리오' },
]

export default function Home() {
  const docs = allDocs()
  const g = graph()

  return (
    <main className="relative h-[100svh] overflow-hidden bg-[#03040a] text-[#e8edf5]">
      <GraphStage />

      {/* 좌상단 — 이름과 한 줄 */}
      <div className="pointer-events-none absolute left-5 top-5 z-10 max-w-[52vw] sm:left-8 sm:top-8 sm:max-w-xs">
        <h1 className="text-[1.3rem] font-bold tracking-tight sm:text-[1.6rem]">
          hskim<span className="text-[#78839c]">.me</span>
        </h1>
        <p className="mt-1 hidden text-[13px] leading-6 text-[#8b95a7] sm:block">
          지식 노트와 프로젝트 기록을 연결해 둔 곳입니다.
        </p>
      </div>

      {/* 우상단 — 검색과 진입 경로 */}
      <nav className="absolute right-4 top-5 z-10 flex items-center gap-1 text-[12px] sm:right-8 sm:top-8 sm:gap-1.5 sm:text-[13px]">
        <div className="[&_button]:border-[#2a3344] [&_button]:bg-[#121722]/85 [&_button]:text-[#c3cbd8] [&_button]:backdrop-blur [&_kbd]:border-[#2a3344] [&_kbd]:bg-[#0a0d14]">
          <Search />
        </div>
        {LINKS.map(l => (
          <Link
            key={l.href}
            href={l.href}
            className="hidden rounded-md border border-[#222b3a] bg-[#0a0d14]/70 px-2.5 py-1.5 text-[#c3cbd8] backdrop-blur transition-colors hover:border-[#7dd3fc] hover:text-[#7dd3fc] sm:block sm:px-3"
          >
            {l.label}
          </Link>
        ))}
      </nav>

      {/*
        화면 아래 — 규모·조작 힌트와 진입 경로.
        좁은 화면에서는 둘이 겹치므로 한 줄에 양끝으로 배치하고,
        자리가 모자라면 접히게 둔다.
      */}
      <div className="pointer-events-none absolute inset-x-5 bottom-5 z-10 flex flex-col items-end gap-2 sm:inset-x-8 sm:bottom-6 sm:flex-row sm:items-end sm:justify-between sm:gap-4">
        <div className="text-right text-[11.5px] leading-5 text-[#78839c] sm:text-left">
          <div className="tabular-nums">
            문서 {docs.length} · 연결 {g.links.length}
          </div>
          <div className="mt-0.5 hint-fine">드래그 회전 · 휠 확대 · 노드 클릭</div>
          <div className="mt-0.5 hint-coarse">끌어서 회전 · 두 손가락 확대</div>
        </div>

        {/* 메인에는 헤더도 서랍도 없다. 좁은 화면에서는 여기가 유일한 진입 경로다 */}
        <nav className="pointer-events-auto flex justify-end gap-1.5 whitespace-nowrap text-[12px] sm:hidden">
          {LINKS.map(l => (
            <Link
              key={l.href}
              href={l.href}
              className="rounded-md border border-[#222b3a] bg-[#0a0d14]/80 px-2.5 py-1.5 text-[#c3cbd8] backdrop-blur"
            >
              {l.label}
            </Link>
          ))}
        </nav>
      </div>

      {/* 크롤러와 JavaScript 미사용 환경의 진입 경로 (D-09) */}
      <noscript>
        <div className="absolute inset-0 z-20 grid place-items-center bg-[#03040a] px-6 text-center">
          <div>
            <p className="text-[13.5px] text-[#8b95a7]">
              3D 그래프를 보려면 JavaScript 가 필요합니다.
            </p>
            <Link href="/index-all" className="mt-4 inline-block text-[13.5px] text-[#7dd3fc] underline">
              전체 목록으로 보기
            </Link>
          </div>
        </div>
      </noscript>
    </main>
  )
}
