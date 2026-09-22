export type SearchDoc = {
  r: string   // route
  t: string   // title
  k: string   // kind
  c: string   // category
  d: string   // description
  h: string   // headings
  b: string   // body
}

export type Hit = { doc: SearchDoc; score: number; snippet: string; terms: string[] }

/**
 * 검색어가 원문 어디에 있는지 찾는다.
 *
 * 비교는 공백을 지운 상태로 하는데(띄어쓰기 차이를 흡수하려고),
 * 강조는 원문 위에 해야 하므로 글자 사이에 공백이 끼어도 잡히는 패턴을 만든다.
 *   '모델서빙' → /모\s*델\s*서\s*빙/i
 */
export function looseRegex(term: string): RegExp {
  const body = term
    .split('')
    .map(c => c.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
    .join('\\s*')
  return new RegExp(body, 'gi')
}

/** 검색·비교용 정규화. 공백과 문장부호를 지워 '단어 사이 띄어쓰기' 차이를 흡수한다 */
const norm = (s: string) => s.toLowerCase().replace(/[\s​]+/g, '')

/**
 * 어디에서 맞았는지에 따라 점수를 다르게 준다.
 *
 * 제목이 맞는 것과 본문 어딘가에 스쳐 나오는 것은 의미가 다르다.
 * 사용자는 보통 '그 문서'를 찾으려고 검색한다.
 */
const WEIGHT = { titleExact: 1000, titleStart: 400, title: 200, headings: 60, description: 40, body: 10 }

export function search(docs: SearchDoc[], query: string, limit = 30): Hit[] {
  const terms = query.trim().split(/\s+/).filter(Boolean).map(norm)
  if (!terms.length) return []

  const hits: Hit[] = []
  for (const doc of docs) {
    const t = norm(doc.t)
    const h = norm(doc.h)
    const d = norm(doc.d)
    const b = norm(doc.b)

    let score = 0
    // 모든 검색어가 어딘가에는 있어야 한다 (AND)
    for (const term of terms) {
      let s = 0
      if (t === term) s = WEIGHT.titleExact
      else if (t.startsWith(term)) s = WEIGHT.titleStart
      else if (t.includes(term)) s = WEIGHT.title
      else if (h.includes(term)) s = WEIGHT.headings
      else if (d.includes(term)) s = WEIGHT.description
      else if (b.includes(term)) s = WEIGHT.body
      if (!s) { score = 0; break }
      score += s
    }
    if (!score) continue

    // 짧은 제목이 더 정확한 일치일 가능성이 높다
    score += Math.max(0, 40 - doc.t.length)
    hits.push({ doc, score, snippet: snippetFor(doc, terms[0]), terms })
  }

  return hits.sort((a, b) => b.score - a.score).slice(0, limit)
}

/** 검색어 주변 문맥. 없으면 요약을 쓴다 */
function snippetFor(doc: SearchDoc, term: string): string {
  const body = doc.b
  if (!body) return doc.d
  if (!norm(body).includes(term)) return doc.d
  // 정규화하면서 공백이 지워졌으므로 원문 위치를 다시 찾는다
  const m = looseRegex(term).exec(body)
  const at = m ? m.index : 0
  const start = Math.max(0, at - 50)
  return (start > 0 ? '…' : '') + body.slice(start, start + 160).trim() + '…'
}
