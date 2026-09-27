import type { Metadata } from 'next'

/**
 * 링크 미리보기(Open Graph·트위터 카드) 메타데이터.
 *
 * 이미지는 빌드 때 scripts/gen-og.mjs 가 페이지마다 만든다.
 *   문서      /og/<route>.jpg
 *   메인·목록  /og/_site.jpg, _notes, _projects, _index
 *
 * Next.js 는 부모의 openGraph 를 자식이 통째로 덮어쓴다. 페이지마다 이 함수를
 * 거쳐야 이미지가 빠지지 않는다.
 */
export function social(
  image: string,
  title: string,
  description: string,
  type: 'article' | 'website' = 'article',
): Pick<Metadata, 'openGraph' | 'twitter'> {
  const url = `/og/${image}.jpg`
  return {
    openGraph: {
      title, description, type,
      siteName: 'hskim.me',
      locale: 'ko_KR',
      images: [{ url, width: 1200, height: 630, alt: title }],
    },
    twitter: { card: 'summary_large_image', title, description, images: [url] },
  }
}
