// hast 내부 링크의 href 를 공개 URL 로 치환한다.
//
// Quartz 가 만든 <a class="internal" data-slug="..."> 의 href 는 내부 슬러그 기준 상대 경로다.
// 프론트엔드가 쓰는 주소 체계(D-09 공개 URL)와 다르므로 파이프라인에서 바꿔 준다.
// 해석 실패한 링크는 제거하지 않고 data-broken 을 붙여, 화면에서 어떻게 다룰지
// 프론트엔드가 결정할 수 있게 남긴다.
import { visit } from 'unist-util-visit'

export function rewriteLinks(tree, { resolve, slugToRoute }) {
  const outgoing = new Set()
  visit(tree, 'element', node => {
    if (node.tagName !== 'a') return
    const slug = node.properties?.['data-slug']
    if (!slug) return

    const [target, anchor] = String(slug).split('#')
    const r = resolve(target)
    if (r.status === 'ok') {
      const route = slugToRoute.get(r.slug)
      node.properties.href = '/' + route + (anchor ? '#' + anchor : '')
      outgoing.add(r.slug)
    } else {
      node.properties.href = '#'
      node.properties['data-broken'] = 'true'
      node.properties.className = [...(node.properties.className ?? []), 'broken']
    }
  })
  return outgoing
}
