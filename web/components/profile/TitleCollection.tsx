'use client'
import { useEffect, useId, useMemo, useRef, useState } from 'react'
import type { Achievement } from '../../lib/profile'
import { DialogShell } from './Dialog'
import { GroupIcon } from './icons'
import { CollapseRest, MoreButton, useCollapse } from './ShowMore'

/** 접힌 상태에서 보이는 수 — 넓은 화면 2줄 */
const COLLAPSED = 12
const STATE_RANK: Record<Achievement['state'], number> = { done: 0, progress: 1, locked: 2, unknown: 2 }
const RARITY_RANK: Record<Achievement['rarity'], number> = { legendary: 0, epic: 1, rare: 2, common: 3 }

const STATES = [
  { key: 'all', label: '전체' },
  { key: 'done', label: '획득' },
  { key: 'progress', label: '진행 중' },
  { key: 'locked', label: '미획득' },
] as const
type Filter = (typeof STATES)[number]['key']

const STATE_LABEL: Record<Achievement['state'], string> = { done: '획득', progress: '진행 중', locked: '미획득', unknown: '판정 보류' }
const fmtDate = (d?: string | null) => (d ? d.replace(/-/g, '.') : null)
const num = (n?: number | null) => (n ?? 0).toLocaleString('ko-KR')

/** 얻기 전의 숨김 칭호는 이름도 조건도 보이지 않는다 */
const veiled = (a: Achievement) => a.hidden && a.state !== 'done'

/**
 * 칭호 도감 — 업적을 달성하면 칭호를 얻는다 (기획 §4.5.1).
 * 배지를 누르면 조건 · 진행도 · 얻은 날짜가 열린다. 못 얻은 칭호도 진행도와 함께 보인다.
 */
