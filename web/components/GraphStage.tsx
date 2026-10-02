'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import dynamic from 'next/dynamic'

// three.js(압축 100KB)는 그래프를 그릴 때만 받는다. 정적으로 가져오면 메인 페이지 묶음에 들어가는데,
// Next 가 그 묶음을 일상 목록 · 404 HTML 에도 함께 싣는 일이 있어 그 페이지들까지 무거워졌다 (2026-10-02 측정)
const GraphView = dynamic(() => import('./GraphView'), { ssr: false })

const hasWebGL = () => {
  try {
    const c = document.createElement('canvas')
    return !!(c.getContext('webgl2') || c.getContext('webgl'))
  } catch { return false }
}

/**
 * 메인 화면의 그래프 영역.
 *
 * WebGL 을 못 쓰는 환경에서는 그래프 대신 텍스트 경로를 안내한다 (D-07).
 * 오버레이(이름·소개·진입 버튼)는 서버에서 렌더되므로 어떤 경우에도 남는다.
 */
export default function GraphStage() {
  const [webgl, setWebgl] = useState<boolean | null>(null)
  const [count, setCount] = useState(0)

  useEffect(() => { setWebgl(hasWebGL()) }, [])

  if (webgl === null) return null

  if (!webgl) {
    return (
      <div className="absolute inset-0 grid place-items-center px-6 text-center">
        <div className="max-w-md">
          <p className="text-[13.5px] leading-7 text-[#8b95a7]">
            이 브라우저에서는 3D 그래프를 표시할 수 없습니다.
            <br />
            같은 내용을 목록으로 보실 수 있습니다.
          </p>
          <Link
            href="/index-all"
            className="mt-5 inline-block rounded-md border border-[#2a3344] px-4 py-2 text-[13.5px] text-[#e8edf5] hover:border-[#7dd3fc] hover:text-[#7dd3fc]"
          >
            전체 목록으로
          </Link>
        </div>
      </div>
    )
  }

  return (
    <>
      {/*
        캔버스는 보조기기가 읽을 수 없다. 무엇이 그려져 있는지 말로 알리고,
        같은 내용을 볼 수 있는 곳(전체 목록)을 알려 준다.
      */}
      <div role="img" aria-label="지식 그래프 — 문서를 점으로, 문서 사이의 링크를 선으로 그린 3D 그림입니다. 같은 문서는 전체 목록에서 볼 수 있습니다.">
        <GraphView onReady={setCount} />
      </div>
      {count === 0 && (
        <div className="pointer-events-none absolute inset-0 grid place-items-center">
          <span className="text-[12.5px] text-[#78839c]">지식 그래프를 불러오는 중…</span>
        </div>
      )}
    </>
  )
}
