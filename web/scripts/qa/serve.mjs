// 빌드 결과(out/)를 Cloudflare Pages 처럼 서빙한다 — _headers 의 보안 헤더(CSP 등)를 붙이고,
// 없는 주소는 404.html. 로컬에서 "배포된 것과 같은 조건" 으로 시험하기 위한 것.
import http from 'node:http'
import fs from 'node:fs'
import path from 'node:path'

const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.woff2': 'font/woff2', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.txt': 'text/plain' }

export function headersFor(root) {
  const h = {}
  let on = false
  for (const l of fs.readFileSync(path.join(root, '_headers'), 'utf8').split('\n')) {
    if (l === '/*') on = true
    else if (on && /^\s+\S/.test(l)) { const i = l.indexOf(':'); h[l.slice(0, i).trim()] = l.slice(i + 1).trim() }
    else if (on && !l.trim()) on = false
  }
  // http 로 시험하므로 HTTPS 강제 두 가지는 뺀다
  delete h['Strict-Transport-Security']
  if (h['Content-Security-Policy']) h['Content-Security-Policy'] = h['Content-Security-Policy'].replace('; upgrade-insecure-requests', '')
  return h
}

export function serve(root, port = 4599) {
  const H = headersFor(root)
  const server = http.createServer((q, r) => {
    let f = path.join(root, decodeURIComponent(q.url.split('?')[0]))
    // Cloudflare Pages 와 같게: 폴더면 그 안의 index.html, 없으면 같은 이름의 .html
    // (/portfolio · /life 처럼 페이지와 하위 페이지 폴더가 같이 있는 경우 — 폴더만 보면 404 였다)
    const dir = fs.existsSync(f) && fs.statSync(f).isDirectory()
    if (dir && fs.existsSync(path.join(f, 'index.html'))) f = path.join(f, 'index.html')
    else if ((dir || !fs.existsSync(f)) && fs.existsSync(f.replace(/\/$/, '') + '.html')) f = f.replace(/\/$/, '') + '.html'
    if (!fs.existsSync(f)) { r.writeHead(404, { ...H, 'Content-Type': TYPES['.html'] }); return fs.createReadStream(path.join(root, '404.html')).pipe(r) }
    r.writeHead(200, { ...H, 'Content-Type': TYPES[path.extname(f)] ?? 'application/octet-stream' })
    fs.createReadStream(f).pipe(r)
  })
  return new Promise(res => server.listen(port, '127.0.0.1', () => res(server)))
}
