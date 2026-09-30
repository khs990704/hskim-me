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

/** 사진 한 장을 카드로 쓰는 페이지 (사진 기록 글). 파이프라인이 만든 1200×630 JPEG 를 그대로 쓴다 */
export function socialPhoto(
  image: { url: string; w: number; h: number } | null,
  title: string,
  description: string,
): Pick<Metadata, 'openGraph' | 'twitter'> {
  if (!image) return social('_site', title, description)
  return {
    openGraph: {
      title, description, type: 'article',
      siteName: 'hskim.me',
      locale: 'ko_KR',
      images: [{ url: image.url, width: image.w, height: image.h, alt: title }],
    },
    twitter: { card: 'summary_large_image', title, description, images: [image.url] },
  }
}
