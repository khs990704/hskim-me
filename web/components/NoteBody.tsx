'use client'
import { useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Diagrams from './Diagrams'
import LinkPreview, { type Preview } from './LinkPreview'

export type { Preview }

/**
 * 본문 HTML 을 주입한다. 이 컴포넌트는 상태를 갖지 않는다.
 * 상태를 두면 리렌더 때 React 가 주입한 HTML 을 되돌려,
 * 변환해 둔 다이어그램이 원본 코드로 돌아간다.
 */
export default function NoteBody({ html, previews }: { html: string; previews: Record<string, Preview> }) {
  const ref = useRef<HTMLDivElement>(null)
  const router = useRouter()

  // 주입된 HTML 안의 내부 링크는 평범한 <a> 라 전체 페이지를 다시 읽는다.
  // 화면이 깜빡이므로 Next 라우터로 넘겨 백링크·사이드 트리와 동작을 맞춘다.
  useEffect(() => {
    const root = ref.current
    if (!root) return

    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
      const a = (e.target as HTMLElement).closest('a') as HTMLAnchorElement | null
      if (!a || a.target === '_blank') return
      const href = a.getAttribute('href')
      if (!href || !href.startsWith('/')) return     // 외부 링크·앵커는 그대로 둔다
      e.preventDefault()
      router.push(href)
    }

    root.addEventListener('click', onClick)
    return () => root.removeEventListener('click', onClick)
  }, [router])

  return (
    <>
      <div ref={ref} className="prose" dangerouslySetInnerHTML={{ __html: html }} />
      <Diagrams scope={ref} trigger={html} />
      <LinkPreview scope={ref} previews={previews} />
    </>
  )
}
