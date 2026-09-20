// 변환 결과를 눈으로 확인하기 위한 미리보기 HTML 생성.
// 최종 디자인이 아니라 '마크다운이 온전히 변환됐는가'를 검수하는 용도다.
import fs from 'node:fs'
import path from 'node:path'
import { ROOT } from '../config.mjs'

const OUT = path.join(ROOT, 'out')
const DIR = path.join(ROOT, 'preview')

const PICKS = [
  ['notes/software-engineering/frontend/framer-motion', '위키링크·백링크가 전형적인 지식 노트'],
  ['notes/ai-and-data/core-ml/deep-learning/gan', '수식(KaTeX) 렌더링 확인'],
  ['notes/ai-and-data/ai-and-data-moc', '대형 표와 허브 노트 (연결 113개)'],
  ['projects/personal/aikey-today/backend/n8n_tech_crawler', '코드블록이 있는 프로젝트 케이스'],
  ['projects/team/studiary', '폴더 노트 관례로 해결한 케이스 (백링크 13)'],
  ['projects/project-cases-moc', '비공개 참조 정리 결과 — Company 사례 섹션이 통째로 제거됨'],
  ['portfolio', '섹션 단위 제외 적용 — 실무 프로젝트(회사) 6개 섹션 제거, 190KB → 102KB'],
]

const load = route => JSON.parse(fs.readFileSync(path.join(OUT, 'content', route + '.json'), 'utf8'))
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

// Quartz 는 mermaid 를 <pre><code class="mermaid"> 로 내보낸다.
// 렌더링 라이브러리는 사이트 쪽 책임이므로 미리보기에서도 직접 로드한다.
const MERMAID_SCRIPT = `
<script type="module">
import mermaid from 'https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.esm.min.mjs'

mermaid.initialize({ startOnLoad: false, theme: 'dark', securityLevel: 'loose',
  themeVariables: { background: '#11161f', primaryColor: '#1c2331', primaryTextColor: '#d6dbe5',
                    lineColor: '#7dd3fc', fontFamily: 'Pretendard, sans-serif' } })

// Quartz 는 <pre><code class="mermaid"> 로 내보낸다. 렌더링 대상 컨테이너로 바꾼다.
for (const code of document.querySelectorAll('code.mermaid')) {
  const host = document.createElement('div')
  host.className = 'mermaid-render'
  host.textContent = code.textContent
  const pre = code.closest('pre')
  ;(pre ?? code).replaceWith(host)
}
await mermaid.run({ querySelector: '.mermaid-render' })

// --- 확대·축소·이동 ---------------------------------------------------------
// viewBox 를 직접 조작한다. CSS transform: scale() 은 SVG 를 원래 크기로 한 번
// 래스터화한 뒤 이미지처럼 늘리기 때문에 확대할수록 흐려진다.
// viewBox 를 바꾸면 브라우저가 매 배율마다 벡터로 다시 그려 항상 선명하다.
const MIN_ZOOM = 0.5, MAX_ZOOM = 12

for (const host of document.querySelectorAll('.mermaid-render')) {
  const svg = host.querySelector('svg')
  if (!svg) continue
  const vb = svg.viewBox.baseVal
  const base = { x: vb.x, y: vb.y, w: vb.width, h: vb.height }
  if (!base.w || !base.h) continue

  svg.removeAttribute('style')
  svg.setAttribute('preserveAspectRatio', 'xMidYMid meet')
  svg.setAttribute('width', '100%')
  svg.setAttribute('height', '100%')

  const stage = document.createElement('div')
  stage.className = 'pz-stage'
  host.replaceChild(stage, svg)
  stage.appendChild(svg)

  // 스테이지 높이를 다이어그램 비율에 맞춘다. 처음부터 전체가 보이게 하기 위함이다.
  const fitStage = () => {
    if (document.fullscreenElement === host) { stage.style.height = ''; return }
    const w = stage.clientWidth || host.clientWidth || 800
    const ideal = w * (base.h / base.w)
    stage.style.height = Math.round(Math.max(280, Math.min(ideal, window.innerHeight * 0.72))) + 'px'
  }

  const view = { ...base }
  const apply = () => {
    svg.setAttribute('viewBox', view.x + ' ' + view.y + ' ' + view.w + ' ' + view.h)
    label.textContent = Math.round((base.w / view.w) * 100) + '%'
  }
  const fit = () => { Object.assign(view, base); apply() }

  // 화면 좌표 -> SVG 사용자 좌표
  const toUser = (cx, cy) => {
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

  const zoomAt = (cx, cy, factor) => {
    const p = toUser(cx, cy)
    if (!p) return
    const minW = base.w / MAX_ZOOM, maxW = base.w / MIN_ZOOM
    const nextW = Math.min(maxW, Math.max(minW, view.w * factor))
    const k = nextW / view.w
    if (k === 1) return
    view.x = p.x - (p.x - view.x) * k
    view.y = p.y - (p.y - view.y) * k
    view.w = nextW
    view.h *= k
    apply()
  }

  stage.addEventListener('wheel', e => {
    e.preventDefault()
    zoomAt(e.clientX, e.clientY, e.deltaY < 0 ? 1 / 1.15 : 1.15)
  }, { passive: false })

  let drag = null
  stage.addEventListener('pointerdown', e => {
    if (e.button !== 0) return
    drag = { cx: e.clientX, cy: e.clientY, x: view.x, y: view.y, upp: unitsPerPixel() }
    stage.setPointerCapture(e.pointerId)
    stage.classList.add('grabbing')
  })
  stage.addEventListener('pointermove', e => {
    if (!drag) return
    view.x = drag.x - (e.clientX - drag.cx) * drag.upp
    view.y = drag.y - (e.clientY - drag.cy) * drag.upp
    apply()
  })
  const endDrag = () => { drag = null; stage.classList.remove('grabbing') }
  stage.addEventListener('pointerup', endDrag)
  stage.addEventListener('pointercancel', endDrag)
  stage.addEventListener('dblclick', fit)

  const bar = document.createElement('div')
  bar.className = 'pz-bar'
  const mk = (t, title, fn) => {
    const b = document.createElement('button')
    b.type = 'button'; b.textContent = t; b.title = title
    b.addEventListener('click', fn)
    bar.appendChild(b)
  }
  const centerZoom = f => {
    const r = stage.getBoundingClientRect()
    zoomAt(r.left + r.width / 2, r.top + r.height / 2, f)
  }
  mk('−', '축소', () => centerZoom(1.25))
  mk('+', '확대', () => centerZoom(1 / 1.25))
  mk('⤿', '전체 보기 (더블클릭)', fit)
  mk('⤢', '전체 화면', () => {
    if (document.fullscreenElement) document.exitFullscreen()
    else host.requestFullscreen?.()
  })
  const label = document.createElement('span')
  label.className = 'pz-label'
  bar.appendChild(label)
  host.appendChild(bar)

  const hint = document.createElement('div')
  hint.className = 'pz-hint'
  hint.textContent = '휠 확대 · 드래그 이동 · 더블클릭 전체 보기'
  host.appendChild(hint)

  host.addEventListener('fullscreenchange', () => { fitStage(); fit() })
  window.addEventListener('resize', fitStage)
  fitStage()
  apply()
}
</script>`

