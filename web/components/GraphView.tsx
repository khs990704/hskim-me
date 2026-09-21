'use client'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import dynamic from 'next/dynamic'
import { useRouter } from 'next/navigation'
import { colorOf } from '../lib/graph-colors'

// three.js 를 쓰므로 서버에서 렌더할 수 없고, 메인 화면에서만 필요하다.
const ForceGraph3D = dynamic(() => import('react-force-graph-3d'), { ssr: false })

type GNode = {
  id: string
  title: string
  kind: string
  group: string
  degree: number
  hub?: boolean
  pos: [number, number, number]
  // force-graph 가 채우는 좌표
  x?: number; y?: number; z?: number
  fx?: number; fy?: number; fz?: number
}
type GLink = { source: string; target: string; hub?: boolean }
type Graph = { nodes: GNode[]; links: GLink[] }

const hasWebGL = () => {
  try {
    const c = document.createElement('canvas')
    return !!(c.getContext('webgl2') || c.getContext('webgl'))
  } catch { return false }
}

export default function GraphView({ onReady }: { onReady?: (n: number) => void }) {
  const router = useRouter()
  const fgRef = useRef<any>(null)
  const [graph, setGraph] = useState<Graph | null>(null)
  const [size, setSize] = useState({ w: 0, h: 0 })
  const [hover, setHover] = useState<GNode | null>(null)
  const [supported, setSupported] = useState<boolean | null>(null)

  useEffect(() => {
    setSupported(hasWebGL())
    const resize = () => setSize({ w: innerWidth, h: innerHeight })
    resize()
    addEventListener('resize', resize)
    return () => removeEventListener('resize', resize)
  }, [])

  useEffect(() => {
    if (supported === false) return
    fetch('/graph.json')
      .then(r => r.json())
      .then((g: Graph) => {
        // 좌표는 빌드 시점에 계산해 뒀다. 고정해서 시뮬레이션을 돌리지 않는다.
        // 첫 프레임부터 완성된 배치가 나오고, 새로고침해도 같은 자리에 있다.
        for (const n of g.nodes) {
          ;[n.x, n.y, n.z] = n.pos
          ;[n.fx, n.fy, n.fz] = n.pos
        }
        setGraph(g)
        onReady?.(g.nodes.length)
      })
      .catch(() => setGraph({ nodes: [], links: [] }))
  }, [supported, onReady])

  // 진입 시 아주 느린 자동 회전. 사용자가 조작하면 멈춘다.
  useEffect(() => {
    if (!graph || !fgRef.current) return
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const controls = fgRef.current.controls?.()
    if (!controls) return
    controls.autoRotate = true
    controls.autoRotateSpeed = 0.28      // 1회전 약 90초 (기획 §7 절제 원칙)
    const stop = () => { controls.autoRotate = false }
    const el = fgRef.current.renderer?.().domElement
    el?.addEventListener('pointerdown', stop, { once: true })
    el?.addEventListener('wheel', stop, { once: true })
    return () => { el?.removeEventListener('pointerdown', stop); el?.removeEventListener('wheel', stop) }
  }, [graph])

  // 이웃 관계 — 호버 시 연결된 것만 남기고 나머지는 어둡게
  const neighbors = useMemo(() => {
    const m = new Map<string, Set<string>>()
    if (!graph) return m
    for (const l of graph.links) {
      const s = typeof l.source === 'string' ? l.source : (l.source as any).id
      const t = typeof l.target === 'string' ? l.target : (l.target as any).id
      if (!m.has(s)) m.set(s, new Set())
      if (!m.has(t)) m.set(t, new Set())
      m.get(s)!.add(t)
      m.get(t)!.add(s)
    }
    return m
  }, [graph])

  const dim = useCallback((id: string) => {
    if (!hover) return false
    return hover.id !== id && !neighbors.get(hover.id)?.has(id)
  }, [hover, neighbors])

  if (supported === false) return null
  if (!graph || !size.w) return null

  return (
    <>
      <ForceGraph3D
        ref={fgRef}
        graphData={graph}
        width={size.w}
        height={size.h}
        backgroundColor="#03040a"
        showNavInfo={false}
        controlType="orbit"
        cooldownTicks={0}
        enableNodeDrag={false}
        // 최근접 이웃 거리 중앙값이 16.6 이다. 기본값(4)이면 큰 노드의 반지름이
        // 30 을 넘어 이웃을 덮어버려 군집이 보이지 않는다.
        // 가장 큰 노드가 이웃 거리의 절반쯤 되도록 맞춘다.
        nodeRelSize={1.35}
        // nodeVal 은 '부피'로 해석된다. 반지름은 세제곱근이라
        // 값을 그대로 쓰면 연결 4개와 121개의 차이가 1.6배밖에 안 난다.
        // 원하는 반지름을 세제곱해 넘겨 차이를 눈에 보이게 만든다.
        nodeVal={(n: any) => Math.pow(0.9 + Math.sqrt(n.degree) * 0.62, 3)}
        nodeResolution={10}
        nodeColor={(n: any) => (dim(n.id) ? '#2a3140' : colorOf(n.group, n.kind))}
        nodeOpacity={0.92}
        nodeLabel={(n: any) => `<div style="
            font-family: Pretendard, sans-serif; font-size: 12.5px;
            background: rgba(10,13,20,.92); color: #e8edf5;
            border: 1px solid #2a3344; border-radius: 6px;
            padding: 5px 9px; white-space: nowrap;">
            ${n.title}<span style="color:#6b7688"> · 연결 ${n.degree}</span>
          </div>`}
        // 허브(MOC) 링크는 분류 안의 거의 모든 문서를 향해 뻗어 나가 화면을 덮는다.
        // 평소에는 감추고, 그 노드에 마우스를 올렸을 때만 보여 준다.
        linkVisibility={(l: any) => {
          if (!l.hub) return true
          if (!hover) return false
          const s = typeof l.source === 'string' ? l.source : l.source.id
          const t = typeof l.target === 'string' ? l.target : l.target.id
          return s === hover.id || t === hover.id
        }}
        linkColor={(l: any) => {
          const s = typeof l.source === 'string' ? l.source : l.source.id
          const t = typeof l.target === 'string' ? l.target : l.target.id
          if (hover && (s === hover.id || t === hover.id)) return '#7dd3fc'
          return hover ? '#161c27' : '#1e2836'
        }}
        linkWidth={(l: any) => {
          const s = typeof l.source === 'string' ? l.source : l.source.id
          const t = typeof l.target === 'string' ? l.target : l.target.id
          return hover && (s === hover.id || t === hover.id) ? 0.8 : 0.25
        }}
        linkOpacity={0.5}
        onNodeHover={(n: any) => setHover(n ?? null)}
        onNodeClick={(n: any) => router.push('/' + n.id)}
      />
      {hover && (
        <div className="pointer-events-none fixed bottom-6 left-1/2 z-20 -translate-x-1/2 rounded-full border border-[#2a3344] bg-[#0a0d14]/90 px-4 py-2 text-[13px] text-[#e8edf5] backdrop-blur">
          {hover.title}
          <span className="ml-2 text-[#6b7688]">클릭해서 열기</span>
        </div>
      )}
    </>
  )
}
