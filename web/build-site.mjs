// P2 임시 사이트 생성기.
//
// 목적은 하나다 — Vault 커밋이 실제로 hskim.me 까지 도달하는지 확인하는 것.
// 실제 화면은 P3 에서 Next.js 로 만든다. 이 파일은 그때 대체된다.
//
// 공개 전까지 검색 엔진에 잡히면 안 되므로 noindex 와 robots.txt 를 함께 낸다.
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.dirname(fileURLToPath(import.meta.url))
const OUT = path.join(ROOT, 'dist')
const CONTENT = path.join(ROOT, '..', 'pipeline', 'out')

const graph = JSON.parse(fs.readFileSync(path.join(CONTENT, 'graph.json'), 'utf8'))
const buildReport = JSON.parse(fs.readFileSync(path.join(CONTENT, '..', 'build-report.json'), 'utf8'))

const byGroup = {}
for (const n of graph.nodes) {
  const top = n.group.split('/')[0]
  byGroup[top] = (byGroup[top] ?? 0) + 1
}

const now = new Date().toISOString().replace('T', ' ').slice(0, 16) + ' UTC'
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;')

const rows = Object.entries(byGroup).sort((a, b) => b[1] - a[1])
  .map(([k, v]) => `<tr><td>${esc(k)}</td><td>${v}</td></tr>`).join('')

const html = `<!doctype html>
<html lang="ko"><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex,nofollow">
<title>hskim.me</title>
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.min.css">
<style>
:root{--bg:#03040a;--fg:#d6dbe5;--dim:#7c869b;--line:#1c2331;--acc:#7dd3fc}
*{box-sizing:border-box}
html,body{height:100%}
body{margin:0;background:
  radial-gradient(1200px 700px at 20% -10%, #121a33 0%, transparent 60%),
  radial-gradient(900px 600px at 85% 110%, #16112b 0%, transparent 60%),
  var(--bg);
  color:var(--fg);font-family:Pretendard,system-ui,sans-serif;line-height:1.8;
  display:flex;align-items:center;justify-content:center;padding:32px}
main{max-width:520px;width:100%}
h1{font-size:1.9em;margin:0 0 4px;letter-spacing:-.02em}
.sub{color:var(--dim);margin:0 0 40px;font-size:.95em}
.status{display:inline-flex;align-items:center;gap:8px;font-size:.82em;color:var(--dim);
  border:1px solid var(--line);border-radius:999px;padding:5px 13px;margin-bottom:28px}
.dot{width:6px;height:6px;border-radius:50%;background:var(--acc);
  box-shadow:0 0 10px var(--acc);animation:p 2.6s ease-in-out infinite}
@keyframes p{0%,100%{opacity:1}50%{opacity:.25}}
table{width:100%;border-collapse:collapse;font-size:.88em}
td{padding:7px 0;border-bottom:1px solid var(--line)}
td:last-child{text-align:right;color:var(--dim);font-variant-numeric:tabular-nums}
.meta{margin-top:28px;color:#4f5769;font-size:.78em;line-height:2}
</style></head><body><main>
<div class="status"><span class="dot"></span>준비 중</div>
<h1>hskim.me</h1>
<p class="sub">지식 그래프 기반 개인 사이트를 만들고 있습니다.</p>
<table>
<tr><td>공개 문서</td><td>${graph.nodes.length}</td></tr>
<tr><td>문서 간 연결</td><td>${graph.links.length}</td></tr>
${rows}
</table>
<div class="meta">
빌드 ${esc(now)}<br>
표 ${buildReport.tables} · 코드 ${buildReport.code} · 수식 ${buildReport.math}
</div>
</main></body></html>`

fs.rmSync(OUT, { recursive: true, force: true })
fs.mkdirSync(OUT, { recursive: true })
fs.writeFileSync(path.join(OUT, 'index.html'), html)

// 공개 전까지는 색인을 막는다 (D-09 는 정식 공개 시점부터 적용)
fs.writeFileSync(path.join(OUT, 'robots.txt'), 'User-agent: *\nDisallow: /\n')

console.log(`\n  임시 사이트 생성 — 문서 ${graph.nodes.length} · 연결 ${graph.links.length}`)
console.log(`  ${path.relative(process.cwd(), OUT)}/index.html\n`)
