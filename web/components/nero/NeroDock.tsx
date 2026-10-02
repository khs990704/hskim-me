'use client'
import NeroSprite from './NeroSprite'
import { openNero, closeNero, useNero } from '../../lib/nero-store'

/** 다른 페이지 — 오른쪽 아래, 맨 위로 단추 위에 정박한 우주선. 누르면 대화창 (P8 §4) */
export default function NeroDock() {
  const { open, state } = useNero()
  return (
    <button type="button" className="nero-dock" onClick={() => (open ? closeNero() : openNero())}
      aria-label={open ? 'Nero 대화창 닫기' : 'Nero 에게 묻기'} aria-expanded={open} title="Nero 에게 묻기">
      <NeroSprite state={state} />
    </button>
  )
}
