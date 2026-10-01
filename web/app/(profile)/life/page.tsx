import type { Metadata } from 'next'
import { social } from '../../../lib/og'
import { getLife } from '../../../lib/life'
import LifeGallery from '../../../components/life/LifeGallery'

const DESCRIPTION = '여행 · 음식 · 카페 · 전시·공연 · 운동 — 일 밖에서 남긴 사진 기록'

export const metadata: Metadata = {
  title: '일상',
  description: DESCRIPTION,
  alternates: { canonical: '/life' },
  ...social('_site', '일상', DESCRIPTION),
}

/**
 * 사진 기록 목록 (/life). 글마다 페이지가 따로 있다 (/life/<주소>). 지식 그래프 · 검색 · 문서 트리와 분리돼 있다 — 헤더와 소개의 사이드 퀘스트에서만 들어온다.
 * 사진은 파이프라인이 위치 · 기기 정보를 지우고 크기별로 만든 것만 쓴다 (pipeline/src/life.mjs · media.mjs).
 */
export default function Page() {
  const { categories, posts } = getLife()
  return (
    <div className="mx-auto max-w-[960px] px-4 pb-24 pt-8 sm:px-8">
      <h1 className="text-[26px] font-semibold tracking-tight text-[var(--fg-strong)]">일상</h1>
      <p className="mb-6 mt-1.5 text-[14px] text-[var(--fg-dim)]">{DESCRIPTION}</p>
      {/* 목록에는 격자에 필요한 것만 넘긴다 — 사진 전부 · 글을 넘기면 페이지 데이터가 불어난다 */}
      <LifeGallery
        categories={categories}
        posts={posts.map(p => ({ slug: p.slug, date: p.date, until: p.until, category: p.category, place: p.place, heading: p.heading, tags: p.tags, count: p.photos.length, thumb: p.thumb }))}
      />
    </div>
  )
}
