'use client'
import { useEffect, useState } from 'react'

/**
 * Mermaid 다이어그램 렌더링 + 확대·축소·이동.
 *
 * 확대는 CSS transform 이 아니라 viewBox 를 직접 바꾼다.
 * transform: scale() 은 SVG 를 원래 크기로 한 번 래스터화한 뒤 비트맵을 늘려
 * 확대할수록 흐려진다. viewBox 를 바꾸면 매 배율마다 벡터로 다시 그린다.
 *
 * 다시 그려야 하는 경우가 둘 있다.
 *   1. 테마 전환 — 색이 바뀐다
 *   2. 문서 이동 — React 가 본문 HTML 을 갈아끼우면 변환해 둔 figure 가 사라지고
 *      원본 <pre><code class="mermaid"> 가 복원된다. trigger 로 감지한다.
 * 두 경우 모두 원본 소스가 필요하므로 figure 의 data-src 에 보관해 둔다.
 */
const MIN_ZOOM = 0.5
const MAX_ZOOM = 12

const currentTheme = () =>
  typeof document === 'undefined' ? 'dark' : document.documentElement.dataset.theme === 'light' ? 'light' : 'dark'

export default function Diagrams({ scope, trigger }: { scope: React.RefObject<HTMLElement | null>; trigger?: string }) {
  const [theme, setTheme] = useState<'dark' | 'light'>('dark')

  useEffect(() => {
    setTheme(currentTheme())
    const mo = new MutationObserver(() => setTheme(currentTheme()))
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })
    return () => mo.disconnect()
  }, [])

  useEffect(() => {
    const root = scope.current
    if (!root) return

    // 첫 실행에서만 <pre><code class="mermaid"> 를 figure 로 바꾼다.
    for (const code of Array.from(root.querySelectorAll('code.mermaid'))) {
      const fig = document.createElement('figure')
      fig.className = 'diagram'
      fig.dataset.src = code.textContent ?? ''
      ;(code.closest('pre') ?? code).replaceWith(fig)
    }

    const figures = Array.from(root.querySelectorAll<HTMLElement>('figure.diagram'))
    if (!figures.length) return

    let cancelled = false
    const cleanups: (() => void)[] = []

    ;(async () => {
      const mermaid = (await import('mermaid')).default
      if (cancelled) return

      mermaid.initialize({
        startOnLoad: false,
        theme: theme === 'light' ? 'neutral' : 'dark',
        securityLevel: 'loose',
        fontFamily: 'Pretendard, sans-serif',
      })

      for (const [i, fig] of figures.entries()) {
        const src = fig.dataset.src ?? ''
        let svgText: string
        try {
          ;({ svg: svgText } = await mermaid.render(`d${i}-${theme}-${Date.now()}`, src))
        } catch {
          fig.innerHTML = `<div class="diagram-error">다이어그램을 그리지 못했습니다.</div>`
          continue
        }
        if (cancelled) return

        fig.innerHTML = ''
        const stage = document.createElement('div')
        stage.className = 'diagram-stage'
        stage.innerHTML = svgText
        fig.appendChild(stage)

        const cleanup = attach(fig, stage)
        if (cleanup) cleanups.push(cleanup)
      }
    })()

    return () => { cancelled = true; cleanups.forEach(f => f()) }
  }, [scope, theme, trigger])

  return null
}

