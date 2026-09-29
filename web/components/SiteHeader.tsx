import Link from 'next/link'
import Sidebar from './Sidebar'
import ThemeToggle from './ThemeToggle'
import Search from './Search'

/** 모든 문서 페이지 공통 머리 (본문 바로가기 + 헤더). 문서 틀 · 소개(스탯창) 틀이 같이 쓴다 */
export default function SiteHeader() {
  return (
    <>
    <a href="#main" className="skip-link">본문 바로가기</a>
    <header className="sticky top-0 z-40 border-b border-[var(--line-soft)] bg-[var(--bg)]/85 backdrop-blur">
      <div className="flex h-14 items-center gap-2 px-3 sm:px-5">
        <Sidebar mode="trigger" />
        <Link href="/" className="mr-auto text-[15px] font-semibold tracking-tight text-[var(--fg-strong)]">
          hskim<span className="text-[var(--fg-faint)]">.me</span>
        </Link>
        <nav className="flex items-center gap-1 text-[13px] text-[var(--fg-dim)]">
          <Search />
          {[
            { href: '/about', label: '소개' },
            { href: '/index-all', label: '전체 목록' },
            { href: '/portfolio', label: '포트폴리오' },
          ].map(l => (
            <Link
              key={l.href}
              href={l.href}
              className="hidden rounded px-2.5 py-1.5 hover:bg-[var(--bg-soft)] hover:text-[var(--fg)] sm:block"
            >
              {l.label}
            </Link>
          ))}
          <ThemeToggle />
        </nav>
      </div>
    </header>
    </>
  )
}
