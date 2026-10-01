'use client'
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { smoothDetails } from '../lib/smooth-details'

/**
 * 전체 목록(/index-all) 위에 붙는 찾기 칸 + 분야 칩 줄.
 * 목록은 서버가 이미 그렸으므로 여기서는 #index-list 안의 li[data-q] 를 숨기고 보이기만 한다
 * (590편을 다시 데이터로 싣지 않는다). 찾는 동안은 맞는 묶음을 펼치고, 지우면 펼침 상태를 되돌린다.
 * 거르기 · 스크롤 맞추기는 useLayoutEffect — 화면에 그리기 전에 끝내야 목록이 줄어드는 순간 위로 튀었다 돌아오는 게 보이지 않는다.
 */
export default function IndexFilter({ children }: { children: React.ReactNode }) {
  const [q, setQ] = useState('')
  const [hits, setHits] = useState<number | null>(null)
  const saved = useRef<Map<HTMLDetailsElement, boolean> | null>(null)
  const mark = useRef<HTMLDivElement>(null)
  const [chips, setChips] = useState(false)   // 모바일에서 분야 칩 펼침
  const pin = useRef<number | null>(null)     // 찾는 동안 머물 스크롤 위치 (찾기 칸이 헤더 밑에 붙은 자리)

  useLayoutEffect(() => {
    const root = document.getElementById('index-list')
    if (!root) return
    const words = q.trim().toLowerCase().split(/\s+/).filter(Boolean)
    const subs = [...root.querySelectorAll<HTMLDetailsElement>('details.idx-sub')]

    if (!words.length) {
      root.style.minHeight = ''
      delete root.dataset.searching
      root.querySelectorAll<HTMLElement>('[hidden]').forEach(e => { e.hidden = false })
      root.querySelectorAll<HTMLElement>('[data-hit]').forEach(e => { delete e.dataset.hit })
      if (saved.current) { for (const [d, open] of saved.current) d.open = open; saved.current = null }
      setHits(null)
      pin.current = null
      return
    }
    // 찾기를 시작할 때 한 번 — 사용자가 펼쳐 둔 묶음을 기억해 둔다
    if (!saved.current) saved.current = new Map(subs.map(d => [d, d.open]))
    root.dataset.searching = ''

    // 문서 하나 = [data-dq] 하나 (카드 · 케이스 카드 안 링크 · 큰 케이스 머리). 맞으면 data-hit
    let total = 0
    for (const e of root.querySelectorAll<HTMLElement>('[data-dq]')) {
      const hay = e.dataset.dq ?? ''
      const ok = words.every(w => hay.includes(w))
      if (ok) { e.dataset.hit = ''; total++ } else delete e.dataset.hit
    }
    const count = (el: Element) => el.querySelectorAll('[data-hit]').length
    // 안쪽부터 — 카드, 큰 케이스, 깊은 경로 묶음, 하위 분류, 분야
    for (const c of root.querySelectorAll<HTMLElement>('li.idx-card')) c.hidden = !(c.matches('[data-hit]') || count(c))
    for (const c of root.querySelectorAll<HTMLElement>('.idx-case, .idx-rest')) c.hidden = !count(c)
    for (const d of subs) {
      const n = count(d)
      d.hidden = !n
      d.open = n > 0
      const c = d.querySelector('.idx-n')
      if (c) c.textContent = String(n)
    }
    for (const s of root.querySelectorAll<HTMLElement>('section.idx-field')) {
      const n = count(s)
      s.hidden = !n
      const c = s.querySelector('.idx-fn')
      if (c) c.textContent = String(n)
    }
    setHits(total)

    // 찾기 칸이 헤더 밑에 붙어 있을 때(스크롤을 내린 상태) — 목록이 줄어 페이지 맨 위로 튀지 않게,
    // 칸을 붙은 자리에 그대로 두고 결과가 바로 밑에서 시작하게 한다. 목록에 화면 높이만큼 최소 높이를 줘야 그 자리에 머물 수 있다
    const m = mark.current, bar = m?.nextElementSibling as HTMLElement | null
    if (m && bar) {
      const stick = parseFloat(getComputedStyle(bar).top) || 0
      if (m.getBoundingClientRect().top < stick + 2) {
        root.style.minHeight = '100vh'
        pin.current = m.getBoundingClientRect().top + window.scrollY - stick
        window.scrollTo({ top: pin.current, behavior: 'instant' })
      } else pin.current = null
    }
  }, [q])

  // 찾은 수가 바뀌어 다시 그린 뒤(분야 칩 줄이 사라지는 등) 한 번 더 — 브라우저가 입력 칸을 보이게 하려고 옮긴 몇 px 까지 되돌린다
  useLayoutEffect(() => {
    if (pin.current !== null && Math.abs(window.scrollY - pin.current) > 0.5) window.scrollTo({ top: pin.current, behavior: 'instant' })
  })

  // 하위 분류 펼치기 · 접기를 부드럽게 (lib/smooth-details)
  useEffect(() => {
    const root = document.getElementById('index-list')
    return root ? smoothDetails(root, 'details.idx-sub') : undefined
  }, [])

  // 찾기를 지우면 묶음 수를 원래 값으로 — 서버가 그린 값을 처음에 받아 둔다
  useEffect(() => {
    const els = document.querySelectorAll<HTMLElement>('#index-list .idx-n, #index-list .idx-fn')
    els.forEach(e => { e.dataset.n = e.textContent ?? '' })
  }, [])
  useEffect(() => {
    if (q.trim()) return
    document.querySelectorAll<HTMLElement>('#index-list .idx-n, #index-list .idx-fn').forEach(e => { if (e.dataset.n) e.textContent = e.dataset.n })
  }, [q])

  return (
    <>
    {/* 찾기 칸의 원래 자리 — 이보다 위로 스크롤되었으면 칸이 헤더 밑에 붙은 상태 */}
    <div ref={mark} aria-hidden />
    <div className="idx-bar">
      <div className="flex items-center gap-3">
        <input
          type="search"
          value={q}
          onChange={e => setQ(e.target.value)}
          placeholder="제목 · 설명 · 태그로 찾기"
          aria-label="전체 목록에서 찾기"
          aria-describedby="idx-hits"
          className="min-w-0 flex-1 rounded-md border border-[var(--line)] bg-[var(--bg-soft)] px-3 py-1.5 text-[14px] text-[var(--fg)] placeholder:text-[var(--fg-faint)] focus:border-[var(--accent)] focus:outline-none sm:max-w-[420px]"
        />
        {/* 오른쪽 칸은 폭을 고정한다 — 찾은 수 · 분야 단추가 바뀌어도 찾기 칸 너비가 움직이지 않게 */}
        <div className="flex w-[4.5rem] shrink-0 justify-end sm:justify-start">
          <span id="idx-hits" role="status" className="text-[12.5px] tabular-nums text-[var(--fg-faint)]">
            {hits === null ? '' : `${hits}편`}
          </span>
          {hits === null && (
            <button type="button" onClick={() => setChips(o => !o)} aria-expanded={chips} aria-controls="idx-chips"
              className="rounded-md border border-[var(--line)] px-2.5 py-1 text-[12.5px] text-[var(--fg-dim)] sm:hidden">
              분야 {chips ? '▴' : '▾'}
            </button>
          )}
        </div>
      </div>
      {hits === 0 && <p className="mt-2 text-[13px] text-[var(--fg-dim)]">맞는 문서가 없습니다. 다른 낱말로 찾아 보세요.</p>}
      {/* 찾는 중에는 분야 이동이 의미가 없어 칩을 감춘다. 모바일은 칩 줄이 화면을 많이 덮어 눌러야 펼친다 */}
      <div id="idx-chips" className="idx-chips" data-open={chips || undefined} hidden={hits !== null}
        onClick={e => { if ((e.target as HTMLElement).closest('a')) setChips(false) }}>
        <div><div className="pt-2.5">{children}</div></div>
      </div>
    </div>
    </>
  )
}
