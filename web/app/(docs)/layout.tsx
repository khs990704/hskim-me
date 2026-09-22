import Link from 'next/link'
import Sidebar from '../../components/Sidebar'
import ThemeToggle from '../../components/ThemeToggle'

export default function DocsLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <header className="sticky top-0 z-40 border-b border-[var(--line-soft)] bg-[var(--bg)]/85 backdrop-blur">
        <div className="flex h-14 items-center gap-2 px-3 sm:px-5">
          <Sidebar mode="trigger" />
          <Link href="/" className="mr-auto text-[15px] font-semibold tracking-tight text-[var(--fg-strong)]">
            hskim<span className="text-[var(--fg-faint)]">.me</span>
          </Link>
          <nav className="flex items-center gap-1 text-[13px] text-[var(--fg-dim)]">
            {[
              { href: '/about', label: '소개' },
              { href: '/portfolio', label: '포트폴리오' },
              { href: '/index-all', label: '전체 목록' },
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
      <div className="mx-auto flex max-w-[1400px] items-start">
        <aside className="sticky top-14 hidden h-[calc(100vh-3.5rem)] w-64 shrink-0 overflow-y-auto border-r border-[var(--line-soft)] lg:block">
          <Sidebar mode="tree" />
        </aside>
        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </>
  )
}
