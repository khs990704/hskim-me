import { notFound } from 'next/navigation'
import { social } from '../../../lib/og'
import type { Metadata } from 'next'
import { getDoc } from '../../../lib/content'
import DocPage from '../../../components/DocPage'

export function generateMetadata(): Metadata {
  const doc = getDoc('about')
  return {
    title: '소개',
    description: doc?.description || '김희섭 — 지식 노트와 프로젝트 기록',
    alternates: { canonical: '/about' },
    ...social('about', '소개', doc?.description || '김희섭 — 지식 노트와 프로젝트 기록'),
  }
}

export default function Page() {
  const doc = getDoc('about')
  if (!doc) notFound()
  return <DocPage doc={doc} />
}
