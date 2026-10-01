'use client'
import { useEffect } from 'react'
import { smoothDetails } from '../../lib/smooth-details'

/** 서버가 그린 <details> 들을 부드럽게 여닫게 한다 (화면에는 아무것도 그리지 않는다). within 안의 selector 에 맞는 것만 */
export default function SmoothDetails({ within, selector }: { within: string; selector: string }) {
  useEffect(() => {
    const root = document.querySelector(within)
    return root ? smoothDetails(root, selector) : undefined
  }, [within, selector])
  return null
}
