import { notFound } from 'next/navigation'
import { social } from '../../../lib/og'
import type { Metadata } from 'next'
import { getDoc } from '../../../lib/content'
import { getCharacter, getMedia, getPixelFont, getProfile } from '../../../lib/profile'
import ProfilePage from '../../../components/profile/ProfilePage'
import { getLife } from '../../../lib/life'

// 스탯창의 데이터는 Vault 03 Portfolio/Profile.md → pipeline(profile · character · media).
// 검색 · 트리 · 미리보기 이미지용 문서(about.json)도 같은 파일에서 만든다.
export function generateMetadata(): Metadata {
  const doc = getDoc('about')
  const description = doc?.description || '김희섭 — 지식 노트와 프로젝트 기록'
  return {
    title: '소개',
    description,
    alternates: { canonical: '/about' },
    ...social('about', '소개', description),
  }
}

export default function Page() {
  const profile = getProfile()
  const character = getCharacter()
  if (!profile || !character) notFound()
  // 사이드 퀘스트에 최근 일상 넷 — 사진 · 제목만 넘긴다 (본문 · 사진 전체는 싣지 않는다)
  const life = getLife().posts.slice(0, 4).map(p => ({ slug: p.slug, heading: p.heading, category: p.category, date: p.date, until: p.until, thumb: p.thumb }))
  return <ProfilePage profile={profile} character={character} media={getMedia()} font={getPixelFont()} life={life} />
}
