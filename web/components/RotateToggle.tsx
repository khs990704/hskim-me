'use client'
import { useEffect, useState } from 'react'

/**
 * 메인 그래프의 자동 회전을 멈추고 다시 돌리는 단추 (KWCAG 2.2.2 정지 기능).
 *
 * 5초 넘게 계속 움직이는 화면은 이용자가 멈출 수 있어야 한다.
 * 움직임 줄이기 설정을 켠 환경에서는 처음부터 돌지 않으므로 단추도 두지 않는다.
 */
export default function RotateToggle() {
  const [show, setShow] = useState(false)
  const [paused, setPaused] = useState(false)

  useEffect(() => { setShow(!matchMedia('(prefers-reduced-motion: reduce)').matches) }, [])
  if (!show) return null

  const toggle = () => {
    const next = !paused
    setPaused(next)
    dispatchEvent(new CustomEvent('graph-rotate', { detail: next }))
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={paused}
      className="pointer-events-auto mt-1 rounded px-1 py-0.5 text-[11.5px] text-[#78839c] underline decoration-dotted underline-offset-2 hover:text-[#c3cbd8]"
    >
      {paused ? '회전 다시 시작' : '회전 멈춤'}
    </button>
  )
}
