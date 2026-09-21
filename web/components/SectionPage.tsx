import Link from 'next/link'
import { allDocs, getDoc } from '../lib/content'
import DocPage from './DocPage'

const strip = (s: string) => s.replace(/^\d{2}\s+/, '')

/**
 * 구역 대문 (/notes, /projects).
 *
 * 그 자리에 해당하는 문서가 있으면 그 문서를 보여준다.
 * Vault 의 목차 문서가 폴더 노트 관례로 여기에 놓이는 경우가 있다.
 *   예) 02 Project Cases/Project Index/Project Index.md → /projects
 * 없으면 하위 문서 목록을 보여준다. 어느 쪽이든 404 가 나지 않아야 한다.
 */
export default function SectionPage({ route, title }: { route: string; title: string }) {
  const doc = getDoc(route)
  if (doc) return <DocPage doc={doc} />

  const docs = allDocs().filter(d => d.route.startsWith(route + '/'))
  const groups = new Map<string, typeof docs>()
  for (const d of docs) {
    const key = d.category.join(' / ')
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key)!.push(d)
  }

  return (
    <div className="px-5 py-8 sm:px-8 xl:px-10">
      <header className="mb-10 max-w-[72ch]">
        <h1 className="text-[2rem] font-bold leading-tight tracking-tight text-[var(--fg-strong)]">{title}</h1>
        <p className="mt-3 text-[var(--fg-dim)]">문서 {docs.length}개</p>
      </header>
      <div className="space-y-10">
        {[...groups.entries()].map(([key, items]) => (
          <section key={key}>
            <h2 className="mb-2.5 text-[13px] font-medium tracking-wide text-[var(--fg-faint)]">
              {key.split(' / ').map(strip).join(' / ')}
            </h2>
            <ul className="grid gap-x-6 gap-y-1 sm:grid-cols-2 xl:grid-cols-3">
              {items.map(d => (
                <li key={d.route}>
                  <Link
                    href={'/' + d.route}
                    className="block truncate rounded px-2 py-1 text-[13.5px] text-[var(--fg-dim)] hover:bg-[var(--bg-soft)] hover:text-[var(--accent)]"
                    title={d.description || d.title}
                  >
                    {d.title}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
  )
}
