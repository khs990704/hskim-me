// 이미지 처리 시험 — 위치 정보가 지워지는지, 방향이 바로잡히는지, 공개 범위 밖을 막는지.
// 공개 사진에 GPS 좌표가 남으면 사는 곳이 드러난다. 이미지 코드를 바꿀 때마다 돌린다: npm run test:media
import os from 'node:os'
import fs from 'node:fs'
import path from 'node:path'
import sharp from 'sharp'
import { processImage, MediaError } from '../src/media.mjs'

const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'media-test-'))
const V = path.join(TMP, 'vault')
const OUT = path.join(TMP, 'out')
fs.mkdirSync(path.join(V, '05 Attachments/Images'), { recursive: true })
fs.mkdirSync(path.join(V, 'other'), { recursive: true })

let failed = 0
const check = (ok, msg) => { console.log(`  ${ok ? '✓' : '✗'} ${msg}`); if (!ok) failed++ }
const hasGps = exif => !!exif && (exif.includes(Buffer.from([0x88, 0x25])) || exif.includes(Buffer.from([0x25, 0x88])))

// 폰 사진 흉내: 픽셀은 가로 1200 × 800 으로 눕혀 두고 "시계 방향 90도로 돌려 보라"(방향 6) 표시.
// 왼쪽 절반이 빨강 → 제대로 돌리면 세로 사진이 되고 빨강이 위로 간다.
const SRC = path.join(V, '05 Attachments/Images/test.jpg')
await sharp({ create: { width: 1200, height: 800, channels: 3, background: '#2040a0' } })
  .composite([{ input: { create: { width: 600, height: 800, channels: 3, background: '#e03030' } }, left: 0, top: 0 }])
  .jpeg()
  .withExif({
    IFD0: { Make: 'Apple', Model: 'iPhone 15 Pro' },
    IFD3: { GPSLatitudeRef: 'N', GPSLatitude: '37/1 33/1 59/1', GPSLongitudeRef: 'E', GPSLongitude: '126/1 58/1 41/1' },
  })
  .withMetadata({ orientation: 6 })
  .toFile(SRC)
fs.copyFileSync(SRC, path.join(V, 'other/leak.jpg'))
fs.writeFileSync(path.join(V, '05 Attachments/Images/photo.heic'), 'x')

console.log('\n  시험 사진')
const src = await sharp(SRC).metadata()
check(hasGps(src.exif), '원본에 GPS 가 들어 있다 (시험이 유효한지)')
check(src.exif?.toString('latin1').includes('iPhone'), '원본에 기기 정보가 들어 있다')
check(src.orientation === 6, '원본에 방향 표시(6)가 있다')

for (const preset of ['avatar', 'photo']) {
  console.log(`\n  ${preset}`)
  const r = await processImage('05 Attachments/Images/test.jpg', preset, { vault: V, outDir: OUT })
  for (const v of r.variants) {
    const f = path.join(OUT, path.basename(v.url))
    const m = await sharp(f).metadata()
    check(!m.exif && !m.xmp && !m.iptc, `${v.w}x${v.h} — 메타데이터 없음 (GPS · 기기 · 시각)`)
    check(!m.orientation || m.orientation === 1, `${v.w}x${v.h} — 방향 표시 없음 (픽셀을 이미 돌렸음)`)
  }
  const last = path.join(OUT, path.basename(r.variants.at(-1).url))
  const { data, info } = await sharp(last).raw().toBuffer({ resolveWithObject: true })
  const px = (x, y) => { const i = (y * info.width + x) * info.channels; return data[i] }
  if (preset === 'photo') check(info.height > info.width, `세로 사진이 되었다 (${info.width}x${info.height})`)
  check(px(info.width >> 1, 3) > 180, '빨강(원래 왼쪽)이 위로 갔다 — 시계 방향으로 돌았다')
  check(px(info.width >> 1, info.height - 3) < 100, '파랑(원래 오른쪽)이 아래로 갔다')
  check(r.variants.every(v => v.w <= (preset === 'avatar' ? 800 : 800)), '원본보다 크게 만들지 않았다')
}

console.log('\n  공개 범위')
for (const [bad, why] of [
  ['other/leak.jpg', '05 Attachments 밖'],
  ['../outside.jpg', 'Vault 밖'],
  ['05 Attachments/Images/photo.heic', 'HEIC'],
  ['05 Attachments/Images/none.jpg', '없는 파일'],
]) {
  let blocked = false
  try { await processImage(bad, 'avatar', { vault: V, outDir: OUT }) } catch (e) { blocked = e instanceof MediaError }
  check(blocked, `막음 — ${why} (${bad})`)
}

fs.rmSync(TMP, { recursive: true, force: true })
console.log(failed ? `\n  ✗ 실패 ${failed}건\n` : '\n  모두 통과\n')
process.exit(failed ? 1 : 0)
