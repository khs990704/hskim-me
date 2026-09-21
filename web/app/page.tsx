import Link from 'next/link'
import type { Metadata } from 'next'
import { allDocs, graph } from '../lib/content'
import GraphStage from '../components/GraphStage'

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
export default function Home() {
  const docs = allDocs()
  const g = graph()

  return (
    <main className="relative h-[100svh] overflow-hidden bg-[#03040a] text-[#e8edf5]">
      <GraphStage />

      {/* 좌상단 — 이름과 한 줄 */}
      <div className="pointer-events-none absolute left-6 top-6 z-10 sm:left-8 sm:top-8">
        <h1 className="text-[1.6rem] font-bold tracking-tight">
          hskim<span className="text-[#4a5468]">.me</span>
        </h1>
        <p className="mt-1 max-w-xs text-[13px] leading-6 text-[#8b95a7]">
          지식 노트와 프로젝트 기록을 연결해 둔 곳입니다.
        </p>
      </div>

      {/* 우상단 — 진입 경로 */}
      <nav className="absolute right-5 top-6 z-10 flex gap-1.5 text-[13px] sm:right-8 sm:top-8">
        {[
          { href: '/index-all', label: '전체 목록' },
          { href: '/portfolio', label: '포트폴리오' },
        ].map(l => (
          <Link
            key={l.href}
            href={l.href}
            className="rounded-md border border-[#222b3a] bg-[#0a0d14]/70 px-3 py-1.5 text-[#c3cbd8] backdrop-blur transition-colors hover:border-[#7dd3fc] hover:text-[#7dd3fc]"
          >
            {l.label}
          </Link>
        ))}
      </nav>

      {/* 좌하단 — 규모와 조작 힌트 */}
      <div className="pointer-events-none absolute bottom-6 left-6 z-10 text-[11.5px] leading-5 text-[#4a5468] sm:left-8">
        <div className="tabular-nums">
          문서 {docs.length} · 연결 {g.links.length}
        </div>
        <div className="mt-0.5">드래그 회전 · 휠 확대 · 노드 클릭</div>
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
