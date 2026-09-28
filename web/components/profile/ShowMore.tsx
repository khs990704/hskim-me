'use client'
import { Children, useId, useState, type ReactNode } from 'react'

/**
 * 처음에는 앞의 limit 개만 보이고, 단추로 전부 펼친다.
 * 항목이 limit 개 이하면 단추를 두지 않는다.
 */
export default function ShowMore({ limit, className, children, unit = '개' }: {
  limit: number
  className?: string
  unit?: string
  children: ReactNode
}) {
  const items = Children.toArray(children)
  const [open, setOpen] = useState(false)
  const id = useId()
  const hidden = items.length - limit
  return (
    <>
      <ul id={id} className={className}>{open ? items : items.slice(0, limit)}</ul>
      {hidden > 0 && <MoreButton open={open} hidden={hidden} unit={unit} controls={id} onClick={() => setOpen(o => !o)} />}
    </>
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
