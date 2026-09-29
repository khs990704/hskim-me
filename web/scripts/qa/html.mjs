// HTML 문법 검사 — W3C Nu Html Checker(vnu) 로 빌드 결과 전체.   npm run qa:html
//
// 검사기(약 60MB)는 처음 한 번만 ~/.cache/hskim-qa/ 에 받아 둔다 (Java 없이 도는 판).
// 통과하면 한 줄, 오류 · 경고가 있으면 종류별 개수와 예시 쪽을 찍는다.
// "<br/> 의 / 는 효과 없음" 은 표준이 허용하는 참고 메시지라 세지 않는다.
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { execFileSync, spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const WEB = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..')
const OUT = process.env.QA_ROOT ? path.resolve(process.env.QA_ROOT) : path.join(WEB, 'out')
const CACHE = path.join(os.homedir(), '.cache', 'hskim-qa')
const VNU = path.join(CACHE, 'vnu-runtime-image', 'bin', 'vnu')

if (!fs.existsSync(VNU)) {
  console.log('  검사기 받는 중 (처음 한 번)…')
  fs.mkdirSync(CACHE, { recursive: true })
  const zip = path.join(CACHE, 'vnu.linux.zip')
  execFileSync('curl', ['-sL', '-o', zip, 'https://github.com/validator/validator/releases/download/latest/vnu.linux.zip'])
  execFileSync('unzip', ['-qo', zip, '-d', CACHE])
  fs.rmSync(zip)
}
const r = spawnSync(VNU, ['--skip-non-html', '--format', 'json', OUT], { encoding: 'utf8', maxBuffer: 256 << 20 })
const msgs = JSON.parse(r.stderr || '{"messages":[]}').messages.filter(m => !/Trailing slash on void elements/.test(m.message))
// 목록 페이지의 "영어 문서 같다" 는 오판이다 (문서 제목이 영어일 뿐 안내문은 한국어)
const lang = msgs.filter(m => /appears to be written in English/.test(m.message))
const real = msgs.filter(m => !lang.includes(m))
const pages = fs.readdirSync(OUT, { recursive: true }).filter(f => String(f).endsWith('.html')).length
if (!real.length) { console.log(`  ✓ HTML 문법 — ${pages}쪽 · 오류 0 · 경고 0 (언어 오판 ${lang.length} 제외)`); process.exit(0) }
const by = new Map()
for (const m of real) {
  const k = `${m.type === 'error' ? '오류' : '경고'} · ${m.message.slice(0, 100)}`
  if (!by.has(k)) by.set(k, [])
  by.get(k).push(m.url.split('/out/').pop())
}
console.log(`  ✗ HTML 문법 — ${real.length}건`)
for (const [k, v] of by) console.log(`      ${v.length}× ${k}\n         예: ${v[0]}`)
process.exit(real.some(m => m.type === 'error') ? 1 : 0)
