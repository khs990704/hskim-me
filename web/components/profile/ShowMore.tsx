'use client'
import { Children, useId, useRef, useState, type ReactNode } from 'react'

const reduced = () => typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches

/**
 * 접고 펼 때 — 높이가 부드럽게 바뀌고, 접으면 그 섹션을 화면 가운데로 옮긴다.
 * 접는 동안 아래 내용이 줄어들어 보던 자리를 잃지 않게 하려는 것이다.
 */
export function useCollapse() {
  const [open, setOpen] = useState(false)
  const anchor = useRef<HTMLDivElement>(null)
  const toggle = () => {
    const next = !open
    setOpen(next)
    if (!next) {
      // 높이 변화(0.35초)가 끝난 뒤의 모습으로 가운데를 맞춘다
      setTimeout(() => anchor.current?.closest('section')?.scrollIntoView({ block: 'center', behavior: reduced() ? 'auto' : 'smooth' }), reduced() ? 0 : 360)
    }
  }
  return { open, toggle, anchor }
}

/** 접힌 동안 보이지 않는 나머지. 접혀 있으면 초점도 받지 않는다 (inert) */
export function CollapseRest({ open, id, className, children }: { open: boolean; id: string; className?: string; children: ReactNode }) {
  return (
    <div className="hud-collapse" data-open={open} inert={!open}>
      <div className="hud-collapse-inner">
        <ul id={id} className={className}>{children}</ul>
      </div>
    </div>
  )
}

/** 처음에는 앞의 limit 개만 보이고, 단추로 전부 펼친다. limit 개 이하면 단추를 두지 않는다 */
export default function ShowMore({ limit, className, children, unit = '개' }: {
  limit: number
  className?: string
  unit?: string
  children: ReactNode
}) {
  const items = Children.toArray(children)
  const { open, toggle, anchor } = useCollapse()
  const id = useId()
  const hidden = items.length - limit
  return (
    <div ref={anchor}>
      <ul className={className}>{items.slice(0, limit)}</ul>
      {hidden > 0 && (
        <>
          <CollapseRest open={open} id={id} className={`${className ?? ''} hud-collapse-list`}>{items.slice(limit)}</CollapseRest>
          <MoreButton open={open} hidden={hidden} unit={unit} controls={id} onClick={toggle} />
        </>
      )}
    </div>
  )
}

export function MoreButton({ open, hidden, unit = '개', controls, onClick }: {
  open: boolean; hidden: number; unit?: string; controls: string; onClick: () => void
}) {
  return (
    <div className="mt-4 flex justify-center">
      <button type="button" className="hud-more" aria-expanded={open} aria-controls={controls} onClick={onClick}>
        <span aria-hidden className="pixel">{open ? '▲' : '▼'}</span>
        {open ? '접기' : `전체 보기 (${hidden}${unit} 더)`}
      </button>
    </div>
  )
}
