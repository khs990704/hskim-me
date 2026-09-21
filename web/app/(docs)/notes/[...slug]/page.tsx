import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { allDocs, getDoc } from '../../../../lib/content'
import DocPage from '../../../../components/DocPage'

type Props = { params: Promise<{ slug: string[] }> }

export function generateStaticParams() {
  return allDocs()
    .filter(d => d.route.startsWith('notes/'))
    .map(d => ({ slug: d.route.split('/').slice(1) }))
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const doc = getDoc('notes/' + slug.map(decodeURIComponent).join('/'))
  if (!doc) return {}
  return {
    title: doc.title,
    description: doc.description,
    alternates: { canonical: '/' + doc.route },
    openGraph: { title: doc.title, description: doc.description, type: 'article' },
  }
}

export default async function Page({ params }: Props) {
  const { slug } = await params
  const doc = getDoc('notes/' + slug.map(decodeURIComponent).join('/'))
  if (!doc) notFound()
  return <DocPage doc={doc} />
}
