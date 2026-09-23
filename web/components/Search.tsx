'use client'
import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useRouter } from 'next/navigation'
import { search, PAGE_SIZE, type Hit, type SearchDoc } from '../lib/search'
import Highlight from './Highlight'

/** 색인은 한 번만 받아 세션 내내 재사용한다 */
let cachedIndex: SearchDoc[] | null = null
let loading: Promise<SearchDoc[]> | null = null

const loadIndex = () => {
  if (cachedIndex) return Promise.resolve(cachedIndex)
  loading ??= fetch('/search-index.json')
    .then(r => r.json())
    .then((d: SearchDoc[]) => { cachedIndex = d; return d })
    .catch(err => { console.error('[search] 색인 불러오기 실패', err); loading = null; return [] })
  return loading
}

const KIND_LABEL: Record<string, string> = { note: '지식', project: '프로젝트', portfolio: '포트폴리오' }

/**
 * 전체 검색.
 *
 * 색인(1.3MB)은 검색을 처음 열 때만 받는다. 페이지 로딩에는 영향이 없다.
 * 문서가 485개라 매 입력마다 전체를 훑어도 체감되지 않는다.
 */
export default function Search() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [ready, setReady] = useState(false)
  const [q, setQ] = useState('')
  const [hits, setHits] = useState<Hit[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(0)
  const [cursor, setCursor] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLUListElement>(null)
  /**
   * 커서를 마지막으로 움직인 것이 키보드인지.
   *
   * 마우스와 키보드가 같은 커서를 쓰면서 서로를 방해한다.
   *   키보드로 내리면  → 목록이 스크롤되고, 멈춰 있는 마우스 밑으로 항목이
   *                      지나가며 hover 가 터져 선택을 빼앗는다
   *   마우스로 가리키면 → 선택 항목을 화면 안으로 끌어오느라 목록이 밀린다
   *
   * 어느 쪽이 마지막으로 '실제로' 움직였는지 기억해서 둘을 떼어 놓는다.
   * hover 는 마우스가 정말 움직인 뒤에만 받는다.
   */
  const byKeyboard = useRef(false)

  useEffect(() => setMounted(true), [])

  // Cmd/Ctrl + K 로 열고 Esc 로 닫는다
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); setOpen(o => !o) }
      else if (e.key === 'Escape') setOpen(false)
    }
    addEventListener('keydown', onKey)
    return () => removeEventListener('keydown', onKey)
  }, [])

  useEffect(() => {
    if (!open) return
    loadIndex().then(() => setReady(true))
    const t = setTimeout(() => inputRef.current?.focus(), 30)
    const prev = document.body.style.overflow
    const gap = innerWidth - document.documentElement.clientWidth
    document.body.style.overflow = 'hidden'
    if (gap > 0) document.body.style.paddingRight = `${gap}px`
    return () => {
      clearTimeout(t)
      document.body.style.overflow = prev
      document.body.style.paddingRight = ''
    }
  }, [open])

  // 검색어가 바뀌면 첫 쪽으로 돌아간다. 4쪽을 보다가 다른 것을 찾으면
  // 그 검색어의 4쪽이 아니라 처음부터 보여야 한다.
  useEffect(() => { setPage(0) }, [q])

  useEffect(() => {
    if (!cachedIndex) { setHits([]); setTotal(0); return }
    const r = search(cachedIndex, q, page)
    setHits(r.hits)
    setTotal(r.total)
    setCursor(0)
  }, [q, ready, page])

  const pages = Math.ceil(total / PAGE_SIZE)

  /** 쪽을 넘기면서 커서를 어디에 둘지 함께 정한다 */
  const turn = useCallback((to: number, at: 'top' | 'bottom') => {
    if (to < 0 || to >= pages) return
    setPage(to)
    // hits 가 바뀐 뒤에 커서를 옮겨야 한다
    requestAnimationFrame(() => {
      byKeyboard.current = true
      setCursor(at === 'top' ? 0 : Math.min(PAGE_SIZE, total - to * PAGE_SIZE) - 1)
      listRef.current?.parentElement?.scrollTo({ top: 0 })
    })
  }, [pages, total])

  const go = useCallback((hit: Hit) => {
    setOpen(false)
    setQ('')
    router.push('/' + hit.doc.r)
  }, [router])

  const onKeyDown = (e: React.KeyboardEvent) => {
    byKeyboard.current = true
    // 목록 끝에서 한 번 더 누르면 다음 쪽으로 넘어간다.
    // 키보드만 쓰는 사람이 쪽 단추를 찾아 마우스를 잡지 않아도 되게 한다.
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      if (cursor >= hits.length - 1) turn(page + 1, 'top')
      else setCursor(c => c + 1)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      if (cursor === 0) turn(page - 1, 'bottom')
      else setCursor(c => c - 1)
    } else if (e.key === 'Enter' && hits[cursor]) {
      e.preventDefault()
      go(hits[cursor])
    }
  }

  // 키보드로 옮겼을 때만 선택 항목을 화면 안으로 끌어온다.
  //
  // 마우스로 가리킨 항목까지 끌어오면 목록이 커서를 피해 밀려난다. 이미 눈에
  // 보이는 것을 가리켰는데 화면이 움직이는 셈이라, 누르려던 항목이 달아난다.
  useEffect(() => {
    if (!byKeyboard.current) return
    listRef.current?.querySelector('[data-active="true"]')?.scrollIntoView({ block: 'nearest' })
  }, [cursor])

  const panel = (
    // 닫혀 있어도 DOM 에 남는다(열고 닫을 때 애니메이션을 주려고).
    // aria-hidden 만으로는 안의 단추가 탭 순서에 그대로 남아, 키보드로 넘기면
    // 보이지 않는 곳으로 초점이 사라진다. inert 가 초점·클릭·읽기를 함께 막는다.
    <div className={`fixed inset-0 z-[60] ${open ? '' : 'pointer-events-none'}`} inert={!open}>
      <div
        onClick={() => setOpen(false)}
        className={`absolute inset-0 bg-black/55 transition-opacity duration-150 ${open ? 'opacity-100' : 'opacity-0'}`}
      />
      <div
        role="dialog"
        aria-label="검색"
        className={`absolute left-1/2 top-[12vh] w-[min(42rem,calc(100vw-2rem))] -translate-x-1/2 overflow-hidden rounded-xl border border-[var(--line)] bg-[var(--surface)] shadow-2xl transition-all duration-150 ${
          open ? 'translate-y-0 opacity-100' : '-translate-y-2 opacity-0'
        }`}
      >
        <div className="flex items-center gap-2.5 border-b border-[var(--line-soft)] px-4">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9"
               className="shrink-0 text-[var(--fg-faint)]">
            <circle cx="11" cy="11" r="7" /><path d="M20 20l-3.5-3.5" />
          </svg>
          <input
            ref={inputRef}
            value={q}
            onChange={e => setQ(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="제목·본문 전체에서 찾기"
            className="w-full bg-transparent py-3.5 text-[14px] text-[var(--fg)] outline-none placeholder:text-[var(--fg-faint)]"
          />
          <kbd className="hidden shrink-0 rounded border border-[var(--line)] px-1.5 py-0.5 text-[10.5px] text-[var(--fg-faint)] sm:block">
            Esc
          </kbd>
        </div>

        <div
          className="max-h-[60vh] overflow-y-auto"
          // 마우스가 실제로 움직였을 때만 hover 로 선택이 넘어간다.
          // 스크롤에 실려 항목이 지나가는 것은 마우스가 움직인 것이 아니다.
          onMouseMove={() => { byKeyboard.current = false }}
        >
          {!ready && q && (
            <p className="px-4 py-8 text-center text-[13px] text-[var(--fg-faint)]">색인을 불러오는 중…</p>
          )}
          {ready && q && hits.length === 0 && (
            <p className="px-4 py-8 text-center text-[13px] text-[var(--fg-faint)]">결과가 없습니다</p>
          )}
          {!q && (
            <p className="px-4 py-8 text-center text-[12.5px] leading-6 text-[var(--fg-faint)]">
              지식 노트 · 프로젝트 기록 · 포트폴리오 전체에서 찾습니다
              <br />
              <span className="text-[11.5px]">↑↓ 이동 · Enter 열기</span>
            </p>
          )}
          <ul ref={listRef}>
            {hits.map((hit, i) => (
              <li key={hit.doc.r}>
                <button
                  type="button"
                  data-active={i === cursor || undefined}
                  onMouseEnter={() => { if (!byKeyboard.current) setCursor(i) }}
                  onClick={() => go(hit)}
                  className={`block w-full border-l-2 px-4 py-2.5 text-left transition-colors ${
                    i === cursor
                      ? 'border-[var(--accent)] bg-[var(--bg-soft)]'
                      : 'border-transparent hover:bg-[var(--bg-soft)]'
                  }`}
                >
                  <div className="flex items-baseline gap-2">
                    <span className="truncate text-[13.5px] font-medium text-[var(--fg-strong)]">
                      <Highlight text={hit.doc.t} terms={hit.terms} />
                    </span>
                    <span className="shrink-0 text-[10.5px] text-[var(--fg-faint)]">
                      {KIND_LABEL[hit.doc.k] ?? hit.doc.k}
                    </span>
                  </div>
                  <div className="mt-0.5 line-clamp-2 text-[12px] leading-5 text-[var(--fg-dim)]">
                    <Highlight text={hit.snippet} terms={hit.terms} />
                  </div>
                </button>
              </li>
            ))}
          </ul>
        </div>

        {total > 0 && (
          <div className="flex items-center justify-between gap-3 border-t border-[var(--line-soft)] px-4 py-2 text-[11px] text-[var(--fg-faint)]">
            <span className="tabular-nums">{total}개 결과</span>

            {pages > 1 && (
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => turn(page - 1, 'top')}
                  disabled={page === 0}
                  aria-label="이전 쪽"
                  className="grid h-6 w-6 place-items-center rounded transition-colors enabled:hover:bg-[var(--bg-soft)] enabled:hover:text-[var(--fg)] disabled:opacity-30"
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                    <path d="M15 6l-6 6 6 6" />
                  </svg>
                </button>
                <span className="tabular-nums px-0.5">{page + 1} / {pages}</span>
                <button
                  type="button"
                  onClick={() => turn(page + 1, 'top')}
                  disabled={page >= pages - 1}
                  aria-label="다음 쪽"
                  className="grid h-6 w-6 place-items-center rounded transition-colors enabled:hover:bg-[var(--bg-soft)] enabled:hover:text-[var(--fg)] disabled:opacity-30"
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                    <path d="M9 6l6 6-6 6" />
                  </svg>
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        title="검색 (Ctrl+K)"
        // 헤더와 같은 배경이면 입력창처럼 보이지 않는다.
        // 한 단계 눌러 앉힌 배경으로 '여기에 쓸 수 있다' 를 드러낸다.
        className="flex h-8 items-center gap-2 rounded-md border border-[var(--line)] bg-[var(--bg-soft)] px-2.5 text-[12.5px] text-[var(--fg-dim)] transition-colors hover:border-[var(--accent)] hover:bg-[var(--surface)] hover:text-[var(--accent)] sm:w-44 sm:justify-start sm:px-3"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9">
          <circle cx="11" cy="11" r="7" /><path d="M20 20l-3.5-3.5" />
        </svg>
        <span className="sr-only sm:not-sr-only">검색</span>
        <kbd aria-hidden className="ml-auto hidden rounded border border-[var(--line)] px-1 text-[10px] md:inline">Ctrl K</kbd>
      </button>
      {mounted && createPortal(panel, document.body)}
    </>
  )
}
