'use client'
import { useEffect, useState } from 'react'
import dynamic from 'next/dynamic'
import { useNero } from '../../lib/nero-store'

// 대화창 코드는 처음 열 때만 받는다 — 묻지 않는 방문자의 첫 화면을 무겁게 하지 않는다
const NeroPanel = dynamic(() => import('./NeroPanel'), { ssr: false })

/** 루트 layout 에 붙는다. 페이지를 옮겨도 남아 대화가 이어진다 */
export default function NeroRoot() {
  const { open } = useNero()
  const [used, setUsed] = useState(false)
  useEffect(() => { if (open) setUsed(true) }, [open])
  return used ? <NeroPanel /> : null
}
