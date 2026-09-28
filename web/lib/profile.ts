// 파이프라인이 만든 프로필 · 캐릭터 · 이미지 데이터를 읽는다 (빌드 시점).
// 형식은 pipeline/src/profile.mjs · character.mjs · media.mjs 가 정한다.
import fs from 'node:fs'
import path from 'node:path'

const OUT = path.join(process.cwd(), '..', 'pipeline', 'out')
const read = <T,>(name: string): T | null => {
  const f = path.join(OUT, name)
  return fs.existsSync(f) ? (JSON.parse(fs.readFileSync(f, 'utf8')) as T) : null
}

export type Period = { from: string; to: string | null }
export type ProjectRef = { slug: string; route: string; title: string; description: string; category: string[] }
export type Cert = { name: string; nameAlt: string; issuer: string; date: string; kind: 'license' | 'course'; field: string | null; urls: string[] }

export type Profile = {
  name: string
  nameEn: string
  class: string
  tagline: string
  title: string
  avatar: string
  links: Record<string, string>
  career: (Period & { org: string; role: string; note: string })[]
  education: (Period & { org: string; major: string; note: string })[]
  training: (Period & { org: string; name: string; note: string })[]
  certs: Cert[]
  featured: ProjectRef[]
  traits: { name: string; desc: string; projects: ProjectRef[] }[]
  records: { id: string; date: string | null; note: string }[]
  sections: Record<string, string>
}

export type Rarity = 'common' | 'rare' | 'epic' | 'legendary'
export type Achievement = {
  id: string
  group: string
  groupLabel: string
  title: string
  cond: string
  rarity: Rarity
  rarityLabel: string
  hidden: boolean
  state: 'done' | 'progress' | 'locked' | 'unknown'
  value?: number | null
  target?: number
  date?: string | null
  note?: string | null
}
export type Stat = { key: string; label: string; value: number; projects: string[] }
export type Skill = { name: string; domain: string | null; projects: string[] }

export type Character = {
  level: number
  xp: number
  xpLevelStart: number
  xpNextLevel: number
  xpRules: { key: string; label: string; each: number; count: number; xp: number }[]
  xpFormula: string
  stats: Stat[]
  tools: Skill[]
  languages: Skill[]
  projects: { name: string; category: string; route: string | null }[]
  achievements: Achievement[]
  summary: Record<'done' | 'progress' | 'locked' | 'unknown', number>
}

export type MediaEntry = { src: string; width: number; height: number; variants: { w: number; h: number; url: string }[] }

export const getProfile = () => read<Profile>('profile.json')
export const getCharacter = () => read<Character>('character.json')
export const getMedia = () => read<Record<string, MediaEntry>>('media.json') ?? {}

/** 스탯창 픽셀 글꼴 — scripts/gen-pixel-font.mjs 가 만든다. 없으면 Pretendard 로만 보인다 */
export type PixelFont = { family: string; files: Record<string, { url: string; weight: number }> }
export function getPixelFont(): PixelFont | null {
  const f = path.join(process.cwd(), 'lib', 'pixel-font.generated.json')
  return fs.existsSync(f) ? (JSON.parse(fs.readFileSync(f, 'utf8')) as PixelFont) : null
}
