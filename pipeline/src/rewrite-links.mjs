// hast 내부 링크의 href 를 공개 URL 로 치환한다.
//
// Quartz 가 만든 <a class="internal" data-slug="..."> 의 href 는 내부 슬러그 기준 상대 경로다.
// 프론트엔드가 쓰는 주소 체계(D-09 공개 URL)와 다르므로 파이프라인에서 바꿔 준다.
// 해석 실패한 링크는 제거하지 않고 data-broken 을 붙여, 화면에서 어떻게 다룰지
// 프론트엔드가 결정할 수 있게 남긴다.
import { visit } from 'unist-util-visit'

/**
 * 경로로 쓴 위키링크의 표시 글자를 끝 이름으로 줄인다.
 *
 * Obsidian 은 [[01 Knowledge DB/03 Infrastructure/04 Containers/Docker]] 를
 * 'Docker' 로 보여준다. 변환기는 별칭이 없으면 링크 대상을 그대로 글자로 써서
 * 사이트에는 Vault 경로 전체가 보였다(121개 링크, 66페이지).
 *
 * 변환기는 이런 링크에도 alias 클래스를 붙이므로 클래스로는 가를 수 없다.
 * 글자가 링크 대상 경로와 같을 때만 줄인다. 작성자가 단 별칭(|)은 경로와
 * 다르므로 그대로 남는다.
 */
const asSlug = t => t.trim().toLowerCase().replace(/\s+/g, '-')

// 폴더 노트(X/X.md)는 대상이 X/index 로 잡힌다. 둘 다 X 로 맞춰 비교한다
const folderNote = p => p
  .replace(/\/index$/, '')
  .replace(/(^|\/)([^/]+)\/\2$/, '$1$2')

function shortenPathLabel(node) {
  const kids = node.children ?? []
  if (kids.length !== 1 || kids[0].type !== 'text') return
  const text = kids[0].value
  if (!text.includes('/')) return
  const [pathPart, heading] = text.split('#')
  const slugPath = String(node.properties?.['data-slug'] ?? '').split('#')[0]
  if (folderNote(asSlug(pathPart)) !== folderNote(slugPath)) return
  const name = pathPart.split('/').filter(Boolean).pop()
  if (name) kids[0].value = heading ? `${name} > ${heading}` : name
}

export function rewriteLinks(tree, { resolve, slugToRoute }) {
  const outgoing = new Set()
  visit(tree, 'element', node => {
    if (node.tagName !== 'a') return
    const slug = node.properties?.['data-slug']
    if (!slug) return
    shortenPathLabel(node)

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
