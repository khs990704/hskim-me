import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { getDoc } from '../../../lib/content'
import DocPage from '../../../components/DocPage'

export function generateMetadata(): Metadata {
  const doc = getDoc('portfolio')
  if (!doc) return {}
  return {
    title: doc.title,
    description: doc.description,
    alternates: { canonical: '/portfolio' },
  }
}

export default function Page() {
  const doc = getDoc('portfolio')
  if (!doc) notFound()
  return <DocPage doc={doc} />
}
