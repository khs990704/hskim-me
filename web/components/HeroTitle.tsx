'use client'
import { useLayoutEffect, useRef } from 'react'

/**
 * 메인 첫 화면 글 (2026-10-08) — 소개 스탯창과 결이 같은 HUD 틀(모서리 괄호 · 깜빡이는 커서) 안에 표어.
 * 시안 A(별 + 큰 이름) · B(HUD + 이름) · C(두 줄 표어)를 비교해, B 의 틀에 C 의 표어를 얹고 사이트 이름은 맨 윗줄에 넣었다.
 * 높이가 화면 폭마다 달라 별자리 안내판(.con-panel)이 글 바로 밑에 오도록 아래 끝을 --hero-bottom 으로 알린다.
 */
export default function HeroTitle({ docs }: { docs: number }) {
  const ref = useRef<HTMLDivElement>(null)
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const set = () => document.documentElement.style.setProperty('--hero-bottom', `${Math.round(el.getBoundingClientRect().bottom)}px`)
    set()
    const ro = new ResizeObserver(set); ro.observe(el)
    return () => ro.disconnect()
  }, [])

  return (
    <div ref={ref} className="hero pointer-events-none absolute left-5 top-5 z-10 sm:left-8 sm:top-8">
      <p className="hero-mono">// HSKIM.ME · {docs.toLocaleString('ko-KR')} STARS<span className="hero-caret" aria-hidden /></p>
      <h1 className="hero-title">내 기억을 별처럼<br /><span>이어 둔 곳</span></h1>
      <p className="hero-sub">지식 노트 · 프로젝트 · 일상</p>
    </div>
  )
}
