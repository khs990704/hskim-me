import Link from 'next/link'
import { allDocs, graph } from '../lib/content'

// P4 에서 3D 뉴런 그래프로 대체된다. 지금은 진입 경로만 제공한다.
export default function Home() {
  const docs = allDocs()
  const g = graph()

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col justify-center px-6 py-20">
      <p className="mb-6 inline-flex w-fit items-center gap-2 rounded-full border border-[var(--line)] px-3 py-1 text-[12px] text-[var(--fg-dim)]">
        <span className="h-1.5 w-1.5 rounded-full bg-[var(--accent)]" />
        준비 중
      </p>

      <h1 className="text-[2.2rem] font-bold tracking-tight text-[var(--fg-strong)]">hskim.me</h1>
      <p className="mt-3 text-[var(--fg-dim)]">
        지식 노트와 프로젝트 기록을 연결해 공개하는 개인 사이트입니다.
      </p>

      <dl className="mt-10 grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-[var(--line)] bg-[var(--line)] text-[13.5px] sm:grid-cols-4">
        {[
          ['공개 문서', docs.length],
          ['문서 간 연결', g.links.length],
          ['지식 노트', docs.filter(d => d.kind === 'note').length],
          ['프로젝트', docs.filter(d => d.kind === 'project').length],
        ].map(([label, n]) => (
          <div key={label as string} className="bg-[var(--bg)] px-4 py-3">
            <dt className="text-[12px] text-[var(--fg-faint)]">{label}</dt>
            <dd className="mt-0.5 text-[1.2rem] font-semibold tabular-nums text-[var(--fg-strong)]">{n as number}</dd>
          </div>
        ))}
      </dl>

      <nav className="mt-8 flex flex-wrap gap-2 text-[13.5px]">
        <Link href="/index-all" className="rounded-md border border-[var(--line)] px-3.5 py-2 text-[var(--fg)] hover:border-[var(--accent)] hover:text-[var(--accent)]">
          전체 목록
        </Link>
        <Link href="/portfolio" className="rounded-md border border-[var(--line)] px-3.5 py-2 text-[var(--fg)] hover:border-[var(--accent)] hover:text-[var(--accent)]">
          포트폴리오
        </Link>
      </nav>
    </main>
  )
}
