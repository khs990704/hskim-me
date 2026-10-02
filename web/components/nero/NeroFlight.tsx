'use client'
import NeroSprite from './NeroSprite'
import { openNero, useNero } from '../../lib/nero-store'

/**
 * 메인 — 별 사이를 천천히 오가는 우주선 (P8 §4).
 * 좌우 왕복(.nero-fly · .nero-face) · 위아래 흔들림(.nero-bob) 두 겹. 가리키거나 초점이 가면 멈춰 누르기 쉽게 한다.
 * 좁은 화면은 왼쪽 아래에 정박해 흔들리기만 한다. 대화창이 열려 있으면 숨는다 (대화창 머리에 같은 Nero 가 있다).
 * 움직임 줄이기면 제자리에 멈춰 있다.
 */
export default function NeroFlight() {
  const { open, state } = useNero()
  return (
    <div className="nero-fly" data-hidden={open || undefined}>
      <button type="button" className="nero-bob" onClick={() => openNero()} aria-label="Nero 에게 묻기" title="Nero 에게 묻기" tabIndex={open ? -1 : 0}>
        <span className="nero-fly-name" aria-hidden>NERO</span>
        {/* 돌아 날 때 그림만 뒤집는다 (이름표는 그대로) */}
        <span className="nero-face"><NeroSprite state={state} /></span>
      </button>
    </div>
  )
}
