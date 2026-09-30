// 이미지 — Vault 의 첨부 이미지를 공개용으로 만든다 → web/public/media/ · out/media.json
// (기획 docs/01-planning/profile-and-life.md §6.3)
//
// 프로필 이미지(Profile.md 의 avatar)와 사진 기록(out/life.json 의 사진)을 같은 함수로 처리한다.
//
//   1. 공개할 수 있는 곳의 파일인지 — Vault 의 05 Attachments 아래만
//   2. 방향 바로잡기 — 폰 사진은 픽셀은 눕혀 두고 "돌려서 보라" 는 표시만 붙인다.
//      메타데이터를 지우면 그 표시도 사라지므로, 지우기 전에 실제로 돌려 둔다.
//   3. 크기별로 줄이고 WebP 로 — 원본 3~10MB → 수십 KB
//   4. 메타데이터 전부 삭제 — 찍은 위치(GPS), 기기, 시각. sharp 는 따로 요청하지 않으면
//      메타데이터를 옮기지 않는다. 그래도 믿지 않고 결과 파일을 다시 열어 확인한다.
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'
import { VAULT, ROOT } from '../config.mjs'

export const MEDIA_ROOTS = ['05 Attachments']
const INPUT_EXT = new Set(['.jpg', '.jpeg', '.png', '.webp', '.avif', '.gif', '.tif', '.tiff'])

/** 쓰임새별 폭. 화면 픽셀 밀도 2~3배까지 대비하되 원본보다 키우지 않는다 */
export const PRESETS = {
  avatar: { widths: [160, 320, 640], square: true, quality: 82 },
  photo: { widths: [480, 960, 1600], square: false, quality: 80 },
  thumb: { widths: [240, 480], square: true, quality: 76 },
  // 링크 미리보기 카드 (사진 기록 글의 첫 사진). 1200×630 으로 자르고 JPEG — 미리보기를 그리는 쪽(메신저 등)이
  // WebP 를 못 읽는 경우가 있다. 원본이 작아도 이 크기로 맞춘다 (카드 비율이 정해져 있다)
  og: { widths: [1200], box: [1200, 630], format: 'jpeg', quality: 82 },
}

export class MediaError extends Error {}

/** Vault 기준 경로가 공개할 수 있는 이미지인지 확인하고 절대 경로를 돌려준다 */
export function resolveMedia(rel, vault = VAULT) {
  const norm = path.posix.normalize(String(rel).replace(/\\/g, '/'))
  if (norm.startsWith('..') || path.posix.isAbsolute(norm)) throw new MediaError(`Vault 밖을 가리킵니다: ${rel}`)
  if (!MEDIA_ROOTS.some(r => norm === r || norm.startsWith(r + '/'))) {
    throw new MediaError(`${MEDIA_ROOTS.join(', ')} 아래 파일만 공개할 수 있습니다: ${rel}`)
  }
  const ext = path.extname(norm).toLowerCase()
  if (ext === '.heic' || ext === '.heif') {
    throw new MediaError(`HEIC 는 처리할 수 없습니다: ${rel} — iPhone 설정 > 카메라 > 포맷 > "높은 호환성" 으로 찍거나 JPEG 로 내보내 주세요`)
  }
  if (!INPUT_EXT.has(ext)) throw new MediaError(`이미지 형식이 아닙니다: ${rel}`)
  const abs = path.join(vault, norm)
  if (!fs.existsSync(abs)) throw new MediaError(`파일이 없습니다: ${rel}`)
  return { rel: norm, abs }
}

/** 결과 파일에 메타데이터가 남아 있으면 멈춘다 */
async function assertClean(file) {
  const m = await sharp(file).metadata()
  const left = ['exif', 'xmp', 'iptc'].filter(k => m[k])
  if (left.length) throw new MediaError(`메타데이터가 남았습니다 (${left.join(', ')}): ${file}`)
}

/**
 * 이미지 하나를 처리한다.
 * @returns {{ src, rel, preset, width, height, variants: {w, h, url, bytes}[], originalBytes }}
 */
