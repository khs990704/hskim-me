'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import GraphView from './GraphView'

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
      <GraphView onReady={setCount} />
      {count === 0 && (
        <div className="pointer-events-none absolute inset-0 grid place-items-center">
          <span className="text-[12.5px] text-[#4a5468]">지식 그래프를 불러오는 중…</span>
        </div>
      )}
    </>
  )
}
