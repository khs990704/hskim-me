'use client'
import { useEffect, useState } from 'react'

export type Preview = { title: string; description: string }

/**
 * 위키링크 호버 미리보기.
 *
 * 본문(NoteBody)과 분리된 컴포넌트다. 미리보기 상태를 본문 쪽에 두면
 * 마우스를 올릴 때마다 본문이 리렌더되고, 그때 React 가 주입한 HTML 을
 * 원래대로 되돌려 변환해 둔 다이어그램이 코드로 돌아간다.
 */
export default function LinkPreview({
  scope,
  previews,
}: {
  scope: React.RefObject<HTMLElement | null>
  previews: Record<string, Preview>
}) {
  const [pop, setPop] = useState<{ x: number; y: number; data: Preview } | null>(null)

  useEffect(() => {
    const root = scope.current
    if (!root) return
    let timer: ReturnType<typeof setTimeout>

    const routeOf = (a: HTMLAnchorElement) => {
      const href = a.getAttribute('href') ?? ''
      if (!href.startsWith('/')) return null
      try { return decodeURIComponent(href.slice(1)).split('#')[0] } catch { return href.slice(1).split('#')[0] }
    }

    const onOver = (e: Event) => {
      const a = (e.target as HTMLElement).closest('a.internal') as HTMLAnchorElement | null
      if (!a) return
      const route = routeOf(a)
      const data = route ? previews[route] : null
      if (!data) return
      clearTimeout(timer)
      timer = setTimeout(() => {
        const r = a.getBoundingClientRect()
        const below = r.bottom + 8
        const flip = below + 180 > innerHeight
        setPop({ x: r.left, y: flip ? r.top - 8 : below, data })
      }, 260)
    }
    // mouseout 은 링크 '안쪽' 요소 사이를 오갈 때도 발생한다.
    // (<a> 안에 <code>, <strong> 이 들어 있는 경우가 흔하다)
    // 그대로 닫으면 미리보기가 깜빡인다. 링크 밖으로 나갔을 때만 닫는다.
    const onOut = (e: Event) => {
      const a = (e.target as HTMLElement).closest('a.internal')
      if (!a) return
      const to = (e as MouseEvent).relatedTarget as HTMLElement | null
      if (to && a.contains(to)) return
      clearTimeout(timer)
      setPop(null)
    }
    const onScroll = () => setPop(p => (p ? null : p))

    root.addEventListener('mouseover', onOver)
    root.addEventListener('mouseout', onOut)
    addEventListener('scroll', onScroll, { passive: true })
    return () => {
      clearTimeout(timer)
      root.removeEventListener('mouseover', onOver)
      root.removeEventListener('mouseout', onOut)
      removeEventListener('scroll', onScroll)
    }
  }, [scope, previews])

  if (!pop) return null

  const flipped = pop.y < innerHeight / 2 ? false : true
  return (
    <div
      className="pointer-events-none fixed z-50 w-[22rem] max-w-[calc(100vw-2rem)] rounded-lg border border-[var(--line)] bg-[var(--surface)] p-3 shadow-xl"
      style={{
        left: Math.max(8, Math.min(pop.x, innerWidth - 360)),
        top: pop.y,
        transform: flipped ? 'translateY(-100%)' : undefined,
      }}
    >
      <div className="text-[13.5px] font-semibold text-[var(--fg-strong)]">{pop.data.title}</div>
      <div className="mt-1 line-clamp-4 text-[12.5px] leading-6 text-[var(--fg-dim)]">{pop.data.description}</div>
    </div>
  )
}