export default function TitleCollection({ items, equipped }: { items: Achievement[]; equipped: string }) {
  const [filter, setFilter] = useState<Filter>('all')
  const [group, setGroup] = useState('all')
  const [open, setOpen] = useState<Achievement | null>(null)
  const ref = useRef<HTMLDialogElement>(null)

  const groups = useMemo(() => {
    const m = new Map<string, string>()
    for (const a of items) m.set(a.group, a.groupLabel)
    return [...m]
  }, [items])
  const count = (k: Filter) => items.filter(a => (k === 'all' ? true : k === 'locked' ? a.state === 'locked' || a.state === 'unknown' : a.state === k)).length
  const { open: expanded, toggle, anchor } = useCollapse()
  const listId = useId()
  // 얻은 것 → 진행 중 → 못 얻은 것, 같은 상태에서는 희귀도 높은 순.
  // 접혀 있어도 얻은 전설 · 영웅 칭호가 먼저 보이게. 같은 칸은 칭호 표의 순서를 지킨다.
  const shown = items
    .map((a, i) => ({ a, i }))
    .filter(({ a }) =>
      (group === 'all' || a.group === group) &&
      (filter === 'all' || (filter === 'locked' ? a.state === 'locked' || a.state === 'unknown' : a.state === filter)))
    .sort((x, y) => STATE_RANK[x.a.state] - STATE_RANK[y.a.state] || RARITY_RANK[x.a.rarity] - RARITY_RANK[y.a.rarity] || x.i - y.i)
    .map(({ a }) => a)
  const first = shown.slice(0, COLLAPSED)
  const rest = shown.slice(COLLAPSED)

  const show = (a: Achievement) => setOpen(a)
  const badge = (a: Achievement) => {
          const v = veiled(a)
          const pct = a.target ? Math.min(100, Math.round(((a.value ?? 0) / a.target) * 100)) : a.state === 'done' ? 100 : 0
          return (
            <li key={a.id}>
              <button
                type="button"
                onClick={() => show(a)}
                aria-haspopup="dialog"
                className="hud-badge"
                data-rarity={a.rarity}
                data-state={a.state}
                aria-label={`${v ? '숨겨진 칭호' : a.title}, ${a.rarityLabel}, ${STATE_LABEL[a.state]}${a.state === 'progress' && a.target ? `, ${num(a.value)} / ${num(a.target)}` : ''}${a.title === equipped ? ', 장착 중' : ''}`}
              >
                <span className="hud-badge-gem"><GroupIcon group={v ? 'hidden' : a.group} /></span>
                <span className="pixel hud-badge-name">{v ? '???' : a.title}</span>
                <span className="hud-badge-meta">{a.rarityLabel}</span>
                {/* 막대 자리는 항상 둔다 — 얻은 칭호만 낮아지지 않게 (얻은 칭호는 보이지 않게) */}
                <span className="hud-badge-bar" aria-hidden data-empty={a.state === 'done' || undefined}><span style={{ width: `${pct}%` }} /></span>
              </button>
            </li>
          )
        }
  // 고른 항목이 정해지면 바로 연다. 다음 화면 갱신(requestAnimationFrame)을 기다리면
  // WebKit 에서 창이 늦게 열려, 그사이 누른 Esc 가 먹히지 않았다.
  useEffect(() => { if (open && !ref.current?.open) ref.current?.showModal() }, [open])

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center gap-2">
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="상태로 거르기">
          {STATES.map(s => (
            <button
              key={s.key}
              type="button"
              aria-pressed={filter === s.key}
              onClick={() => setFilter(s.key)}
              className="hud-chip"
            >
              {s.label} <span className="tabular-nums opacity-70">{count(s.key)}</span>
            </button>
          ))}
        </div>
        <label className="ml-auto flex items-center gap-2 text-[12.5px] text-[var(--fg-dim)]">
          <span>계열</span>
          <select value={group} onChange={e => setGroup(e.target.value)} className="hud-select">
            <option value="all">전체</option>
            {groups.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
          </select>
        </label>
      </div>

      <p className="sr-only" aria-live="polite">{shown.length}개 칭호</p>

      <div ref={anchor}>
        <ul className="grid grid-cols-3 gap-2.5 sm:grid-cols-4 xl:grid-cols-6">{first.map(badge)}</ul>
        {rest.length > 0 && <CollapseRest lazy open={expanded} id={listId} className="grid grid-cols-3 gap-2.5 sm:grid-cols-4 xl:grid-cols-6 hud-collapse-list">{rest.map(badge)}</CollapseRest>}
      </div>
      {shown.length === 0 && <p className="py-6 text-center text-[13px] text-[var(--fg-faint)]">이 조건에 맞는 칭호가 없습니다</p>}
      {shown.length > COLLAPSED && (
        <MoreButton open={expanded} hidden={shown.length - COLLAPSED} controls={listId} onClick={toggle} />
      )}

      <DialogShell ref={ref} onClose={() => setOpen(null)} title={open ? (veiled(open) ? '숨겨진 칭호' : `「${open.title}」`) : ''}>
        {open && (
          <dl className="hud-dl">
            <div><dt>희귀도</dt><dd><span className="hud-rarity" data-rarity={open.rarity}>{open.rarityLabel}</span></dd></div>
            <div><dt>계열</dt><dd>{open.groupLabel}</dd></div>
            <div><dt>조건</dt><dd>{veiled(open) ? '??? — 얻으면 공개됩니다' : open.cond}</dd></div>
            <div><dt>상태</dt><dd>{STATE_LABEL[open.state]}{open.title === equipped && ' · 장착 중'}</dd></div>
            {open.target !== undefined && open.state !== 'done' && open.state !== 'unknown' && (
              <div>
                <dt>진행도</dt>
                <dd>
                  <span className="tabular-nums">{num(open.value)} / {num(open.target)}</span>
                  <span className="hud-meter mt-1.5" aria-hidden><span style={{ width: `${Math.min(100, ((open.value ?? 0) / open.target) * 100)}%` }} /></span>
                </dd>
              </div>
            )}
            {open.state === 'done' && (
              <div><dt>얻은 날</dt><dd>{fmtDate(open.date) ?? '기록 없음 (기록을 쌓기 전에 달성)'}</dd></div>
            )}
            {open.note && <div><dt>기록</dt><dd>{open.note}</dd></div>}
          </dl>
        )}
      </DialogShell>
    </div>
  )
}
