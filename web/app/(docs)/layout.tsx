import Sidebar from '../../components/Sidebar'
import SiteHeader from '../../components/SiteHeader'

export default function DocsLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <SiteHeader />
      <div className="mx-auto flex max-w-[1400px] items-start">
        <aside className="sticky top-14 hidden h-[calc(100vh-3.5rem)] w-64 shrink-0 min-[1440px]:w-80 overflow-y-auto border-r border-[var(--line-soft)] lg:block">
          <Sidebar mode="tree" />
        </aside>
        <main id="main" tabIndex={-1} className="min-w-0 flex-1">{children}</main>
      </div>
    </>
  )
}
