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
  ['projects/project-cases-moc', '비공개 문서를 가리키는 링크 29개 — 표시 방식 판단용'],
]

const load = route => JSON.parse(fs.readFileSync(path.join(OUT, 'content', route + '.json'), 'utf8'))
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

const STYLE = `
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
<div class="panel">
<h4>이 문서가 거는 링크</h4><ul>${d.links.map(l => `<li><a href="#">${esc(l.title)}</a> <span style="color:var(--dim)">/${esc(l.route)}</span></li>`).join('') || '<li style="color:var(--dim)">없음</li>'}</ul>
<h4>비공개 문서를 가리키는 링크 (현재는 점선·회색으로 표시)</h4>
<ul>${[...d.html.matchAll(/data-slug="([^"]+)"[^>]*data-broken/g)].map(m=>`<li style="color:var(--dim)">${esc(m[1])}</li>`).slice(0,10).join('') || '<li style="color:var(--dim)">없음</li>'}</ul>
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
