import { notFound } from 'next/navigation'
import { social } from '../../../lib/og'
import type { Metadata } from 'next'
import { getDoc } from '../../../lib/content'
import { getCharacter, getMedia, getPixelFont, getProfile } from '../../../lib/profile'
import ProfilePage from '../../../components/profile/ProfilePage'

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
  return <ProfilePage profile={profile} character={character} media={getMedia()} font={getPixelFont()} />
}
