// 폰트를 내려받아 web/public/fonts/ 로 고정한다.
//
// 빌드 때 돌리지 않는다. Pretendard 판을 올릴 때만 손으로 돌린다 —
// 빌드가 남의 서버에 기대면 그쪽이 흔들릴 때 배포가 멈춘다.
//
//   node scripts/fetch-fonts.mjs
//
// 왜 CDN 을 떠났는가
//   - `cdn.jsdelivr.net` 이 렌더 차단 경로에 있어 300ms 를 먹었다. 크기가 아니라
//     연결(DNS·TLS·왕복) 비용이라 압축으로는 줄지 않는다
//   - 굵기별 정적 폰트라 한 페이지에 25개를 받았다. 도착할 때마다 본문이 밀려
//     CLS 0.139 가 났다
//
// 왜 변수 폰트인가
//   굵기 하나로 45~920 을 다 낸다. Regular·Medium·SemiBold·Bold 를 따로 받지
//   않으므로 요청이 절반 이하가 되고, CSS 도 540KB → 53KB 가 된다.
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = path.dirname(fileURLToPath(import.meta.url))
const OUT = path.join(HERE, '..', 'public', 'fonts')

const PRETENDARD = 'v1.3.9'
const GH = `https://cdn.jsdelivr.net/gh/orioncactus/pretendard@${PRETENDARD}`
const SUBSET_CSS = `${GH}/dist/web/variable/pretendardvariable-dynamic-subset.min.css`
const SUBSET_DIR = `${GH}/packages/pretendard/dist/web/variable/woff2-dynamic-subset`

const MONO_VERSION = '5'
const MONO = `https://cdn.jsdelivr.net/npm/@fontsource/jetbrains-mono@${MONO_VERSION}`
const MONO_WEIGHTS = [400, 500, 700]

/**
 * 판 번호를 경로에 넣는다.
 *
 * 폰트는 한 번 받으면 1년 동안 다시 묻지 않도록 캐시한다(public/_headers).
 * 파일 이름이 그대로면 판을 올려도 예전 폰트를 계속 쓰게 되므로, 경로를
 * 바꿔서 새 주소로 만든다.
 */
const PRETENDARD_DIR = `pretendard-${PRETENDARD.replace(/^v/, '')}`
const MONO_DIR = `jetbrains-mono-${MONO_VERSION}`

const get = async (url, binary = false) => {
  const r = await fetch(url)
  if (!r.ok) throw new Error(`${r.status} ${url}`)
  return binary ? Buffer.from(await r.arrayBuffer()) : r.text()
}

const save = (rel, data) => {
  const p = path.join(OUT, rel)
  fs.mkdirSync(path.dirname(p), { recursive: true })
  fs.writeFileSync(p, data)
}

/** woff2 는 'wOF2' 로 시작한다. CDN 이 오류 페이지를 돌려줘도 파일은 생기므로 확인한다 */
const isWoff2 = buf => buf.length > 1000 && buf.subarray(0, 4).toString() === 'wOF2'

const upstream = await get(SUBSET_CSS)

// ── Pretendard ────────────────────────────────────────────────────────
const faces = [...upstream.matchAll(/@font-face\{([^}]*)\}/g)].map(m => m[1])
const rules = []
for (const face of faces) {
  const file = face.match(/([\w-]+\.subset\.\d+\.woff2)/)?.[1]
  const range = face.match(/unicode-range:([^;}]+)/)?.[1]
  if (!file || !range) throw new Error('예상과 다른 @font-face: ' + face.slice(0, 80))

  const buf = await get(`${SUBSET_DIR}/${file}`, true)
  if (!isWoff2(buf)) throw new Error('woff2 가 아님: ' + file)
  save(path.join(PRETENDARD_DIR, file), buf)

  rules.push(
    `@font-face{font-family:'Pretendard Variable';font-style:normal;font-weight:45 920;` +
    `font-display:swap;src:url(/fonts/${PRETENDARD_DIR}/${file}) format('woff2-variations');` +
    `unicode-range:${range}}`,
  )
}
save(`${PRETENDARD_DIR}/OFL.txt`, await get(`${GH}/LICENSE`))

// ── JetBrains Mono (코드용. 라틴만 쓴다) ──────────────────────────────
// fontsource 의 라틴 CSS 에는 unicode-range 가 없다. 코드에만 쓰는 폰트이고
// 한글은 어차피 다음 폰트로 넘어가므로 범위를 두지 않는다.
for (const w of MONO_WEIGHTS) {
  const file = `jetbrains-mono-latin-${w}-normal.woff2`
  const buf = await get(`${MONO}/files/${file}`, true)
  if (!isWoff2(buf)) throw new Error('woff2 가 아님: ' + file)
  save(path.join(MONO_DIR, file), buf)

  rules.push(
    `@font-face{font-family:'JetBrains Mono';font-style:normal;font-weight:${w};` +
    `font-display:swap;src:url(/fonts/${MONO_DIR}/${file}) format('woff2')}`,
  )
}
save(`${MONO_DIR}/OFL.txt`, await get(`${MONO}/LICENSE`))

const header = `/* scripts/fetch-fonts.mjs 가 만든 파일. 직접 고치지 말 것.\n` +
  `   Pretendard ${PRETENDARD} (OFL) · JetBrains Mono 5 (OFL) */\n`
save('fonts.css', header + rules.join('\n') + '\n')

const total = fs.readdirSync(path.join(OUT, PRETENDARD_DIR)).length
console.log(`\n  Pretendard ${total - 1}개 · JetBrains Mono ${MONO_WEIGHTS.length}개`)
console.log(`  fonts.css ${(fs.statSync(path.join(OUT, 'fonts.css')).size / 1024).toFixed(0)}KB\n`)
