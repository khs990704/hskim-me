import Link from 'next/link'
import type { Metadata } from 'next'
import { allDocs } from '../../../lib/content'

export const metadata: Metadata = {
  title: '전체 목록',
  description: '공개된 지식 노트와 프로젝트 기록 전체 목록',
  alternates: { canonical: '/index-all' },
}

const strip = (s: string) => s.replace(/^\d{2}\s+/, '')

/**
 * 텍스트 인덱스.
 *   - 3D 그래프를 쓸 수 없는 환경의 대체 경로 (D-07)
 *   - 검색 엔진 크롤러의 진입점 (D-09) — 메인이 그래프라 홈에는 읽을 본문이 없다
 */
export default function Page() {
  const docs = allDocs()

  // 원본 폴더 경로(마지막 세그먼트 제외) 기준으로 묶는다
  const groups = new Map<string, typeof docs>()
  for (const d of docs) {
    const key = d.category.join(' / ')
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key)!.push(d)
  }

  return (
    <div className="px-5 py-8 sm:px-8 xl:px-10">
      <header className="mb-10 max-w-[72ch]">
        <h1 className="text-[2rem] font-bold leading-tight tracking-tight text-[var(--fg-strong)]">전체 목록</h1>
        <p className="mt-3 text-[var(--fg-dim)]">
          공개된 문서 {docs.length}개를 Obsidian 폴더 구조 그대로 나열합니다.
        </p>
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
