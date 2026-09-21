'use client'
import { useEffect, useState } from 'react'
import type { TocItem } from '../lib/content'

/**
 * variant
 *   side   — 넓은 화면의 우측 고정 목차
 *   inline — 좁은 화면에서 본문 위에 접어 두는 목차.
 *            우측 칼럼이 사라지는 폭에서도 목차에 닿을 수 있어야 한다.
 */
export default function Toc({ items, variant = 'side' }: { items: TocItem[]; variant?: 'side' | 'inline' }) {
  const [active, setActive] = useState('')

  useEffect(() => {
    if (variant !== 'side' || !items.length) return
    const els = items.map(i => document.getElementById(i.id)).filter(Boolean) as HTMLElement[]
    if (!els.length) return
    const io = new IntersectionObserver(
      entries => {
        const visible = entries.filter(e => e.isIntersecting)
        if (visible.length) setActive(visible[0].target.id)
      },
      { rootMargin: '-72px 0px -70% 0px', threshold: 0 },
    )
    els.forEach(el => io.observe(el))
    return () => io.disconnect()
  }, [items, variant])

  if (items.length < 2) return null

  const list = (
    <ul className="space-y-[2px] border-l border-[var(--line-soft)]">
      {items.map((it, i) => (
        <li key={`${it.id}-${i}`}>
          <a
            href={`#${it.id}`}
            className={`-ml-px block border-l py-[2px] transition-colors ${
              active === it.id
                ? 'border-[var(--accent)] text-[var(--accent)]'
                : 'border-transparent text-[var(--fg-dim)] hover:text-[var(--fg)]'
            }`}
            style={{ paddingLeft: `${(it.depth - 1) * 10 + 10}px` }}
          >
            {it.text}
          </a>
        </li>
      ))}
    </ul>
  )

  if (variant === 'inline') {
    return (
      <details className="mb-8 rounded-lg border border-[var(--line-soft)] bg-[var(--bg-soft)] px-3 py-2 text-[12.5px] leading-6 xl:hidden">
        <summary className="cursor-pointer list-none font-medium text-[var(--fg-dim)] marker:content-['']">
          목차 <span className="text-[var(--fg-faint)]">({items.length})</span>
        </summary>
        <div className="mt-2">{list}</div>
      </details>
    )
  }

  return (
    <nav className="text-[12.5px] leading-6">
      <div className="mb-2 font-medium tracking-wide text-[var(--fg-faint)]">목차</div>
      {list}
    </nav>
  )
}
