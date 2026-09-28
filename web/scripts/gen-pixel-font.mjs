// 스탯창 픽셀 글꼴(Galmuri) — 쓰는 글자만 잘라 낸다.
//
// 원본은 한글 전체가 들어 있어 기본 493KB · 굵은 체 163KB 다. 스탯창에 나오는 글자는
// 칭호 이름 · 제목 · 숫자 정도라, 그 글자만 남기면 수십 KB 로 줄어든다.
//
// 남길 글자 = 파이프라인 데이터(character.json · profile.json) + 스탯창 코드(components/profile)
// 에 나오는 글자 + 영숫자. 칭호가 늘면 다음 빌드에서 저절로 따라 늘어난다.
// 빠진 글자는 CSS 글꼴 목록의 다음 글꼴(Pretendard)로 보이므로 깨지지 않는다.
//
// 결과: public/fonts/galmuri-<내용 해시>/ · lib/pixel-font.generated.json (화면이 @font-face 를 만든다)
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { fileURLToPath } from 'node:url'
import subsetFont from 'subset-font'

const WEB = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const OUT = path.join(WEB, '..', 'pipeline', 'out')
const SRC = path.join(WEB, 'assets', 'pixel-fonts')
const FONTS = [
  { key: 'regular', file: 'Galmuri11.woff2', weight: 400 },
  { key: 'bold', file: 'Galmuri11-Bold.woff2', weight: 700 },
]

const chars = new Set()
const add = s => { for (const ch of String(s)) chars.add(ch) }
for (let c = 0x20; c < 0x7f; c++) chars.add(String.fromCharCode(c))
add('·—–「」『』…→←↑↓×÷±%#★☆◆◇○●◎▲▼▶◀■□▓░✓✗')
for (const name of ['character.json', 'profile.json']) {
  const f = path.join(OUT, name)
  if (!fs.existsSync(f)) continue
  const data = JSON.parse(fs.readFileSync(f, 'utf8'))
  delete data.sections                       // 본문 글은 Pretendard 로 쓴다
  add(JSON.stringify(data))
}
const walk = d => fs.existsSync(d) ? fs.readdirSync(d, { withFileTypes: true }).flatMap(e => e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]) : []
for (const f of walk(path.join(WEB, 'components', 'profile'))) add(fs.readFileSync(f, 'utf8'))
// 한글 · 영숫자 · 기호만 남긴다 (코드의 제어 문자 등은 뺀다)
const text = [...chars].filter(ch => /[\p{L}\p{N}\p{P}\p{S} ]/u.test(ch)).sort().join('')

const hash = crypto.createHash('sha1').update(text).update(FONTS.map(f => fs.statSync(path.join(SRC, f.file)).size).join()).digest('hex').slice(0, 10)
const dir = `galmuri-${hash}`
const outDir = path.join(WEB, 'public', 'fonts', dir)
const manifest = { family: 'Galmuri11', dir, glyphs: [...text].length, files: {} }

// 예전 결과는 지운다
for (const e of fs.readdirSync(path.join(WEB, 'public', 'fonts'))) {
  if (e.startsWith('galmuri-') && e !== dir) fs.rmSync(path.join(WEB, 'public', 'fonts', e), { recursive: true, force: true })
}
fs.mkdirSync(outDir, { recursive: true })
let total = 0
for (const f of FONTS) {
  const dest = path.join(outDir, f.file)
  if (!fs.existsSync(dest)) {
    const buf = await subsetFont(fs.readFileSync(path.join(SRC, f.file)), text, { targetFormat: 'woff2' })
    fs.writeFileSync(dest, buf)
  }
  total += fs.statSync(dest).size
  manifest.files[f.key] = { url: `/fonts/${dir}/${f.file}`, weight: f.weight }
}
fs.copyFileSync(path.join(SRC, 'ofl.md'), path.join(outDir, 'OFL.md'))
fs.writeFileSync(path.join(WEB, 'lib', 'pixel-font.generated.json'), JSON.stringify(manifest, null, 2) + '\n')
console.log(`\n  픽셀 글꼴 — ${manifest.glyphs}자 · ${(total / 1024).toFixed(0)}KB (원본 656KB) → public/fonts/${dir}/`)
