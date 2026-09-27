import type { Metadata } from 'next'
import { social } from '../../../lib/og'
import { getDoc } from '../../../lib/content'
import SectionPage from '../../../components/SectionPage'

export function generateMetadata(): Metadata {
  const doc = getDoc('projects')
  return {
    title: doc?.title ?? '프로젝트',
    description: doc?.description ?? '프로젝트 기록 목록',
    alternates: { canonical: '/projects' },
    ...social('_projects', doc?.title ?? '프로젝트', doc?.description ?? '프로젝트 기록 목록', 'website'),
  }
}

export default function Page() {
  return <SectionPage route="projects" title="프로젝트" />
}
