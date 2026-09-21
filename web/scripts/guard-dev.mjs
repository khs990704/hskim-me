// next build 는 개발 서버가 쓰는 .next 를 덮어쓴다.
// 그 상태에서 브라우저가 예전 청크를 요청하면 모듈이 undefined 가 되어
// "Cannot read properties of undefined (reading 'call')" 이 난다.
//
// distDir 를 바꿔도 빌드 산출물은 .next 에 쓰이므로 격리되지 않는다.
// 그래서 개발 서버가 돌고 있으면 빌드를 막는다.
import { execSync } from 'node:child_process'

let running = ''
try {
  running = execSync('pgrep -af node 2>/dev/null || true', { encoding: 'utf8' })
} catch { /* pgrep 없음 — 통과 */ }

// 검사 명령 자신과 이 스크립트는 제외한다
const hit = running
  .split('\n')
  .filter(l => l.trim())
  .filter(l => !/pgrep|guard-dev/.test(l))
  .filter(l => /\bnext\b.*\bdev\b|next-server|next\/dist\/server/.test(l))

if (hit.length) {
  console.error(`
  개발 서버가 실행 중입니다. 빌드가 .next 를 덮어써 개발 서버가 깨집니다.

${hit.map(l => '    ' + l.slice(0, 110)).join('\n')}

  개발 서버를 멈춘 뒤 다시 실행하세요. 타입만 확인하려면:

    npx tsc --noEmit
`)
  process.exit(1)
}
