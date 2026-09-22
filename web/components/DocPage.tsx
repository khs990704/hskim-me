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

        {/*
          같은 프로젝트의 다른 문서.
          포트폴리오는 서술형, 케이스 노트는 구조화 기록이라 읽는 사람이 다르다.
          어느 쪽으로 들어왔든 반대쪽을 찾을 수 있어야 한다.
        */}
        {doc.related && doc.related.length > 0 && (
          <div className="mt-10 space-y-2">
            {doc.related.map(r => (
              <Link
                key={r.route}
                href={'/' + r.route}
                className="flex items-center gap-3 rounded-lg border border-[var(--line-soft)] px-4 py-3 transition-colors hover:border-[var(--accent)]"
              >
                <span className="shrink-0 rounded px-2 py-0.5 text-[11px] font-medium tracking-wide text-[var(--accent)] ring-1 ring-[var(--accent)]/30">
                  {r.kind === 'portfolio' ? '포트폴리오' : '작업 기록'}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13.5px] text-[var(--fg)]">{r.title}</span>
                  <span className="block text-[12px] text-[var(--fg-dim)]">
                    {r.kind === 'portfolio'
                      ? '이 프로젝트를 왜·어떻게 만들었는지'
                      : '사용 기술과 구현 흐름을 정리한 기록'}
                  </span>
                </span>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                     className="shrink-0 text-[var(--fg-faint)]">
                  <path d="M9 6l6 6-6 6" />
                </svg>
              </Link>
            ))}
          </div>
        )}

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
