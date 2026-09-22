'use client'
import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

/** tree.json 의 노드. 키를 짧게 쓴 이유는 477개 × 반복이라 용량 차이가 크기 때문. */
export type Node = { n: string; k: string; r?: string; children?: Node[] }

let cached: Node[] | null = null

/** 좁은 화면에서는 헤더에 들어가지 않는 진입 경로. 서랍 맨 위에 모은다 */
const DRAWER_LINKS = [
  { href: '/about', label: '소개' },
  { href: '/index-all', label: '전체 목록' },
  { href: '/portfolio', label: '포트폴리오' },
]

/** 현재 항목이 이 구간 밖에 있을 때만 스크롤한다 (컨테이너 높이 비율) */
const COMFORT_TOP = 0.25
const COMFORT_BOTTOM = 0.75

/**
 * Vault 폴더 구조를 그대로 보여준다 (요구사항 5·6).
 *
 * 트리는 서버에서 렌더하지 않고 /tree.json 을 받아 그린다.
 * 서버 렌더하면 477개 항목이 모든 페이지 HTML 에 박혀 페이지당 ~95KB 가 된다.
 *
 *   mode="tree"    넓은 화면의 고정 트리
 *   mode="trigger" 좁은 화면의 서랍 + 여는 버튼
 */
export default function Sidebar({ mode = 'tree' }: { mode?: 'tree' | 'trigger' }) {
  const pathname = usePathname()
  const current = (() => {
    try { return decodeURIComponent(pathname).replace(/^\//, '') } catch { return pathname.replace(/^\//, '') }
  })()

  const [tree, setTree] = useState<Node[] | null>(cached)
  const [open, setOpen] = useState<Set<string>>(new Set())
  const [drawer, setDrawer] = useState(false)
  const navRef = useRef<HTMLElement>(null)
  const revealedFor = useRef<string>('')
  const [mounted, setMounted] = useState(false)

  useEffect(() => setMounted(true), [])

  useEffect(() => {
    if (cached) return
    fetch('/tree.json').then(r => r.json()).then((t: Node[]) => { cached = t; setTree(t) }).catch(() => {})
  }, [])

  // 현재 문서까지의 경로를 펼친다.
  // 문서가 아닌 화면(전체 목록 등)으로 가면 전부 접는다 — 맥락이 없으므로.
  useEffect(() => {
    if (!tree) return
    const trailKeys: string[] = []
    const dig = (nodes: Node[], trail: string[]): boolean => {
      for (const n of nodes) {
        if (n.r === current) {
          trail.forEach((_, i) => trailKeys.push(trail.slice(0, i + 1).join('/')))
          return true
        }
        if (n.children && dig(n.children, [...trail, n.k])) {
          trailKeys.push([...trail, n.k].join('/'))
          return true
        }
      }
      return false
    }
    const found = dig(tree, [])
    setOpen(found ? prev => new Set([...prev, ...trailKeys]) : new Set())
    setDrawer(false)
  }, [tree, current])

  /**
   * 현재 문서를 사이드 트리에서 보이게 한다.
   *
   * 화면 이동 직후 한 번만 동작한다. 사용자가 폴더를 여닫는 동안에도 따라오면
   * 보고 있던 위치가 자꾸 튕겨 나간다.
   *
   * 이미 보이더라도 너무 위·아래 끝에 걸쳐 있으면 가운데로 끌어온다.
   * scrollIntoView 는 페이지 전체를 움직일 수 있어 컨테이너만 직접 조정한다.
   */
  const reveal = useCallback(() => {
    const nav = navRef.current
    if (!nav) return false
    const el = nav.querySelector<HTMLElement>('[data-active="true"]')
    if (!el) return false

    let box: HTMLElement | null = nav.parentElement
    while (box && getComputedStyle(box).overflowY === 'visible') box = box.parentElement
    if (!box) return false

    const top = box.scrollTop + (el.getBoundingClientRect().top - box.getBoundingClientRect().top)
    const rel = top - box.scrollTop
    const h = box.clientHeight
    if (rel >= h * COMFORT_TOP && rel <= h * COMFORT_BOTTOM) return true   // 편한 위치면 둔다

    const max = box.scrollHeight - h
    box.scrollTo({ top: Math.max(0, Math.min(max, top - h / 2)), behavior: 'smooth' })
    return true
  }, [])

  useEffect(() => {
    if (!tree || revealedFor.current === current) return
    const id = requestAnimationFrame(() => { if (reveal()) revealedFor.current = current })
    return () => cancelAnimationFrame(id)
  }, [tree, current, open, reveal])

  // 서랍이 열려 있을 때: Esc 로 닫고, 뒤쪽 본문은 스크롤되지 않게 한다.
  //
  // 본문 스크롤을 잠그면 스크롤바가 사라지면서 그 폭만큼 본문이 오른쪽으로 밀린다.
  // 사라진 폭을 그대로 여백으로 채워 화면이 움직이지 않게 한다.
  useEffect(() => {
    if (mode !== 'trigger' || !drawer) return

    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setDrawer(false) }
    addEventListener('keydown', onKey)

    const body = document.body
    const gap = innerWidth - document.documentElement.clientWidth   // 스크롤바 폭
    const prevOverflow = body.style.overflow
    const prevPadding = body.style.paddingRight
    body.style.overflow = 'hidden'
    if (gap > 0) body.style.paddingRight = `${gap}px`

    return () => {
      removeEventListener('keydown', onKey)
      body.style.overflow = prevOverflow
      body.style.paddingRight = prevPadding
    }
  }, [mode, drawer])

  const Item = ({ node, trail, depth }: { node: Node; trail: string[]; depth: number }) => {
    const key = [...trail, node.k].join('/')
    const isFolder = !!node.children?.length
    const expanded = open.has(key)
    const active = node.r === current

    if (!isFolder) {
      return (
        <Link
          href={'/' + node.r}
          data-active={active || undefined}
          className={`block truncate rounded py-[3px] pr-2 text-[13.5px] leading-6 transition-colors ${
            active
              ? 'bg-[var(--accent-dim)] font-medium text-[var(--accent)]'
              : 'text-[var(--fg-dim)] hover:bg-[var(--bg-soft)] hover:text-[var(--fg)]'
          }`}
          style={{ paddingLeft: `${depth * 12 + 8}px` }}
          title={node.n}
        >
          {node.n}
        </Link>
      )
    }

    return (
      <div>
        <button
          onClick={() => setOpen(p => { const s = new Set(p); s.has(key) ? s.delete(key) : s.add(key); return s })}
          aria-expanded={expanded}
          className="flex w-full items-center gap-1 truncate rounded py-[3px] pr-2 text-left text-[13.5px] leading-6 text-[var(--fg)] hover:bg-[var(--bg-soft)]"
          style={{ paddingLeft: `${depth * 12 + 2}px` }}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4"
               className={`shrink-0 text-[var(--fg-faint)] transition-transform ${expanded ? 'rotate-90' : ''}`}>
            <path d="M9 6l6 6-6 6" />
          </svg>
          <span className="truncate">{node.n}</span>
        </button>
        {expanded && node.children!.map(c => (
          <Item key={c.k} node={c} trail={[...trail, node.k]} depth={depth + 1} />
        ))}
      </div>
    )
  }

  const body = tree ? (
    <nav ref={navRef} className="px-2 py-4">
      {tree.map(n => <Item key={n.k} node={n} trail={[]} depth={0} />)}
    </nav>
  ) : (
    <div className="space-y-2 px-4 py-5" aria-hidden>
      {Array.from({ length: 9 }).map((_, i) => (
        <div key={i} className="h-3.5 rounded bg-[var(--bg-soft)]" style={{ width: `${55 + ((i * 13) % 40)}%` }} />
      ))}
    </div>
  )

  if (mode === 'tree') return body

  // ── 좁은 화면: 밀려 나오는 서랍 ────────────────────────────────────────
  // 닫히는 경우 셋 — 항목 클릭 / 버튼 다시 누르기 / 빈 곳 클릭 (+ Esc)
  //
  // 서랍은 body 로 빼서 그린다. 이 컴포넌트는 헤더 안에 있고 헤더에는
  // backdrop-blur 가 걸려 있는데, backdrop-filter 가 있으면 그 안의
  // position:fixed 요소가 화면이 아니라 헤더를 기준으로 배치된다.
  // 그대로 두면 서랍이 헤더 높이 안에 갇힌다.
  const drawerUI = (
    <div className={`fixed inset-0 z-50 lg:hidden ${drawer ? '' : 'pointer-events-none'}`}>
      <div
        onClick={() => setDrawer(false)}
        className={`absolute inset-0 bg-black/50 transition-opacity duration-200 ${drawer ? 'opacity-100' : 'opacity-0'}`}
      />
      <div
        className={`absolute inset-y-0 left-0 flex w-72 max-w-[85vw] flex-col border-r border-[var(--line)] bg-[var(--bg)] shadow-2xl transition-transform duration-200 ease-out ${
          drawer ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex h-14 shrink-0 items-center justify-between border-b border-[var(--line-soft)] px-4">
          <span className="text-[13px] font-medium text-[var(--fg-dim)]">문서 목록</span>
          <button
            onClick={() => setDrawer(false)}
            aria-label="닫기"
            className="grid h-7 w-7 place-items-center rounded text-[var(--fg-dim)] hover:bg-[var(--bg-soft)]"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>
        {/* 항목을 누르면 닫는다. 같은 문서를 다시 눌러 경로가 안 바뀌는 경우도 포함 */}
        <div className="flex shrink-0 flex-wrap gap-1.5 border-b border-[var(--line-soft)] px-3 py-2.5 text-[12.5px]">
          {DRAWER_LINKS.map(l => (
            <Link
              key={l.href}
              href={l.href}
              onClick={() => setDrawer(false)}
              className="rounded-md border border-[var(--line)] px-2.5 py-1.5 text-[var(--fg-dim)] hover:border-[var(--accent)] hover:text-[var(--accent)]"
            >
              {l.label}
            </Link>
          ))}
        </div>

        <div
          className="min-h-0 flex-1 overflow-y-auto"
          onClick={e => { if ((e.target as HTMLElement).closest('a')) setDrawer(false) }}
        >
          {body}
        </div>
      </div>
    </div>
  )

  return (
    <>
      <button
        onClick={() => setDrawer(o => !o)}
        aria-label={drawer ? '문서 목록 닫기' : '문서 목록 열기'}
        aria-expanded={drawer}
        className={`flex h-8 items-center gap-1.5 rounded-md border px-2 text-[12.5px] transition-colors lg:hidden ${
          drawer
            ? 'border-[var(--accent)] text-[var(--accent)]'
            : 'border-[var(--line)] text-[var(--fg-dim)] hover:border-[var(--accent)] hover:text-[var(--accent)]'
        }`}
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9">
          <path d="M4 6h16M4 12h16M4 18h16" />
        </svg>
        문서
      </button>

      {mounted && createPortal(drawerUI, document.body)}
    </>
  )
}
