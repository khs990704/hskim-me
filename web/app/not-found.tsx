import Link from 'next/link'
import type { Metadata } from 'next'
import Search from '../components/Search'

export const metadata: Metadata = {
  title: '없는 주소',
  description: '요청하신 주소에 해당하는 글이 없습니다.',
}

/**
 * 404 — 정적 내보내기에서는 out/404.html 로 나가고 Cloudflare Pages 가 이를 쓴다.
 *
 * 헤더가 없는 자리이므로(루트 레이아웃만 탄다) 돌아갈 길을 본문에 직접 둔다.
 * 노트가 485개라 이름이 바뀌면 옛 주소가 죽는다. 그때 막다른 길이 되지 않도록
 * 검색을 가장 크게 둔다.
 */
export default function NotFound() {
  return (
    <main className="grid min-h-[100svh] place-items-center px-6 py-16 text-center">
      <div className="w-full max-w-md">
        <p className="font-mono text-[12.5px] tracking-[0.18em] text-[var(--fg-faint)]">404</p>

        <h1 className="mt-3 text-[1.5rem] font-bold tracking-tight text-[var(--fg-strong)]">
          없는 주소입니다
        </h1>
        <p className="mt-3 text-[13.5px] leading-7 text-[var(--fg-dim)]">
          글이 옮겨졌거나 이름이 바뀌었을 수 있습니다.
          <br />
          제목의 한 단어만 기억나도 검색으로 찾을 수 있습니다.
        </p>

        {/*
          헤더에서는 자리가 없어 좁은 화면에서 돋보기만 남지만, 여기서는 이것이
          주된 길이다. 폭을 채우고 이름을 드러낸다.
          래퍼가 만드는 선택자가 버튼 자신의 클래스보다 우선한다.
        */}
        <div className="mt-7 [&_button]:h-10 [&_button]:w-full [&_button]:justify-center [&_button]:text-[13.5px] [&_span]:inline">
          <Search />
        </div>

        <nav className="mt-4 flex flex-wrap justify-center gap-1.5 text-[13px]">
          {[
            { href: '/', label: '메인' },
            { href: '/about', label: '소개' },
            { href: '/index-all', label: '전체 목록' },
            { href: '/portfolio', label: '포트폴리오' },
          ].map(l => (
            <Link
              key={l.href}
              href={l.href}
              className="rounded-md border border-[var(--line)] px-3 py-1.5 text-[var(--fg-dim)] transition-colors hover:border-[var(--accent)] hover:text-[var(--accent)]"
            >
              {l.label}
            </Link>
          ))}
        </nav>
      </div>
    </main>
  )
}