const STYLE = `
.mermaid-render{position:relative;background:#11161f;border:1px solid var(--line);
  border-radius:8px;margin:1.4em 0;overflow:hidden}
.mermaid-render:fullscreen{border-radius:0;margin:0;display:flex;flex-direction:column}
/* 높이는 다이어그램 비율에 맞춰 스크립트가 정한다 (처음부터 전체가 보이게) */
.pz-stage{overflow:hidden;cursor:grab;touch-action:none}
.mermaid-render:fullscreen .pz-stage{flex:1;height:auto}
.pz-stage.grabbing{cursor:grabbing}
.pz-stage svg{display:block;width:100%;height:100%;user-select:none}
.pz-bar{position:absolute;top:10px;right:10px;display:flex;align-items:center;gap:4px;
  background:rgba(13,16,23,.86);border:1px solid var(--line);border-radius:6px;padding:4px}
.pz-bar button{width:26px;height:26px;border:0;border-radius:4px;background:transparent;
  color:var(--dim);font-size:14px;line-height:1;cursor:pointer}
.pz-bar button:hover{background:#242c3a;color:var(--acc)}
.pz-label{color:var(--dim);font-size:11px;padding:0 6px;min-width:38px;text-align:right}
.pz-hint{position:absolute;left:12px;bottom:10px;color:#5c6577;font-size:11px;pointer-events:none}
:root{--bg:#0d1017;--panel:#151a23;--line:#242c3a;--fg:#d6dbe5;--dim:#8a93a5;--acc:#7dd3fc;--warn:#f0a868}
*{box-sizing:border-box}
body{margin:0;background:var(--bg);color:var(--fg);
  font-family:Pretendard,-apple-system,"Segoe UI",system-ui,sans-serif;line-height:1.85;font-size:16px}
.wrap{max-width:1100px;margin:0 auto;padding:32px 24px 96px}
.banner{background:#1e2536;border:1px solid var(--line);border-left:3px solid var(--warn);
  border-radius:6px;padding:14px 18px;margin-bottom:28px;font-size:13.5px;color:var(--dim)}
.banner b{color:var(--warn)}
nav{display:flex;flex-wrap:wrap;gap:8px;margin-bottom:28px}
nav a{font-size:13px;padding:6px 12px;border:1px solid var(--line);border-radius:999px;
  color:var(--dim);text-decoration:none}
nav a:hover,nav a.on{color:var(--acc);border-color:var(--acc)}
.meta{background:var(--panel);border:1px solid var(--line);border-radius:8px;padding:18px 22px;margin-bottom:36px;font-size:13.5px}
.meta dl{display:grid;grid-template-columns:110px 1fr;gap:8px 16px;margin:0}
.meta dt{color:var(--dim)}
.meta dd{margin:0;word-break:break-all}
article h1{font-size:2em;margin:.2em 0 .6em;line-height:1.3}
article h2{font-size:1.35em;margin:2em 0 .6em;padding-bottom:.3em;border-bottom:1px solid var(--line)}
article h3{font-size:1.1em;margin:1.6em 0 .5em}
article a{color:var(--acc);text-decoration:none;border-bottom:1px solid rgba(125,211,252,.3)}
article a.broken{color:var(--dim);border-bottom:1px dashed var(--line);cursor:not-allowed}
article code{background:#1c2331;padding:.15em .4em;border-radius:4px;font-size:.88em;
  font-family:"JetBrains Mono",ui-monospace,monospace}
article pre{background:#11161f;border:1px solid var(--line);border-radius:8px;padding:16px;overflow-x:auto}
article pre code{background:none;padding:0}
article table{border-collapse:collapse;width:100%;margin:1.2em 0;font-size:.93em;display:block;overflow-x:auto}
article th,article td{border:1px solid var(--line);padding:9px 13px;text-align:left;vertical-align:top}
article th{background:#1a212e}
article blockquote{margin:1.2em 0;padding:.4em 1.1em;border-left:3px solid var(--line);color:var(--dim)}
article img{max-width:100%}
.panel{margin-top:48px;padding-top:24px;border-top:1px solid var(--line);font-size:13.5px}
.panel h4{color:var(--dim);font-weight:500;margin:0 0 10px;font-size:13px;letter-spacing:.04em}
.panel ul{margin:0 0 24px;padding-left:18px}
.panel a{color:var(--acc);text-decoration:none}
`

