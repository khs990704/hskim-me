import IntentLink from './IntentLink'
import Sidebar from './Sidebar'
import ThemeToggle from './ThemeToggle'
import Search from './Search'
import ToTop from './ToTop'
import NeroDock from './nero/NeroDock'

/** 모든 문서 페이지 공통 머리 (본문 바로가기 + 헤더). 문서 틀 · 소개(스탯창) 틀이 같이 쓴다.
 *  링크는 누를 낌새가 보일 때만 미리 받는다 (IntentLink) — 모든 페이지에 있어 첫 화면 통신을 아낀다 */
export default function SiteHeader() {
  return (
    <>
    <a href="#main" className="skip-link">본문 바로가기</a>
    <header className="sticky top-0 z-40 border-b border-[var(--line-soft)] bg-[var(--bg)]/85 backdrop-blur">
      {/* 본문 틀(최대 1400px)과 같은 폭에 맞춘다 — 넓은 화면에서 이름만 화면 왼쪽 끝에 쏠려 보였다 (2026-10-02) */}
      <div className="mx-auto flex h-14 max-w-[1400px] items-center gap-2 px-3 sm:px-5">
        <Sidebar mode="trigger" />
        {/* 이름 — 메인의 별을 닮은 작은 빛 표시 + 조금 크게. 메인으로 돌아가는 길이라 눈에 띄어야 한다 */}
        <IntentLink href="/" className="site-logo mr-auto" aria-label="hskim.me 메인으로">
          <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden className="site-logo-star">
            <path d="M12 1.5c.6 5.6 4.9 9.9 10.5 10.5-5.6.6-9.9 4.9-10.5 10.5C11.4 16.9 7.1 12.6 1.5 12 7.1 11.4 11.4 7.1 12 1.5z" fill="currentColor" />
          </svg>
          <span>hskim<span className="text-[var(--fg-faint)]">.me</span></span>
        </IntentLink>
        <nav className="flex items-center gap-1 text-[13px] text-[var(--fg-dim)]">
          <Search />
          {[
            { href: '/about', label: '소개' },
            { href: '/index-all', label: '전체 목록' },
            { href: '/portfolio', label: '포트폴리오' },
            { href: '/life', label: '일상' },
          ].map(l => (
            <IntentLink
              key={l.href}
              href={l.href}
              className="hidden rounded px-2.5 py-1.5 hover:bg-[var(--bg-soft)] hover:text-[var(--fg)] sm:block"
            >
              {l.label}
            </IntentLink>
          ))}
          <ThemeToggle />
        </nav>
      </div>
    </header>
    <NeroDock />
    <ToTop />
    </>
  )
}
