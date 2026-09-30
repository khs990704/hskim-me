'use client'
import { useEffect, useState } from 'react'
import IntentLink from '../IntentLink'
import type { LifePost } from '../../lib/life'
import { when } from '../../lib/life-format'

/** 목록 칸 하나 — 격자에 필요한 것만 (사진 개수는 숫자로) */
export type GalleryItem = Pick<LifePost, 'slug' | 'date' | 'until' | 'category' | 'place' | 'heading' | 'tags' | 'thumb'> & { count: number }

const srcset = (v: { w: number; url: string }[]) => v.map(x => `${x.url} ${x.w}w`).join(', ')

/**
 * 사진 기록 목록 — 정사각 격자. 누르면 글 페이지(/life/<주소>)로 간다.
 * 글마다 페이지가 있어야 검색 엔진이 따라가 읽고, 공유했을 때 사진 카드가 뜬다 (2026-09-30).
 * 분류와 태그로 거른다. 태그는 주소 ?tag= 로도 들어온다 (글 페이지의 태그 링크).
 */
export default function LifeGallery({ posts, categories }: { posts: GalleryItem[]; categories: string[] }) {
  const [filter, setFilter] = useState('전체')
  const [tag, setTag] = useState<string | null>(null)

  // 정적 페이지라 주소의 ?tag= 는 화면에서 읽는다
  useEffect(() => {
    const t = new URLSearchParams(location.search).get('tag')
    if (t && posts.some(p => p.tags.includes(t))) setTag(t)
  }, [posts])
  const pickTag = (t: string | null) => {
    setTag(t)
    history.replaceState(null, '', t ? `?tag=${encodeURIComponent(t)}` : location.pathname)
  }

  const counts = new Map(categories.map(c => [c, posts.filter(p => p.category === c).length]))
  const shown = posts.filter(p => (filter === '전체' || p.category === filter) && (!tag || p.tags.includes(tag)))
  const chip = 'rounded-full border border-[var(--line)] px-3 py-1 text-[13px] text-[var(--fg-dim)] hover:border-[var(--accent)] hover:text-[var(--accent)] aria-pressed:border-[var(--accent)] aria-pressed:bg-[var(--accent-dim)] aria-pressed:text-[var(--accent)]'

  if (!posts.length) return <p className="py-16 text-center text-[14px] text-[var(--fg-faint)]">아직 올린 기록이 없어요. 곧 채워 볼게요!</p>

  return (
    <div>
      <div className="mb-3 flex flex-wrap gap-1.5" role="group" aria-label="분류로 거르기">
        {['전체', ...categories.filter(c => counts.get(c))].map(c => (
          <button key={c} type="button" aria-pressed={filter === c} onClick={() => setFilter(c)} className={chip}>
            {c} <span className="tabular-nums opacity-70">{c === '전체' ? posts.length : counts.get(c)}</span>
          </button>
        ))}
      </div>
      {tag && (
        <p className="mb-3 flex items-center gap-2 text-[13px] text-[var(--fg-dim)]">
          <span>태그</span>
          <span className="rounded-full bg-[var(--accent-dim)] px-2.5 py-0.5 text-[var(--accent)]">#{tag}</span>
          <button type="button" onClick={() => pickTag(null)} className="underline underline-offset-2 hover:text-[var(--fg)]">태그 풀기</button>
        </p>
      )}

      <p className="sr-only" aria-live="polite">{shown.length}편</p>

      <ul className="grid grid-cols-3 gap-1 sm:grid-cols-4 sm:gap-1.5">
        {shown.map((p, i) => (
          <li key={p.slug}>
            <IntentLink
              href={`/life/${p.slug}`}
              aria-label={`${p.heading} — ${when(p)} ${p.category}, 사진 ${p.count}장`}
              className="group relative block aspect-square w-full overflow-hidden rounded-[3px] bg-[var(--bg-soft)]"
            >
              {p.thumb && (
                <img
                  src={p.thumb[0].url}
                  srcSet={srcset(p.thumb)}
                  sizes="(min-width: 640px) 25vw, 33vw"
                  alt=""
                  loading={i < 6 ? 'eager' : 'lazy'}
                  decoding="async"
                  className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                />
              )}
              {p.count > 1 && (
                <span aria-hidden className="absolute right-1.5 top-1.5 rounded bg-black/55 px-1.5 text-[11px] leading-5 text-white">{p.count}</span>
              )}
              <span aria-hidden className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent px-2 pb-1.5 pt-6 text-left text-[11.5px] text-white opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
                {p.heading}
              </span>
            </IntentLink>
          </li>
        ))}
      </ul>
      {shown.length === 0 && <p className="py-10 text-center text-[13px] text-[var(--fg-faint)]">이 조건에 맞는 기록이 없어요</p>}
    </div>
  )
}