function attach(fig: HTMLElement, stage: HTMLElement) {
  const svg = stage.querySelector('svg')
  if (!svg) return
  const vb = svg.viewBox.baseVal
  const base = { x: vb.x, y: vb.y, w: vb.width, h: vb.height }
  if (!base.w || !base.h) return

  svg.removeAttribute('style')
  svg.setAttribute('preserveAspectRatio', 'xMidYMid meet')
  svg.setAttribute('width', '100%')
  svg.setAttribute('height', '100%')

  const view = { ...base }
  const zoomLabel = document.createElement('span')
  zoomLabel.className = 'diagram-zoom'

  const apply = () => {
    svg.setAttribute('viewBox', `${view.x} ${view.y} ${view.w} ${view.h}`)
    zoomLabel.textContent = `${Math.round((base.w / view.w) * 100)}%`
  }
  const fit = () => { Object.assign(view, base); apply() }

  // 스테이지 높이를 다이어그램 비율에 맞춘다 — 처음부터 전체가 보이게.
  // 초기 상태와 '전체 보기'가 어긋나면 초기화가 기대대로 동작하지 않는다.
  const fitStage = () => {
    if (document.fullscreenElement === fig) { stage.style.height = ''; return }
    const w = stage.clientWidth || fig.clientWidth || 800
    const ideal = w * (base.h / base.w)
    stage.style.height = `${Math.round(Math.max(240, Math.min(ideal, innerHeight * 0.7)))}px`
  }

  const toUser = (cx: number, cy: number) => {
    const ctm = svg.getScreenCTM()
    if (!ctm) return null
    const p = svg.createSVGPoint()
    p.x = cx; p.y = cy
    return p.matrixTransform(ctm.inverse())
  }
  // preserveAspectRatio="meet" 이므로 가로·세로 배율이 같다
  const unitsPerPixel = () => {
    const r = svg.getBoundingClientRect()
    return Math.max(view.w / r.width, view.h / r.height)
  }

  const zoomAt = (cx: number, cy: number, factor: number) => {
    const p = toUser(cx, cy)
    if (!p) return
    const next = Math.min(base.w / MIN_ZOOM, Math.max(base.w / MAX_ZOOM, view.w * factor))
    const k = next / view.w
    if (k === 1) return
    view.x = p.x - (p.x - view.x) * k
    view.y = p.y - (p.y - view.y) * k
    view.w = next
    view.h *= k
    apply()
  }

  const onWheel = (e: WheelEvent) => { e.preventDefault(); zoomAt(e.clientX, e.clientY, e.deltaY < 0 ? 1 / 1.15 : 1.15) }
  let drag: { cx: number; cy: number; x: number; y: number; upp: number } | null = null
  const onDown = (e: PointerEvent) => {
    if (e.button !== 0) return
    drag = { cx: e.clientX, cy: e.clientY, x: view.x, y: view.y, upp: unitsPerPixel() }
    stage.setPointerCapture(e.pointerId)
    stage.classList.add('grabbing')
  }
  const onMove = (e: PointerEvent) => {
    if (!drag) return
    view.x = drag.x - (e.clientX - drag.cx) * drag.upp
    view.y = drag.y - (e.clientY - drag.cy) * drag.upp
    apply()
  }
  const endDrag = () => { drag = null; stage.classList.remove('grabbing') }

  stage.addEventListener('wheel', onWheel, { passive: false })
  stage.addEventListener('pointerdown', onDown)
  stage.addEventListener('pointermove', onMove)
  stage.addEventListener('pointerup', endDrag)
  stage.addEventListener('pointercancel', endDrag)
  stage.addEventListener('dblclick', fit)

  // 머리말 — 본문과 구분되는 도형 영역임을 드러낸다
  const head = document.createElement('figcaption')
  head.className = 'diagram-head'

  const label = document.createElement('span')
  label.className = 'diagram-label'
  label.textContent = '다이어그램'

  const hint = document.createElement('span')
  hint.className = 'diagram-hint'
  hint.textContent = '휠 확대 · 드래그 이동 · 더블클릭 전체 보기'

  const tools = document.createElement('div')
  tools.className = 'diagram-tools'
  const mk = (t: string, title: string, fn: () => void) => {
    const b = document.createElement('button')
    b.type = 'button'; b.textContent = t; b.title = title
    b.addEventListener('click', fn)
    tools.appendChild(b)
  }
  const centerZoom = (f: number) => {
    const r = stage.getBoundingClientRect()
    zoomAt(r.left + r.width / 2, r.top + r.height / 2, f)
  }
  mk('−', '축소', () => centerZoom(1.25))
  mk('+', '확대', () => centerZoom(1 / 1.25))
  mk('⤿', '전체 보기 (더블클릭)', fit)
  mk('⤢', '전체 화면', () => {
    if (document.fullscreenElement) document.exitFullscreen()
    else fig.requestFullscreen?.()
  })
  tools.appendChild(zoomLabel)

  head.append(label, hint, tools)
  fig.insertBefore(head, stage)

  const onFs = () => { fitStage(); fit() }
  fig.addEventListener('fullscreenchange', onFs)
  addEventListener('resize', fitStage)
  fitStage()
  apply()

  return () => {
    fig.removeEventListener('fullscreenchange', onFs)
    removeEventListener('resize', fitStage)
  }
}
