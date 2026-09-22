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

const docs = walk(path.join(OUT, 'content'))
  .map(f => JSON.parse(fs.readFileSync(f, 'utf8')))
  .sort((a, b) => a.route.localeCompare(b.route))

const index = docs.map(d => ({
  r: d.route,
  t: d.title,
  k: d.kind,
  c: d.category.map(s => s.replace(/^\d{2}\s+/, '')).join(' / '),
  d: d.description,
  h: d.toc.map(x => x.text).join(' '),
  b: plain(d.html),
}))

fs.writeFileSync(path.join(OUT, 'search-index.json'), JSON.stringify(index))
const size = fs.statSync(path.join(OUT, 'search-index.json')).size
console.log(`\n  검색 색인 — 문서 ${index.length}개 · ${(size / 1024).toFixed(0)}KB\n`)