export async function processImage(rel, preset, { vault = VAULT, outDir, urlBase = '/media' } = {}) {
  const P = PRESETS[preset]
  if (!P) throw new MediaError(`모르는 쓰임새: ${preset}`)
  const { abs, rel: norm } = resolveMedia(rel, vault)
  const input = fs.readFileSync(abs)
  // 내용과 처리 방식이 같으면 같은 이름 — 바뀌면 이름이 바뀌므로 오래 캐시해도 안전하다
  const hash = crypto.createHash('sha1').update(input).update(JSON.stringify(P)).digest('hex').slice(0, 12)

  const base = sharp(input, { failOn: 'error' }).rotate()          // 방향 바로잡기
  const meta = await base.metadata()
  // rotate() 뒤의 실제 가로세로 (EXIF 방향 5~8 은 가로세로가 바뀐다)
  const swap = (meta.orientation ?? 1) >= 5
  const W = swap ? meta.height : meta.width
  const H = swap ? meta.width : meta.height
  const side = Math.min(W, H)

  fs.mkdirSync(outDir, { recursive: true })
  const variants = []
  const widths = P.box ? [P.box[0]] : [...new Set(P.widths.map(w => Math.min(w, P.square ? side : W)))]
  const ext = P.format === 'jpeg' ? 'jpg' : 'webp'
  for (const w of widths) {
    const h = P.box ? P.box[1] : P.square ? w : Math.round((H / W) * w)
    const name = `${hash}-${w}.${ext}`
    const file = path.join(outDir, name)
    if (!fs.existsSync(file)) {
      let img = sharp(input, { failOn: 'error' }).rotate()
      img = P.box ? img.resize(w, h, { fit: 'cover', position: 'attention' })
        : P.square ? img.resize(w, w, { fit: 'cover', position: 'attention' }) : img.resize(w)
      img = P.format === 'jpeg' ? img.jpeg({ quality: P.quality, mozjpeg: true }) : img.webp({ quality: P.quality, effort: 5 })
      await img.toFile(file)   // withMetadata 를 부르지 않는다
    }
    await assertClean(file)
    variants.push({ w, h, url: `${urlBase}/${name}`, bytes: fs.statSync(file).size })
  }
  const largest = variants[variants.length - 1]
  return { src: norm, preset, width: largest.w, height: largest.h, variants, originalBytes: input.length, hash }
}

// ---------- 빌드 단계로 실행될 때 ----------
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const OUT = path.join(ROOT, 'out')
  const MEDIA_DIR = path.join(ROOT, '..', 'web', 'public', 'media')
  const jobs = []

  const profilePath = path.join(OUT, 'profile.json')
  if (fs.existsSync(profilePath)) {
    const profile = JSON.parse(fs.readFileSync(profilePath, 'utf8'))
    if (profile.avatar) jobs.push({ key: 'avatar', rel: profile.avatar, preset: 'avatar' })
  }

  // 사진 기록 — 사진마다 크게 보기용(photo), 글의 첫 사진은 목록 격자용 정사각(thumb)도
  const lifePath = path.join(OUT, 'life.json')
  if (fs.existsSync(lifePath)) {
    const { posts } = JSON.parse(fs.readFileSync(lifePath, 'utf8'))
    const seen = new Set()
    for (const p of posts) {
      p.photos.forEach((ph, i) => {
        if (!seen.has(ph.src)) { seen.add(ph.src); jobs.push({ key: `life:${ph.src}`, rel: ph.src, preset: 'photo' }) }
        if (i === 0 && !seen.has('thumb:' + ph.src)) {
          seen.add('thumb:' + ph.src)
          jobs.push({ key: `life-thumb:${ph.src}`, rel: ph.src, preset: 'thumb' })
          jobs.push({ key: `life-og:${ph.src}`, rel: ph.src, preset: 'og' })
        }
      })
    }
  }

  const manifest = {}
  const errors = []
  for (const j of jobs) {
    try {
      manifest[j.key] = await processImage(j.rel, j.preset, { outDir: MEDIA_DIR })
    } catch (e) {
      errors.push(`${j.key} (${j.rel}) — ${e.message}`)
    }
  }
  if (errors.length) {
    console.error(`\n  ✗ 이미지 — ${errors.length}건`)
    for (const e of errors) console.error(`    ${e}`)
    process.exit(1)
  }

  // 더 이상 쓰지 않는 결과 파일은 지운다 (사진을 바꾸거나 뺐을 때)
  const keep = new Set(Object.values(manifest).flatMap(m => m.variants.map(v => path.basename(v.url))))
  let removed = 0
  if (fs.existsSync(MEDIA_DIR)) {
    for (const f of fs.readdirSync(MEDIA_DIR)) {
      if (/\.(webp|jpg)$/.test(f) && !keep.has(f)) { fs.rmSync(path.join(MEDIA_DIR, f)); removed++ }
    }
  }
  fs.writeFileSync(path.join(OUT, 'media.json'), JSON.stringify(manifest, null, 2))

  const list = Object.entries(manifest)
  if (!list.length) console.log('\n  이미지 — 처리할 이미지 없음 (프로필 이미지는 임시 그림으로)')
  else {
    console.log(`\n  이미지 — ${list.length}개 · 메타데이터 삭제 확인${removed ? ` · 안 쓰는 파일 ${removed}개 삭제` : ''}`)
    for (const [k, m] of list) {
      const out = m.variants.reduce((s, v) => s + v.bytes, 0)
      console.log(`    ${k}: ${m.src} ${(m.originalBytes / 1024).toFixed(0)}KB → ${m.variants.map(v => v.w).join('/')}px ${(out / 1024).toFixed(0)}KB`)
    }
  }
}
