'use client'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import type { ComponentProps } from 'react'

/**
 * 누를 낌새가 보일 때만 미리 받는 링크 — 마우스를 올리거나, 손가락이 닿거나, 키보드 초점이 올 때.
 *
 * Next.js 기본은 화면 근처에 들어온 링크를 전부 미리 받는다. 헤더 · 서랍 · 트리처럼 모든 페이지에 있는
 * 링크에서는 이게 첫 화면의 통신을 잡아먹었다: 닫힌 서랍도 화면 바로 옆에 있어 "보이는 링크"로 잡혀,
 * 휴대폰 소개 페이지가 전체 목록(54KB) 등 80KB 를 먼저 받느라 프로필 사진이 늦었다 (2026-09-30 측정).
 * 링크에 닿은 뒤 누르기까지 보통 100ms 이상이라, 그때 받기 시작해도 이동은 거의 그대로 빠르다.
 */
export default function IntentLink({ href, onMouseEnter, onTouchStart, onFocus, ...rest }: ComponentProps<typeof Link>) {
  const router = useRouter()
  const warm = () => { if (typeof href === 'string') router.prefetch(href) }
  return (
    <Link
      {...rest}
      href={href}
      prefetch={false}
      onMouseEnter={e => { warm(); onMouseEnter?.(e) }}
      onTouchStart={e => { warm(); onTouchStart?.(e) }}
      onFocus={e => { warm(); onFocus?.(e) }}
    />
  )
}
