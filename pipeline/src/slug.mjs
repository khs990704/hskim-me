// 슬러그 2계층 (D-09)
//
//  internal slug : Quartz 의미론. 위키링크 해석 전용. 폴더 번호 접두사를 포함한다.
//                  예) 01-knowledge-db/02-software-engineering/02-frontend/react
//  public route  : 사이트 URL. 번호 접두사를 걷어내고 최상위를 라우트로 치환한다.
//                  예) notes/software-engineering/frontend/react
//
// 둘을 분리하는 이유: 링크 해석은 Quartz 규칙을 그대로 따라야 정확하고,
// URL 은 사람이 읽고 검색 엔진이 색인하는 대상이라 다른 기준이 필요하다.
import { ROUTES, DROP_SEGMENTS } from '../config.mjs'

const stripOrder = seg => seg.replace(/^\d{2}\s+/, '')

/** URL 세그먼트 정규화. 한글은 그대로 두고 소문자·하이픈만 정리한다 (D-09) */
export function normalizeSegment(seg) {
  return seg.trim().toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[&]/g, '')
    .replace(/[?#\[\]<>:"|*\\]/g, '')
    .replace(/-{2,}/g, '-')
    .replace(/^-|-$/g, '')
}

export function publicRoute(relPath) {
  const parts = relPath.replace(/\.md$/, '').split('/')
  const top = parts[0]
  const mapping = ROUTES.find(r => r.prefix === top)
  let rest = parts.slice(1).map(stripOrder)
    .filter(seg => !DROP_SEGMENTS.includes(seg.toLowerCase()))
  // 폴더명과 같은 이름의 단독 문서(03 Portfolio/Portfolio.md)는 라우트 루트로
  if (rest.length === 1 && rest[0].toLowerCase() === stripOrder(top).toLowerCase()) rest = []
  // 폴더 노트(Studiary/Studiary.md)는 마지막 중복 세그먼트를 접는다 → studiary
  if (rest.length >= 2 && rest[rest.length - 1].toLowerCase() === rest[rest.length - 2].toLowerCase()) {
    rest = rest.slice(0, -1)
  }

  // MOC 같은 폴더 직속 문서는 라우트 루트에 둔다.
  const tail = rest.map(normalizeSegment)
  return [mapping?.route ?? 'notes', ...tail].filter(Boolean).join('/')
}

export function kindOf(relPath) {
  const top = relPath.split('/')[0]
  return ROUTES.find(r => r.prefix === top)?.kind ?? 'note'
}
