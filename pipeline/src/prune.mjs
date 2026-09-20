// 비공개 문서 참조 정리.
//
// 링크 표시 방식만으로는 부족하다. MOC 같은 목차 성격의 문서는 표의 각 행이
// "비공개 케이스 이름 + 그게 무엇을 하는지"를 담고 있어서, 링크를 풀어도
// 회사 케이스 목록이 그대로 공개된다. 그래서 행·항목 단위로 걷어낸다.
//
// 규칙: 표의 행 또는 목록 항목이 비공개 대상만 참조하고
//       공개 문서로 가는 내부 링크가 하나도 없으면 그 행·항목을 제거한다.
//       제거 결과 표·목록이 비면 그것도 제거하고, 섹션이 비면 제목도 제거한다.
import { visit, SKIP } from 'unist-util-visit'

const isBroken = n => n.tagName === 'a' && n.properties?.['data-broken']
// 유효한 내부 링크 = 살아있는 다른 문서 링크(data-slug) 또는 살아있는 같은 문서 앵커(#...)
const isValidLink = n => {
  if (n.tagName !== 'a' || n.properties?.['data-broken']) return false
  if (n.properties?.['data-slug']) return true
  const href = n.properties?.href
  return typeof href === 'string' && href.startsWith('#') && href.length > 1
}

function scanLinks(node, acc = { broken: 0, valid: 0 }) {
  if (node.type === 'element') {
    if (isBroken(node)) acc.broken++
    else if (isValidLink(node)) acc.valid++
  }
  for (const c of node.children ?? []) scanLinks(c, acc)
  return acc
}

const textOf = node => {
  const out = []
  const go = n => { if (n.type === 'text') out.push(n.value); (n.children ?? []).forEach(go) }
  go(node)
  return out.join('').trim()
}

const hasContent = node =>
  node.type === 'element'
    ? ['img', 'pre', 'table', 'ul', 'ol', 'blockquote'].includes(node.tagName) || textOf(node).length > 0
    : node.type === 'text' && node.value.trim().length > 0

// 섹션 단위 제거. heading 과 그 하위 내용을 통째로 걷어낸다.
// 파일 단위 공개 규칙(D-01/D-06/D-08)만으로는 '같은 내용을 다른 파일이 다시 싣는' 경우를 못 막는다.
export function removeSections(tree, titles) {
  if (!titles.length) return { removed: [], deadAnchors: new Set() }
  const want = new Set(titles.map(t => t.trim()))
  const top = tree.children ?? []
  const level = n => (n.type === 'element' && /^h[1-6]$/.test(n.tagName) ? Number(n.tagName[1]) : 0)

  const removed = []
  const deadAnchors = new Set()
  for (let i = top.length - 1; i >= 0; i--) {
    const lv = level(top[i])
    if (!lv || !want.has(textOf(top[i]))) continue
    let end = i + 1
    while (end < top.length) {
      const l = level(top[end])
      if (l && l <= lv) break
      if (l) deadAnchors.add(top[end].properties?.id)   // 하위 제목도 앵커 대상에서 제외
      end++
    }
    deadAnchors.add(top[i].properties?.id)
    removed.push({ title: textOf(top[i]), nodes: end - i })
    top.splice(i, end - i)
  }
  deadAnchors.delete(undefined)
  return { removed, deadAnchors }
}

// 제거된 섹션을 가리키는 문서 내 앵커 링크를 비공개 링크와 같게 표시한다.
export function markDeadAnchors(tree, deadAnchors) {
  if (!deadAnchors.size) return 0
  let count = 0
  visit(tree, 'element', node => {
    if (node.tagName !== 'a') return
    const href = node.properties?.href
    if (typeof href !== 'string' || !href.startsWith('#')) return
    let id
    try { id = decodeURIComponent(href.slice(1)) } catch { id = href.slice(1) }
    if (!deadAnchors.has(id)) return
    node.properties['data-broken'] = 'true'
    node.properties.href = '#'
    count++
  })
  return count
}

