export type SearchDoc = {
  r: string   // route
  t: string   // title
  k: string   // kind
  c: string   // category
  d: string   // description
  h: string   // headings
  b: string   // body
  o: number   // body 에서 제목·라벨 줄을 지나 문장이 시작하는 위치
}

export type Hit = { doc: SearchDoc; score: number; snippet: string; terms: string[] }

/** 한 쪽에 보여줄 개수 */
export const PAGE_SIZE = 30

export type Results = { hits: Hit[]; total: number }

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

/** 검색·비교용 정규화. 공백을 지워 '단어 사이 띄어쓰기' 차이를 흡수한다 */
const norm = (s: string) => s.toLowerCase().replace(/[\s\u200b]+/g, '')

/**
 * 문서마다 정규화한 필드를 한 번만 만들어 둔다.
 *
 * 색인 본문을 다 합치면 1.3MB 다. 글쇠 하나마다 485개 문서를 새로 정규화하면
 * 그만큼의 문자열을 매번 새로 만들게 된다. 색인은 한 번 받아 두고 바뀌지
 * 않으므로 문서 객체에 매달아 둔다.
 */
type Fields = { t: string; h: string; d: string; b: string }
const cache = new WeakMap<SearchDoc, Fields>()

function fields(doc: SearchDoc): Fields {
  let f = cache.get(doc)
  if (!f) {
    f = { t: norm(doc.t), h: norm(doc.h), d: norm(doc.d), b: norm(doc.b) }
    cache.set(doc, f)
  }
  return f
}

/** 정규화한 본문에서 검색어가 몇 번 나오는지 (상한까지만 센다) */
function countUpTo(hay: string, needle: string, max: number): number {
  let n = 0
  for (let i = hay.indexOf(needle); i >= 0 && n < max; i = hay.indexOf(needle, i + needle.length)) n++
  return n
}

/**
 * 어디에서 맞았는지에 따라 점수를 다르게 준다.
 *
 * 제목이 맞는 것과 본문 어딘가에 스쳐 나오는 것은 의미가 다르다.
 * 사용자는 보통 '그 문서'를 찾으려고 검색한다.
 */
const WEIGHT = { titleExact: 1000, titleStart: 400, title: 200, headings: 60, description: 40, body: 10 }

/** 본문 점수는 등장 횟수를 반영하되 여기까지만. 제목 일치를 넘어서면 안 된다 */
const BODY_CAP = 8

export function search(docs: SearchDoc[], query: string, page = 0): Results {
  let terms = query.trim().split(/\s+/).filter(Boolean).map(norm)
  if (!terms.length) return { hits: [], total: 0 }

  let scored = rank(docs, terms)

  // 한 단어로 붙여 쓴 한글은 못 찾을 수 있다. '데이터전처리' 는 노트 어디에도
  // 그대로 붙어 있지 않지만 '데이터' 와 '전처리' 로는 38개가 나온다.
  // 결과가 없을 때만, 붙여 쓴 말을 둘로 갈라 다시 찾아본다.
  if (!scored.length) {
    const alt = splitFallback(docs, terms)
    if (alt) ({ terms, scored } = alt)
  }

  // 발췌는 보여줄 쪽의 것만 만든다. 넓게 걸리는 검색어는 수백 개가 맞는다
  const from = page * PAGE_SIZE
  const hits = scored.slice(from, from + PAGE_SIZE).map(({ doc, score, titleHit }) => ({
    doc,
    score,
    snippet: snippetFor(doc, terms, titleHit),
    terms,
  }))
  return { hits, total: scored.length }
}

/**
 * 붙여 쓴 한글 한 낱말을 둘로 갈라 본다.
 *
 * 형태소 분석 없이 가능한 모든 자리에서 잘라 보고 가장 많이 맞는 쪽을 쓴다.
 * 결과가 0건일 때만 돌기 때문에 평소 검색 속도에는 영향이 없다.
 */
