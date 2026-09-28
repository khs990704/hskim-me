'use client'
import { useEffect } from 'react'

/**
 * 이 페이지에 있는 동안 어두운 테마로 고정한다.
 *
 * 첫 방문은 layout 의 테마 스크립트가 처리한다. 밝은 테마로 다른 문서를 보다가
 * 링크로 넘어오면 그 스크립트가 다시 돌지 않으므로 여기서 맞추고, 떠날 때 되돌린다.
 */
export default function ForceDark() {
  useEffect(() => {
    const root = document.documentElement
    root.dataset.theme = 'dark'
    // 되돌릴 값은 "들어오기 직전 값" 이 아니라 이용자의 설정이다.
    // 이 페이지로 바로 들어오면 테마 스크립트가 이미 dark 로 바꿔 두었기 때문이다.
    return () => {
      let t: string | null = null
      try { t = localStorage.getItem('theme') } catch {}
      root.dataset.theme = t ?? (matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark')
    }
  }, [])
  return null
}
