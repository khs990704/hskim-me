'use client'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import dynamic from 'next/dynamic'
import { useRouter } from 'next/navigation'
import { colorOf } from '../lib/graph-colors'
import { createNebula, createStarfield } from '../lib/nebula'
import { createStar } from '../lib/star'

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
  /**
   * ForceGraph3D 는 동적 import 라 첫 렌더에는 인스턴스가 없다.
   * useRef 는 반응형이 아니라서, 그래프 데이터가 먼저 도착하면
   * 성운·회전 설정 effect 가 `fgRef.current === null` 로 그냥 빠져나가고
   * 다시 실행되지 않는다. 새로고침 때마다 배경이 안 붙던 원인이다.
   * 콜백 ref 로 인스턴스 도착을 상태로 알린다.
   */
  const [fgReady, setFgReady] = useState(false)
  const [graph, setGraph] = useState<Graph | null>(null)
  const [size, setSize] = useState({ w: 0, h: 0 })
  const [hover, setHover] = useState<GNode | null>(null)
  const [supported, setSupported] = useState<boolean | null>(null)
  const [leaving, setLeaving] = useState(false)
  /** 데스크톱에서 이름표를 붙일 화면 좌표 (노드에 고정) */
  const [anchor, setAnchor] = useState<{ x: number; y: number } | null>(null)
  /**
   * 입력 장치. 마우스와 터치는 이름표 위치·동작이 다르다.
   *
   * 좌표(anchor) 유무로 판단하면 안 된다. 데스크톱에서도 호버 첫 프레임에는
   * 좌표가 아직 없어서, 그 한 프레임 동안 터치용 하단 상자가 번쩍인다.
   */
  const [coarse, setCoarse] = useState<boolean | null>(null)

  useEffect(() => {
    const mq = matchMedia('(pointer: coarse)')
    const sync = () => setCoarse(mq.matches)
    sync()
    mq.addEventListener('change', sync)
    return () => mq.removeEventListener('change', sync)
  }, [])
  // 노드는 커스텀 스프라이트라 nodeColor 로 색이 바뀌지 않는다.
  // 호버 강조는 재질을 직접 건드린다.
  const materials = useRef(new Map<string, any>())

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
        const noPos = g.nodes.filter(n => !n.pos).length
        if (noPos) {
          // 좌표가 없으면 시뮬레이션이 돌긴 하지만 배치가 매번 달라진다.
          // 조용히 넘어가지 않고 알린다 — 파이프라인이 덜 돈 것이다.
          console.warn(`[graph] 좌표 없는 노드 ${noPos}/${g.nodes.length}개. \`npm run content\` 를 실행하세요.`)
        }
        for (const n of g.nodes) {
          if (!n.pos) continue
          ;[n.x, n.y, n.z] = n.pos
          ;[n.fx, n.fy, n.fz] = n.pos
        }
        setGraph(g)
        onReady?.(g.nodes.length)
      })
      .catch(err => {
        // 전에는 여기서 조용히 빈 그래프로 넘어가, 화면만 비고 원인은 안 보였다
        console.error('[graph] 불러오기 실패', err)
        setGraph({ nodes: [], links: [] })
      })
  }, [supported, onReady])

  // 인스턴스가 붙을 때까지 기다린다.
  // 이 라이브러리는 콜백 ref 를 받지 않아 다음 프레임부터 확인한다.
  useEffect(() => {
    if (!graph || fgReady) return
    let raf = 0
    const check = () => {
      if (fgRef.current) { setFgReady(true); return }
      raf = requestAnimationFrame(check)
    }
    raf = requestAnimationFrame(check)
    return () => cancelAnimationFrame(raf)
  }, [graph, fgReady])

  // 성운 배경 · 별먼지 · bloom 후처리
  useEffect(() => {
    if (!graph || !fgReady || !fgRef.current) return
    const fg = fgRef.current
    const scene = fg.scene?.()
    if (!scene) return

    let disposed = false
    const cleanups: (() => void)[] = []

    ;(async () => {
      const THREE = await import('three')
      const { UnrealBloomPass } = await import('three/examples/jsm/postprocessing/UnrealBloomPass.js')
      if (disposed) return

      const nebula = createNebula()
      const stars = createStarfield()
      scene.add(nebula, stars)

      // bloom — 노드가 빛나 보이게 한다.
      // 강도(1.15)가 세서 노드가 번져 보인다는 지적을 받아 낮췄다.
      // threshold 를 올려 밝은 노드만 번지고 배경·연결선은 번지지 않게 한다.
      //   강도 0.62 · 반경 0.42 · 문턱 0.34
      // 노드가 가산 블렌딩 스프라이트라 이미 밝다. bloom 을 세게 주면 번짐만 남는다.
      const composer = fg.postProcessingComposer?.()
      let bloom: any = null
      if (composer) {
        bloom = new UnrealBloomPass(new THREE.Vector2(size.w, size.h), 0.62, 0.42, 0.34)
        composer.addPass(bloom)
      }

      // 성운을 아주 느리게 흘린다
      const mat = nebula.material as any
      let raf = 0
      const t0 = performance.now()
      const still = matchMedia('(prefers-reduced-motion: reduce)').matches
      const tick = () => {
        mat.uniforms.uTime.value = still ? 0 : (performance.now() - t0) / 1000
        raf = requestAnimationFrame(tick)
      }
      tick()

      cleanups.push(() => {
        cancelAnimationFrame(raf)
        scene.remove(nebula, stars)
        nebula.geometry.dispose(); (nebula.material as any).dispose()
        stars.geometry.dispose(); (stars.material as any).dispose()
        if (composer && bloom) { composer.removePass?.(bloom); bloom.dispose?.() }
      })
    })()

    return () => { disposed = true; cleanups.forEach(f => f()) }
  }, [graph, fgReady, size.w, size.h])

  // 진입 시 아주 느린 자동 회전. 사용자가 조작하면 멈춘다.
  useEffect(() => {
    if (!graph || !fgReady || !fgRef.current) return
    const controls = fgRef.current.controls?.()
    if (!controls) return

    // 화면 중앙이 아니라 커서가 가리키는 지점을 향해 확대·축소한다.
    // 중앙 기준이면 보려던 노드가 화면 밖으로 밀려난다.
    // 움직임 설정과 무관하게 항상 적용한다.
    controls.zoomToCursor = true

    // 줌 한계. 없으면 한없이 멀어져 점 하나가 되고, 되돌아오는 데 한참 걸린다.
    // 그래프 반경이 500 이므로 그 안팎으로 잡는다.
    controls.minDistance = 40
    controls.maxDistance = 1700

    // 처음 들어왔을 때 그래프 전체가 화면에 들어오게 맞춘다
    const fit = setTimeout(() => fgRef.current?.zoomToFit?.(800, 70), 120)

    // 허공을 더블클릭하면 처음 배치로 돌아온다.
    // (노드는 한 번 클릭하면 이동하므로 더블클릭이 겹치지 않는다)
    const canvas = fgRef.current.renderer?.().domElement as HTMLElement | undefined
    const reset = () => fgRef.current?.zoomToFit?.(700, 70)
    canvas?.addEventListener('dblclick', reset)

    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return
    controls.autoRotate = true
    controls.autoRotateSpeed = 0.28      // 1회전 약 90초 (기획 §7 절제 원칙)

    // 조작하는 동안만 멈춘다.
    // 전에는 한 번 건드리면 영구히 멈춰서, 클릭 한 번에 화면이 죽은 것처럼 보였다.
    //
    // 복귀까지 2.5초로 둔 이유 —
    //   짧으면(1초 내외) 노드 이름을 읽고 판단하는 도중에 다시 돌기 시작한다.
    //   길면(5초 이상) 화면이 죽은 것처럼 느껴져 주변 움직임의 효과가 사라진다.
    //   회전이 1회전 90초로 매우 느려 복귀 자체는 튀지 않는다.
    const RESUME_MS = 2500
    let idle: ReturnType<typeof setTimeout>
    const pause = () => {
      controls.autoRotate = false
      clearTimeout(idle)
      idle = setTimeout(() => { controls.autoRotate = true }, RESUME_MS)
    }
    const onMove = (e: PointerEvent) => { if (e.buttons !== 0) pause() }

    const el = fgRef.current.renderer?.().domElement as HTMLElement | undefined
    el?.addEventListener('pointerdown', pause)
    el?.addEventListener('pointerup', pause)
    el?.addEventListener('pointermove', onMove)
    el?.addEventListener('wheel', pause, { passive: true })
    return () => {
      clearTimeout(idle)
      clearTimeout(fit)
      canvas?.removeEventListener('dblclick', reset)
      el?.removeEventListener('pointerdown', pause)
      el?.removeEventListener('pointerup', pause)
      el?.removeEventListener('pointermove', onMove)
      el?.removeEventListener('wheel', pause)
    }
  }, [graph, fgReady])

  /**
   * 노드에 마우스를 올린 동안에는 회전을 멈춘다.
   *
   * 드래그·휠만 감지하면, 이름을 읽으려고 마우스를 올린 사이에도 화면이 계속 돌아
   * 보려던 노드가 커서에서 벗어난다. 읽는 중에는 멈춰 있어야 한다.
   */
  useEffect(() => {
    if (!fgReady || !fgRef.current) return
    const controls = fgRef.current.controls?.()
    if (!controls) return
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return

    if (hover) {
      controls.autoRotate = false
      return
    }
    const t = setTimeout(() => { controls.autoRotate = true }, 2500)
    return () => clearTimeout(t)
  }, [hover, fgReady])

  /**
   * 이름표를 노드 옆에 붙인다 (마우스 전용).
   *
   * 화면 아래에 띄우면 노드는 위쪽에 있는데 이름은 맨 아래라, 시선을 옮기지 않으면
   * 무엇을 가리키는지 알 수 없다. 노드 옆이면 눈이 움직일 필요가 없다.
   *
   * 커서를 따라다니게 하면 손떨림에 흔들리므로 노드의 화면 좌표에 고정한다.
   * 카메라가 계속 도니 매 프레임 다시 계산한다.
   */
  useEffect(() => {
    if (!hover || !fgReady || !fgRef.current || coarse !== false) { setAnchor(null); return }

    let raf = 0
    const follow = () => {
      const p = fgRef.current?.graph2ScreenCoords?.(hover.x ?? 0, hover.y ?? 0, hover.z ?? 0)
      if (p) setAnchor({ x: p.x, y: p.y })
      raf = requestAnimationFrame(follow)
    }
    raf = requestAnimationFrame(follow)
    return () => cancelAnimationFrame(raf)
  }, [hover, fgReady, coarse])

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

  /**
   * 노드 생성기.
   *
   * 반드시 고정된 함수여야 한다. 인라인 화살표 함수로 넘기면 렌더마다
   * 새 함수가 되어 라이브러리가 476개 스프라이트를 통째로 다시 만든다.
   * 마우스를 움직일 때마다 화면 전체가 깜빡이던 원인이 이것이었다.
   *
   * 구체로 그리면 표면 음영 때문에 '공'으로 보인다. 별은 표면이 없다.
   * 카메라를 향한 스프라이트에 중심핵·헤일로·회절을 그려 점광원처럼 만든다.
   */
  const makeStar = useCallback((n: any) => {
    const radius = 0.9 + Math.sqrt(n.degree) * 0.62
    const star = createStar(colorOf(n.group, n.kind), radius * 1.35)
    materials.current.set(n.id, star.material)
    return star
  }, [])

  // 호버 시 이웃만 남기고 나머지를 어둡게 한다 (재질을 직접 갱신)
  useEffect(() => {
    for (const [id, mat] of materials.current) {
      const isDim = hover && hover.id !== id && !neighbors.get(hover.id)?.has(id)
      mat.opacity = isDim ? 0.18 : 1
      mat.needsUpdate = true
    }
  }, [hover, neighbors])

  /** 노드 열기 — 카메라가 다가간 뒤 이동한다 */
  const openNode = useCallback((n: GNode) => {
    if (leaving) return
    const href = '/' + n.id
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) { router.push(href); return }
    setLeaving(true)
    // 자동 회전과 궤도 컨트롤이 계속 돌면 카메라가 흔들려 매끄럽지 않다.
    const controls = fgRef.current?.controls?.()
    if (controls) { controls.autoRotate = false; controls.enabled = false }
    const r = Math.hypot(n.x ?? 0, n.y ?? 0, n.z ?? 0) || 1
    const k = 1 + 55 / r
    fgRef.current?.cameraPosition({ x: (n.x ?? 0) * k, y: (n.y ?? 0) * k, z: (n.z ?? 0) * k }, n, 820)
    setTimeout(() => router.push(href), 700)
  }, [leaving, router])

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
        nodeThreeObject={makeStar}
        // 커서를 따라다니는 툴팁은 그래프를 가리고, 터치에서는 손가락에 덮인다.
        // 이름은 화면 아래 고정 위치에 한 곳에서만 보여 준다.
        nodeLabel={() => ''}
        // 허브(MOC) 링크는 분류 안의 거의 모든 문서를 향해 뻗어 나가 화면을 덮는다.
        // 평소에는 감추고, 그 노드에 마우스를 올렸을 때만 보여 준다.
        linkVisibility={(l: any) => {
          if (!l.hub) return true
          if (!hover) return false
          const s = typeof l.source === 'string' ? l.source : l.source.id
          const t = typeof l.target === 'string' ? l.target : l.target.id
          return s === hover.id || t === hover.id
        }}
        // 선은 평소에 거의 보이지 않아야 한다.
        // 3288개가 동시에 눈에 들어오면 별이 묻힌다. 구조는 '있다는 것'만 암시하고,
        // 실제로 읽는 건 노드에 마우스를 올렸을 때다.
        // 투명도는 rgba 로 링크마다 따로 준다 (linkOpacity 는 전역이라 구분이 안 된다).
        linkColor={(l: any) => {
          const s = typeof l.source === 'string' ? l.source : l.source.id
          const t = typeof l.target === 'string' ? l.target : l.target.id
          if (hover && (s === hover.id || t === hover.id)) return 'rgba(126,192,228,0.5)'
          return hover ? 'rgba(74,94,122,0.04)' : 'rgba(92,122,164,0.13)'
        }}
        linkWidth={(l: any) => {
          const s = typeof l.source === 'string' ? l.source : l.source.id
          const t = typeof l.target === 'string' ? l.target : l.target.id
          return hover && (s === hover.id || t === hover.id) ? 0.7 : 0.18
        }}
        linkOpacity={1}
        // 시냅스 신호 — 고른 노드의 경로에서만 흐른다.
        // 평소에도 일부 링크에 흘렸더니 '왜 얘만 반짝이지' 하는 불규칙함만 남았다.
        // 신호는 '지금 보고 있는 연결' 을 알려주는 신호여야 한다.
        // 신호는 '지금 보고 있는 연결' 을 뜻한다.
        //
        // MOC 링크에는 흘리지 않는다. 일부러 뺀 것이다.
        // MOC 는 분류 목록이라 그 링크는 '실제 연관' 이 아니라 '목록 소속' 이다.
        // 거기에 신호를 흘리면 있지도 않은 흐름을 암시하게 된다.
        // (연결이 121개까지 있어 화면이 어지러워지는 문제도 있다)
        linkDirectionalParticles={(l: any) => {
          if (!hover || l.hub) return 0
          const s = typeof l.source === 'string' ? l.source : l.source.id
          const t = typeof l.target === 'string' ? l.target : l.target.id
          return s === hover.id || t === hover.id ? 2 : 0
        }}
        linkDirectionalParticleWidth={1.1}
        linkDirectionalParticleSpeed={0.004}
        linkDirectionalParticleColor={() => '#7fb8d8'}
        onNodeHover={(n: any) => {
          // 터치에서는 호버 이벤트가 오지 않는다. 탭으로 고른 상태를 지우지 않는다.
          if (coarse) return
          setHover(n ?? null)
        }}
        // 빈 곳을 누르면 선택 해제
        onBackgroundClick={() => setHover(null)}
        // 카메라가 노드로 다가가는 동안 화면을 완전히 덮은 뒤 넘어간다.
        //
        // 처음에는 70%만 덮고 620ms 에 이동했는데, 화면이 덜 덮인 상태에서
        // 페이지가 바뀌어 '뚝 끊기는' 느낌이 났다. 어중간하게 가리면
        // 전환을 감추지도 못하고 기다리게만 한다.
        // 완전히 덮고, 대신 전체 시간을 줄여 답답하지 않게 한다.
        onNodeClick={(n: any) => {
          // 터치에는 '마우스를 올린다' 가 없다.
          // 첫 탭으로 고르고(이름·이웃 강조), 같은 노드를 다시 탭하면 이동한다.
          if (coarse && hover?.id !== n.id) {
            setHover(n)
            return
          }
          openNode(n)
        }}
      />
      {/* 마우스 — 노드 옆에 붙는다 */}
      {hover && !leaving && coarse === false && anchor && (
        <div
          className="pointer-events-none fixed z-20 max-w-[18rem] rounded-lg border border-[#2a3344] bg-[#0a0d14]/92 px-3 py-1.5 text-[12.5px] leading-snug text-[#e8edf5] backdrop-blur"
          style={{
            left: Math.min(anchor.x + 16, innerWidth - 300),
            top: Math.max(8, anchor.y - 14),
          }}
        >
          <div className="line-clamp-2">{hover.title}</div>
          <div className="mt-0.5 text-[11px] text-[#6b7688]">클릭해서 열기</div>
        </div>
      )}

      {/* 터치 — 손가락에 가리지 않도록 화면 아래에 고정 */}
      {hover && !leaving && coarse === true && (
        <button
          type="button"
          onClick={() => openNode(hover)}
          className="tap-open fixed bottom-16 left-1/2 z-20 w-[calc(100vw-2rem)] max-w-sm -translate-x-1/2 rounded-xl border border-[#2a3344] bg-[#0a0d14]/92 px-5 py-2 text-center text-[13px] text-[#e8edf5] backdrop-blur"
        >
          <span className="line-clamp-2 leading-snug">{hover.title}</span>
          <span className="mt-0.5 block text-[11.5px] text-[#6b7688]">눌러서 열기</span>
        </button>
      )}

      {/* 전환 중 화면을 완전히 덮는다. 덜 덮으면 페이지가 바뀌는 순간이 그대로 보인다 */}
      <div
        className={`pointer-events-none fixed inset-0 z-30 bg-[#03040a] transition-opacity duration-[620ms] ease-in ${
          leaving ? 'opacity-100' : 'opacity-0'
        }`}
      />
    </>
  )
}
