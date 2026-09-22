'use client'
import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useRouter } from 'next/navigation'
import { search, type Hit, type SearchDoc } from '../lib/search'
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
  const [cursor, setCursor] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLUListElement>(null)

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

  useEffect(() => {
    if (!cachedIndex) { setHits([]); return }
    setHits(search(cachedIndex, q))
    setCursor(0)
  }, [q, ready])

  const go = useCallback((hit: Hit) => {
    setOpen(false)
    setQ('')
    router.push('/' + hit.doc.r)
  }, [router])

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setCursor(c => Math.min(c + 1, hits.length - 1)) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setCursor(c => Math.max(c - 1, 0)) }
    else if (e.key === 'Enter' && hits[cursor]) { e.preventDefault(); go(hits[cursor]) }
  }

  // 키보드로 이동할 때 선택 항목이 화면에 남아 있게
  useEffect(() => {
    listRef.current?.querySelector('[data-active="true"]')?.scrollIntoView({ block: 'nearest' })
  }, [cursor])

  const panel = (
    <div className={`fixed inset-0 z-[60] ${open ? '' : 'pointer-events-none'}`} aria-hidden={!open}>
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

        <div className="max-h-[60vh] overflow-y-auto">
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
                  onMouseEnter={() => setCursor(i)}
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

        {hits.length > 0 && (
          <div className="border-t border-[var(--line-soft)] px-4 py-2 text-[11px] text-[var(--fg-faint)]">
            {hits.length}개 결과
          </div>
        )}
      </div>
    </div>
  )

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        aria-label="검색"
        title="검색 (Ctrl+K)"
        // 헤더와 같은 배경이면 입력창처럼 보이지 않는다.
        // 한 단계 눌러 앉힌 배경으로 '여기에 쓸 수 있다' 를 드러낸다.
        className="flex h-8 items-center gap-2 rounded-md border border-[var(--line)] bg-[var(--bg-soft)] px-2.5 text-[12.5px] text-[var(--fg-dim)] transition-colors hover:border-[var(--accent)] hover:bg-[var(--surface)] hover:text-[var(--accent)] sm:w-44 sm:justify-start sm:px-3"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9">
          <circle cx="11" cy="11" r="7" /><path d="M20 20l-3.5-3.5" />
        </svg>
        <span className="hidden sm:inline">검색</span>
        <kbd className="ml-auto hidden rounded border border-[var(--line)] px-1 text-[10px] md:inline">Ctrl K</kbd>
      </button>
      {mounted && createPortal(panel, document.body)}
    </>
  )
}
