import Link from 'next/link'
import { getDoc, type Doc } from '../lib/content'
import NoteBody, { type Preview } from './NoteBody'
import Toc from './Toc'

const strip = (s: string) => s.replace(/^\d{2}\s+/, '')

/** 표는 좁은 화면에서 가로 스크롤 컨테이너에 담는다 (Vault 가 표를 많이 쓴다) */
const wrapTables = (html: string) =>
  html.replace(/<table>/g, '<div class="table-scroll"><table>').replace(/<\/table>/g, '</table></div>')

export default function DocPage({ doc }: { doc: Doc }) {
  // 위키링크 호버 미리보기용 데이터. 이 문서가 거는 링크만 담는다.
  const previews: Record<string, Preview> = {}
  for (const l of doc.links) {
    const d = getDoc(l.route)
    if (d) previews[l.route] = { title: d.title, description: d.description }
  }

  const trail = doc.category.map(strip)

  return (
    <div className="flex items-start gap-8 px-5 py-8 sm:px-8 xl:px-10">
      <article className="min-w-0 flex-1">
        {doc.features.math && (
          <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.min.css" />
        )}

        <nav className="mb-5 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-[12.5px] text-[var(--fg-faint)]">
          {trail.map((seg, i) => (
            <span key={i} className="flex items-center gap-1.5">
              {i > 0 && <span className="text-[var(--line)]">/</span>}
              <span>{seg}</span>
            </span>
          ))}
        </nav>

        {/* 좁은 화면에서는 우측 목차 칼럼이 사라지므로 본문 위에 접어서 둔다 */}
        <Toc items={doc.toc} variant="inline" />

        <NoteBody html={wrapTables(doc.html)} previews={previews} />

        {doc.backlinks.length > 0 && (
          <section className="mt-16 border-t border-[var(--line-soft)] pt-6">
            <h2 className="mb-3 text-[13px] font-medium tracking-wide text-[var(--fg-faint)]">
              이 문서를 참조하는 문서 {doc.backlinks.length}개
            </h2>
            <ul className="grid gap-1.5 sm:grid-cols-2">
              {doc.backlinks.map(b => (
                <li key={b.route}>
                  <Link
                    href={'/' + b.route}
                    className="block truncate rounded px-2.5 py-1.5 text-[13.5px] text-[var(--fg-dim)] hover:bg-[var(--bg-soft)] hover:text-[var(--accent)]"
                    title={b.title}
                  >
                    {b.title}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}
      </article>

      <aside className="sticky top-20 hidden w-56 shrink-0 xl:block">
        <Toc items={doc.toc} variant="side" />
      </aside>
    </div>
  )
}