export function pruneBrokenReferences(tree) {
  const removed = { rows: [], items: [], paragraphs: [], tables: 0, lists: 0, headings: 0 }

  // 1) 비공개 대상만 참조하는 표 행·목록 항목 제거
  visit(tree, 'element', (node, index, parent) => {
    if (!parent || index === undefined) return
    if (!['tr', 'li', 'p'].includes(node.tagName)) return
    const { broken, valid } = scanLinks(node)
    if (broken === 0 || valid > 0) return
    const bucket = node.tagName === 'tr' ? removed.rows : node.tagName === 'li' ? removed.items : removed.paragraphs
    bucket.push(textOf(node).slice(0, 90))
    parent.children.splice(index, 1)
    return [SKIP, index]
  })

  // 2) 비어버린 표·목록 제거
  visit(tree, 'element', (node, index, parent) => {
    if (!parent || index === undefined) return
    if (node.tagName === 'table') {
      const body = node.children.find(c => c.tagName === 'tbody')
      const rows = (body?.children ?? []).filter(c => c.tagName === 'tr')
      if (rows.length === 0) {
        removed.tables++
        parent.children.splice(index, 1)
        return [SKIP, index]
      }
    }
    if (node.tagName === 'ul' || node.tagName === 'ol') {
      if ((node.children ?? []).filter(c => c.tagName === 'li').length === 0) {
        removed.lists++
        parent.children.splice(index, 1)
        return [SKIP, index]
      }
    }
  })

  // 3) 내용이 사라진 섹션의 제목 제거
  const top = tree.children ?? []
  const level = n => (n.type === 'element' && /^h[1-6]$/.test(n.tagName) ? Number(n.tagName[1]) : 0)
  for (let i = top.length - 1; i >= 0; i--) {
    const lv = level(top[i])
    if (lv < 2) continue
    let empty = true
    for (let j = i + 1; j < top.length; j++) {
      const l = level(top[j])
      if (l && l <= lv) break
      if (l > lv) continue          // 하위 제목만 남은 것도 빈 것으로 본다
      if (hasContent(top[j])) { empty = false; break }
    }
    if (empty) {
      removed.headings++
      removed.rows.push(`[섹션] ${textOf(top[i])}`)
      top.splice(i, 1)
    }
  }

  return removed
}

// 남은 비공개 링크 처리 (결정: ①안 — 링크로 남기지 않는다).
//
//  - 표 셀·목록 항목 안: 열거된 항목이므로 이름째 제거한다.
//    비공개 프로젝트 이름만 남겨 두면 그것도 목록이 된다.
//  - 본문 문장 안: 단어를 지우면 문장이 깨지므로 평문으로만 되돌린다.
const ENUM_TAGS = new Set(['td', 'th', 'li'])
const SEP_ONLY = /^[\s,·、;]*$/

export function unwrapBrokenLinks(tree) {
  const stat = { unwrapped: 0, dropped: 0 }

  const walk = (node, inEnum) => {
    if (!node.children) return
    const enumHere = inEnum || (node.type === 'element' && ENUM_TAGS.has(node.tagName))
    const next = []
    let skipNextSeparator = false

    for (const child of node.children) {
      const isSeparator = child.type === 'text' && SEP_ONLY.test(child.value) && child.value.trim() !== ''

      if (skipNextSeparator && isSeparator) { skipNextSeparator = false; continue }
      skipNextSeparator = false

      if (child.type === 'element' && isBroken(child)) {
        if (enumHere) {
          stat.dropped++
          // 제거한 항목에 붙어 있던 구분자 하나만 같이 없앤다
          const last = next[next.length - 1]
          if (last && last.type === 'text' && SEP_ONLY.test(last.value) && last.value.trim() !== '') next.pop()
          else skipNextSeparator = true
          continue
        }
        stat.unwrapped++
        next.push(...child.children)
        continue
      }
      walk(child, enumHere)
      next.push(child)
    }

    // 앞뒤에 남은 구분자 정리
    while (next.length && next[0].type === 'text' && SEP_ONLY.test(next[0].value) && next[0].value.trim() !== '') next.shift()
    while (next.length && next.at(-1).type === 'text' && SEP_ONLY.test(next.at(-1).value) && next.at(-1).value.trim() !== '') next.pop()

    node.children = next
  }

  walk(tree, false)
  return stat
}