fs.rmSync(DIR, { recursive: true, force: true })
fs.mkdirSync(DIR, { recursive: true })

const navHtml = cur => PICKS.map(([r]) =>
  `<a href="${r.split('/').pop()}.html" class="${r === cur ? 'on' : ''}">${esc(load(r).title)}</a>`).join('')

for (const [route, why] of PICKS) {
  const d = load(route)
  const html = `<!doctype html>
<html lang="ko"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(d.title)} — 변환 미리보기</title>
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.min.css">
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.min.css">
<style>${STYLE}</style></head><body><div class="wrap">
<div class="banner"><b>변환 검수용 미리보기</b> — 파이프라인이 만든 HTML을 최소 스타일로 감싼 것입니다.
사이트 디자인이 아니라 <b>마크다운이 Obsidian에서 보던 대로 변환됐는지</b>를 확인하는 용도입니다. 선정 이유: ${esc(why)}</div>
<nav>${navHtml(route)}</nav>
<div class="meta"><dl>
<dt>공개 URL</dt><dd>/${esc(d.route)}</dd>
<dt>원본 경로</dt><dd>${esc(d.source)}</dd>
<dt>검색용 요약</dt><dd>${esc(d.description)}</dd>
<dt>분류</dt><dd>${esc(d.kind)} · ${esc(d.category.join(' / '))}</dd>
<dt>목차</dt><dd>${d.toc.length}개 항목</dd>
<dt>링크</dt><dd>나가는 링크 ${d.links.length} · 백링크 ${d.backlinks.length}</dd>
</dl></div>
<article>${d.html}</article>
${d.features?.mermaid ? MERMAID_SCRIPT : ''}
<div class="panel">
<h4>이 문서가 거는 링크</h4><ul>${d.links.map(l => `<li><a href="#">${esc(l.title)}</a> <span style="color:var(--dim)">/${esc(l.route)}</span></li>`).join('') || '<li style="color:var(--dim)">없음</li>'}</ul>
<h4>이 문서를 가리키는 링크 (백링크)</h4><ul>${d.backlinks.map(l => `<li><a href="#">${esc(l.title)}</a> <span style="color:var(--dim)">/${esc(l.route)}</span></li>`).join('') || '<li style="color:var(--dim)">없음</li>'}</ul>
</div></div></body></html>`
  fs.writeFileSync(path.join(DIR, route.split('/').pop() + '.html'), html)
}

const index = `<!doctype html><html lang="ko"><head><meta charset="utf-8">
<title>변환 미리보기 — hskim.me</title>
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.min.css">
<style>${STYLE}</style></head><body><div class="wrap">
<h1 style="font-size:1.6em">변환 미리보기</h1>
<div class="banner"><b>사이트 디자인이 아닙니다.</b> 파이프라인이 Obsidian 마크다운을 변환한 결과가
원본과 같은지 검수하기 위한 최소 스타일 화면입니다.</div>
<ul style="line-height:2.4">${PICKS.map(([r, why]) => {
  const d = load(r)
  return `<li><a href="${r.split('/').pop()}.html" style="color:var(--acc);text-decoration:none;font-size:1.05em">${esc(d.title)}</a>
  <div style="color:var(--dim);font-size:13.5px;line-height:1.6">${esc(why)}<br>/${esc(r)}</div></li>`
}).join('')}</ul></div></body></html>`
fs.writeFileSync(path.join(DIR, 'index.html'), index)

console.log(`\n  미리보기 ${PICKS.length + 1}개 생성 → pipeline/preview/index.html\n`)
