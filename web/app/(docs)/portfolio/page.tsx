import Link from 'next/link'
import type { Metadata } from 'next'
import { getDoc, allDocs } from '../../../lib/content'
import NoteBody from '../../../components/NoteBody'

export function generateMetadata(): Metadata {
  const doc = getDoc('portfolio')
  return {
    title: '포트폴리오',
    description: doc?.description || '만든 것들과 그 과정에 대한 기록',
    alternates: { canonical: '/portfolio' },
  }
}

/**
 * 포트폴리오 목록.
 *
 * 분류는 URL 에 넣지 않고 화면에서만 묶는다 (D-14).
 * 분류는 바뀌지만 프로젝트 이름은 잘 안 바뀌기 때문이다.
 */
export default function Page() {
  const doc = getDoc('portfolio')
  const projects = allDocs()
    .filter(d => d.route.startsWith('portfolio/'))
    .sort((a, b) => a.route.localeCompare(b.route))

  // 분류별 묶음. 원본 문서의 등장 순서를 유지한다
  const groups: { name: string; items: typeof projects }[] = []
  for (const p of projects) {
    const name = p.category[0] ?? '기타'
    let g = groups.find(x => x.name === name)
    if (!g) { g = { name, items: [] }; groups.push(g) }
    g.items.push(p)
  }

  return (
    <div className="px-5 py-8 sm:px-8 xl:px-10">
      <header className="mb-10 max-w-[72ch]">
        <h1 className="text-[2rem] font-bold leading-tight tracking-tight text-[var(--fg-strong)]">포트폴리오</h1>
        <p className="mt-3 text-[var(--fg-dim)]">
          만든 것들과 그 과정에 대한 기록입니다. 프로젝트 {projects.length}개.
        </p>
      </header>

      <div className="mb-14 space-y-10">
        {groups.map(g => (
          <section key={g.name}>
            <h2 className="mb-3 text-[13px] font-medium tracking-wide text-[var(--fg-faint)]">{g.name}</h2>
            <ul className="grid gap-2 sm:grid-cols-2">
              {g.items.map(p => (
                <li key={p.route}>
                  <Link
                    href={'/' + p.route}
                    className="block rounded-lg border border-[var(--line-soft)] px-4 py-3 transition-colors hover:border-[var(--accent)]"
                  >
                    <div className="text-[14.5px] font-medium text-[var(--fg-strong)]">{p.title}</div>
                    <div className="mt-1 line-clamp-2 text-[12.5px] leading-6 text-[var(--fg-dim)]">
                      {p.description}
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>

      {/* 원본의 '프로젝트 한눈에 보기' 표 */}
      {doc && doc.html.trim() && (
        <div className="border-t border-[var(--line-soft)] pt-8">
          <NoteBody html={doc.html.replace(/<table>/g, '<div class="table-scroll"><table>').replace(/<\/table>/g, '</table></div>')} previews={{}} />
        </div>
      )}
    </div>
  )
}
