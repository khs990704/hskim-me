'use client'
import { useEffect, useState } from 'react'

/**
 * 맨 위로 — 오른쪽 아래 둥근 단추. 화면 반 장쯤 내려가면 나타나고 맨 위 근처에서는 사라진다.
 * 스크롤이 짧은 페이지도 맨 아래에 닿으면 나타난다 (스크롤이 아예 없으면 갈 곳이 없어 나오지 않는다).
 * SiteHeader 가 그리므로 헤더가 있는 페이지(노트 · 목록 · 소개 · 일상)에만 있고, 스크롤이 없는 메인 그래프에는 없다.
 * 누르면 맨 위로 가며 초점도 본문 시작(#main)으로 옮긴다 — 키보드 · 화면 읽기 사용자가 제자리를 잃지 않게.
 */
export default function ToTop() {
  const [show, setShow] = useState(false)

  useEffect(() => {
    let raf = 0
    const check = () => {
      raf = 0
      const y = window.scrollY, h = window.innerHeight
      const bottom = y > 0 && y + h >= document.documentElement.scrollHeight - 4
      setShow(y > h * 0.5 || bottom)
    }
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(check) }
    check()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    return () => { window.removeEventListener('scroll', onScroll); window.removeEventListener('resize', onScroll); if (raf) cancelAnimationFrame(raf) }
  }, [])

  const go = () => {
    const still = matchMedia('(prefers-reduced-motion: reduce)').matches
    window.scrollTo({ top: 0, behavior: still ? 'instant' : 'smooth' })
    document.getElementById('main')?.focus({ preventScroll: true })
  }

  return (
    <button type="button" onClick={go} aria-label="맨 위로" title="맨 위로"
      className="to-top" data-show={show || undefined} tabIndex={show ? 0 : -1} aria-hidden={!show}>
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M12 19V5M5 12l7-7 7 7" />
      </svg>
    </button>
  )
}