function splitFallback(docs: SearchDoc[], terms: string[]): { terms: string[]; scored: Scored[] } | null {
  if (terms.length !== 1) return null
  const w = terms[0]
  if (w.length < 4 || w.length > 12 || !/^[가-힣]+$/.test(w)) return null

  let best: { terms: string[]; scored: Scored[] } | null = null
  for (let i = 2; i <= w.length - 2; i++) {
    const pair = [w.slice(0, i), w.slice(i)]
    const scored = rank(docs, pair)
    if (scored.length > (best?.scored.length ?? 0)) best = { terms: pair, scored }
  }
  return best
}

type Scored = { doc: SearchDoc; score: number; titleHit: boolean }

function rank(docs: SearchDoc[], terms: string[]): Scored[] {
  const scored: Scored[] = []

  for (const doc of docs) {
    const { t, h, d, b } = fields(doc)

    let score = 0
    let titleHit = false
    // 모든 검색어가 어딘가에는 있어야 한다 (AND)
    for (const term of terms) {
      let s = 0
      if (t === term) { s = WEIGHT.titleExact; titleHit = true }
      else if (t.startsWith(term)) { s = WEIGHT.titleStart; titleHit = true }
      else if (t.includes(term)) { s = WEIGHT.title; titleHit = true }
      else if (h.includes(term)) s = WEIGHT.headings
      else if (d.includes(term)) s = WEIGHT.description

      // 본문은 위 판정과 별개로 '얼마나 다루는지' 를 더한다.
      // 스쳐 지나가듯 한 번 나오는 문서와 그 주제를 다루는 문서는 다르다.
      s += countUpTo(b, term, BODY_CAP) * WEIGHT.body

      if (!s) { score = 0; break }
      score += s
    }
    if (!score) continue

    // 짧은 제목이 더 정확한 일치일 가능성이 높다.
    // 제목이 맞았을 때만이다. 본문에 스친 문서에까지 주면 제목이 짧다는
    // 이유만으로 위로 올라온다.
    if (titleHit) score += Math.max(0, 40 - doc.t.length)

    scored.push({ doc, score, titleHit })
  }

  return scored.sort((a, b) => b.score - a.score)
}

/**
 * 검색 결과에 함께 보여줄 글.
 *
 * 제목이 맞은 문서는 요약을 보여준다. 찾던 문서가 맞는지는 이미 바로 위의
 * 제목이 말해 주고, 읽는 사람이 다음으로 궁금한 것은 '이게 무슨 글인가' 다.
 *
 * 그 외에는 검색어가 가장 많이 모인 자리를 보여준다. 첫 일치만 보고 자르면
 * 여러 단어로 찾았을 때 한 단어만 강조된 토막이 나와, 나머지 단어는 맞지도
 * 않은 것처럼 보인다.
 *
 * 본문은 제목으로 시작하고 프로젝트 노트는 그 밑에 '기간: … 관련 기술: …'
 * 라벨 줄이 붙는다. 읽을 것이 없는 구간이라 doc.o 앞은 쓰지 않는다.
 */
const WINDOW = 160

function snippetFor(doc: SearchDoc, terms: string[], titleHit: boolean): string {
  if (titleHit || !doc.b) return doc.d
  const body = doc.b

  // 정규화하면서 공백이 지워졌으므로 원문 위치를 다시 찾는다
  const spots: { at: number; term: string }[] = []
  for (const term of terms) {
    const re = looseRegex(term)
    let found = 0
    for (let m = re.exec(body); m && found < 30; m = re.exec(body)) {
      if (m.index >= doc.o) { spots.push({ at: m.index, term }); found++ }
      if (re.lastIndex === m.index) re.lastIndex++   // 빈 일치로 멈추지 않게
    }
  }
  if (!spots.length) return doc.d

  let at = spots[0].at
  let bestCovered = 0
  for (const s of spots) {
    const from = s.at - 50
    const covered = new Set(
      spots.filter(x => x.at >= from && x.at < from + WINDOW).map(x => x.term),
    ).size
    if (covered > bestCovered) { bestCovered = covered; at = s.at }
  }

  const start = Math.max(doc.o, at - 50)
  return (start > doc.o ? '…' : '') + body.slice(start, start + WINDOW).trim() + '…'
}
