// 검색 색인 생성.
//
// 라이브러리를 쓰지 않는다. 문서가 485개 규모라 전체를 훑어도 1ms 남짓이고,
// 색인 구축 시간도 들지 않는다. 한국어 처리도 직접 다루는 편이 낫다.
// (기획 §4 는 FlexSearch 를 적었으나, 이 규모에서는 이점이 없어 바꿨다)
//
// 본문 전체를 담는다. 부분만 담으면 '분명 있는데 안 나오는' 상황이 생기고,
// 검색에서 그건 느린 것보다 나쁘다. 색인은 검색을 처음 열 때만 받는다.
import fs from 'node:fs'
import path from 'node:path'
import { ROOT } from '../config.mjs'
import { META_LINE } from './meta-line.mjs'

const OUT = path.join(ROOT, 'out')

function walk(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name)
    if (e.isDirectory()) walk(p, out)
    else if (e.name.endsWith('.json')) out.push(p)
  }
  return out
}

const plain = html =>
  html
    .replace(/<(script|style)[\s\S]*?<\/\1>/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&[a-z]+;|&#x?[0-9a-f]+;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim()

/**
 * 본문에서 실제 문장이 시작하는 위치.
 *
 * 본문은 제목으로 시작하고, 프로젝트 노트는 그 밑에 '기간: … 관련 기술: …'
 * 한 줄이 더 붙는다. 제목으로 찾은 결과는 첫 일치가 0번 위치라 발췌가
 * 이 라벨 줄에서 시작해 버린다. 읽을 것이 없는 문단이다.
 *
 * 이 위치를 함께 실어 두면 검색 쪽에서 그 앞의 일치를 건너뛸 수 있다.
 * 색인에서 라벨 줄을 빼는 방법도 있지만, 그러면 'PostgreSQL' 로
 * 프로젝트를 찾지 못하게 된다. 찾기는 되고 보여주기만 비껴가야 한다.
 */
const leadOffset = (html, body) => {
  const re = /<p[^>]*>([\s\S]*?)<\/p>/g
  let m
  while ((m = re.exec(html))) {
    const t = plain(m[1])
    if (t.length < 20 || META_LINE.test(t)) continue
    const at = body.indexOf(t.slice(0, 40))
    return at > 0 ? at : 0
  }
  return 0
}

const docs = walk(path.join(OUT, 'content'))
  .map(f => JSON.parse(fs.readFileSync(f, 'utf8')))
  .sort((a, b) => a.route.localeCompare(b.route))

const index = docs.map(d => {
  const b = plain(d.html)
  return {
    r: d.route,
    t: d.title,
    k: d.kind,
    c: d.category.map(s => s.replace(/^\d{2}\s+/, '')).join(' / '),
    d: d.description,
    h: d.toc.map(x => x.text).join(' '),
    b,
    o: leadOffset(d.html, b),
  }
})

fs.writeFileSync(path.join(OUT, 'search-index.json'), JSON.stringify(index))
const size = fs.statSync(path.join(OUT, 'search-index.json')).size
console.log(`\n  검색 색인 — 문서 ${index.length}개 · ${(size / 1024).toFixed(0)}KB\n`)
