import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { socialPhoto } from '../../../../lib/og'
import { getLife, when } from '../../../../lib/life'
import PhotoViewer from '../../../../components/life/PhotoViewer'
import RichText from '../../../../components/life/RichText'

export const dynamicParams = false

export function generateStaticParams() {
  const { posts } = getLife()
  // 정적 내보내기는 목록이 비면 빌드를 멈춘다 — 글이 없을 때는 자리표시 하나를 두고 404 로 보낸다
  return posts.length ? posts.map(p => ({ slug: p.slug })) : [{ slug: '_' }]
}

const find = async (params: Promise<{ slug: string }>) => {
  const { slug } = await params
  const s = decodeURIComponent(slug)
  return getLife().posts.find(p => p.slug === s) ?? null
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const p = await find(params)
  if (!p) return {}
  return {
    title: `${p.heading} · 일상`,
    description: p.description,
    keywords: p.tags.length ? p.tags : undefined,
    alternates: { canonical: `/life/${p.slug}` },
    ...socialPhoto(p.og, p.heading, p.description),
  }
}

/** 사진 기록 한 편. 목록(/life)에서 들어온다. 사진 · 날짜 · 장소 · 글 · 태그 · 앞뒤 글 */
export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const p = await find(params)
  if (!p) notFound()
  const { posts } = getLife()
  const i = posts.findIndex(x => x.slug === p.slug)
  const newer = posts[i - 1], older = posts[i + 1]
  // 제목 밑 한 줄 — 제목으로 쓰지 않은 장소 · 가게 · 공연장 · 기록
  const sub = [p.place, p.venue, p.spot, p.sport, p.record].filter(x => x && x !== p.heading)

  return (
    <article className="mx-auto max-w-[880px] px-4 pb-24 pt-6 sm:px-8 sm:pt-8">
      <p className="mb-4 text-[13px]"><Link href="/life" className="text-[var(--fg-dim)] hover:text-[var(--accent)]">← 일상</Link></p>
      <PhotoViewer photos={p.photos} />

      <header className="mt-5">
        <p className="text-[12.5px] text-[var(--fg-faint)]">
          <span className="mr-2 rounded border border-[var(--line)] px-1.5 py-0.5 text-[var(--fg-dim)]">{p.category}</span>
          <time dateTime={p.date} className="tabular-nums">{when(p)}</time>
        </p>
        <h1 className="mt-2.5 text-[22px] font-semibold tracking-tight text-[var(--fg-strong)]">{p.heading}</h1>
        {sub.length > 0 && <p className="mt-1 text-[14px] text-[var(--fg-dim)]">{sub.join(' · ')}</p>}
        {(p.address || p.mapLink) && (
          <p className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] text-[var(--fg-faint)]">
            {p.address && <span>{p.address}</span>}
            {p.mapLink && (
              // 바깥 지도로 보내는 링크 — 사이트 안에 지도를 넣지 않아 보안 헤더 · 속도에 영향이 없다
              <a href={p.mapLink.url} target="_blank" rel="noopener noreferrer" className="text-[var(--accent)] hover:underline">
                {p.mapLink.label} →<span className="sr-only"> (새 창)</span>
              </a>
            )}
          </p>
        )}
      </header>

      {p.text.length > 0 && (
        <div className="prose mt-4">
          {p.text.map((t, k) => <p key={k}><RichText text={t} /></p>)}
        </div>
      )}

      {p.tags.length > 0 && (
        <ul className="mt-5 flex flex-wrap gap-1.5" aria-label="태그">
          {p.tags.map(t => (
            <li key={t}>
              <Link href={`/life?tag=${encodeURIComponent(t)}`} className="rounded-full bg-[var(--bg-soft)] px-2.5 py-1 text-[12.5px] text-[var(--fg-dim)] hover:text-[var(--accent)]">#{t}</Link>
            </li>
          ))}
        </ul>
      )}

      {/* 목록(/life)과 같은 방향 — 왼쪽이 최신, 오른쪽으로 갈수록 이전 글 (분류와 관계없이 날짜 순) */}
      {(newer || older) && (
        <nav className="mt-10 grid grid-cols-2 gap-3 border-t border-[var(--line-soft)] pt-5 text-[13px]" aria-label="다른 기록">
          <div>
            {newer && (
              <Link href={`/life/${newer.slug}`} className="text-[var(--fg-dim)] hover:text-[var(--accent)]">← {newer.heading}</Link>
            )}
          </div>
          <div className="text-right">
            {older && (
              <Link href={`/life/${older.slug}`} className="text-[var(--fg-dim)] hover:text-[var(--accent)]">{older.heading} →</Link>
            )}
          </div>
        </nav>
      )}
    </article>
  )
}
