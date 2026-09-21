import type { Metadata } from 'next'
import { getDoc } from '../../../lib/content'
import SectionPage from '../../../components/SectionPage'

export function generateMetadata(): Metadata {
  const doc = getDoc('notes')
  return {
    title: doc?.title ?? '지식 노트',
    description: doc?.description ?? '지식 노트 목록',
    alternates: { canonical: '/notes' },
  }
}

export default function Page() {
  return <SectionPage route="notes" title="지식 노트" />
}
