// 사진 기록 데이터 — pipeline/src/life.mjs 가 만든 out/life.json 과 media.json 의 사진 변환 결과를 합친다 (빌드 시점).
import fs from 'node:fs'
import path from 'node:path'
import { getMedia, type MediaEntry } from './profile'

const OUT = path.join(process.cwd(), '..', 'pipeline', 'out')

type RawPost = {
  id: string; slug: string; name: string; heading: string; description: string
  date: string; category: string; place: string; map: [number, number] | null; tags: string[]
  until?: string; spot?: string; title?: string; venue?: string; sport?: string; record?: string
  photos: { src: string; alt: string }[]
  text: string[]
}
export type LifePhoto = { alt: string; width: number; height: number; variants: MediaEntry['variants'] }
export type LifePost = Omit<RawPost, 'photos'> & {
  photos: LifePhoto[]
  thumb: MediaEntry['variants'] | null
  /** 링크 미리보기 카드 (1200×630 JPEG) */
  og: MediaEntry['variants'][number] | null
}
export type Life = { categories: string[]; posts: LifePost[] }

let cache: Life | null = null
export function getLife(): Life {
  // 빌드에서는 한 번만 읽는다. 개발 서버는 파이프라인을 다시 돌려도 새 글을 보여 주도록 매번 읽는다
  if (cache && process.env.NODE_ENV === 'production') return cache
  const f = path.join(OUT, 'life.json')
  if (!fs.existsSync(f)) return (cache = { categories: [], posts: [] })
  const raw = JSON.parse(fs.readFileSync(f, 'utf8')) as { categories: string[]; posts: RawPost[] }
  const media = getMedia()
  const posts = raw.posts.map(p => {
    const photos = p.photos.flatMap(ph => {
      const m = media[`life:${ph.src}`]
      return m ? [{ alt: ph.alt, width: m.width, height: m.height, variants: m.variants }] : []
    })
    const first = p.photos[0]?.src
    return {
      ...p,
      tags: p.tags ?? [],
      photos,
      thumb: media[`life-thumb:${first}`]?.variants ?? null,
      og: media[`life-og:${first}`]?.variants[0] ?? null,
    }
  }).filter(p => p.photos.length)
  return (cache = { categories: raw.categories, posts })
}

export { fmtDate, when } from './life-format'
