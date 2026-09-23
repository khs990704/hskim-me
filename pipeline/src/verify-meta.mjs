// 검색 결과에 그대로 나가는 글을 검사한다.
//
// 설명(description)은 구글 스니펫과 사이트 내 검색 결과, 링크 미리보기에
// 그대로 실린다. 본문과 달리 눈에 잘 띄지 않아 비거나 망가져도 모르고 지나간다.
// 빌드를 멈춰서 알아차리게 한다.
//
// 중단(error)  — 비었거나, 사람이 읽을 문장이 아니거나, 잘려 나간 것
// 경고(warn)   — 짧거나, 제목이 겹치는 것. 판단이 필요해 사람이 봐야 한다
import fs from 'node:fs'
import path from 'node:path'
import { ROOT } from '../config.mjs'
import { META_LINE } from './meta-line.mjs'

const CONTENT = path.join(ROOT, 'out', 'content')

/** 이보다 짧으면 스니펫이 한 줄도 못 채운다 */
const SHORT = 30
/** 구글이 잘라 내기 시작하는 대략의 길이 */
const LONG = 180


function walk(dir, out = []) {
  if (!fs.existsSync(dir)) return out
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name)
    if (e.isDirectory()) walk(p, out)
    else if (e.name.endsWith('.json')) out.push(JSON.parse(fs.readFileSync(p, 'utf8')))
  }
  return out
}

const docs = walk(CONTENT)
const errors = []
const warns = []

for (const d of docs) {
  const desc = (d.description ?? '').trim()
  if (!desc) errors.push([d.route, '설명이 비었습니다'])
  else if (META_LINE.test(desc)) errors.push([d.route, `메타 나열로 시작합니다 — ${desc.slice(0, 40)}…`])
  else if (desc.length > LONG) errors.push([d.route, `설명이 ${desc.length}자입니다 (${LONG}자 이하)`])
  else if (desc.length < SHORT) warns.push([d.route, `설명이 ${desc.length}자로 짧습니다 — ${desc}`])

  if (!(d.title ?? '').trim()) errors.push([d.route, '제목이 비었습니다'])
}

// 제목이 겹치면 검색 결과와 그래프에서 구분되지 않는다.
// 다만 포트폴리오 항목과 그 원본 프로젝트 케이스는 일부러 같은 이름을 쓰고
// related 로 서로를 가리킨다. 이 짝은 넘어간다.
const byTitle = new Map()
for (const d of docs) {
  if (!byTitle.has(d.title)) byTitle.set(d.title, [])
  byTitle.get(d.title).push(d)
}
for (const [title, group] of byTitle) {
  if (group.length < 2) continue
  const paired = group.every(d =>
    group.some(o => o !== d && (d.related ?? []).some(r => r.route === o.route)))
  if (paired) continue
  warns.push([group.map(d => d.route).join(' , '), `제목이 겹칩니다 — ${title}`])
}

console.log(`\n  메타데이터 검사 — 문서 ${docs.length}개`)

if (warns.length) {
  console.warn(`\n  경고 ${warns.length}건`)
  for (const [where, why] of warns) console.warn(`    ${where}\n      ${why}`)
}

if (errors.length) {
  console.error(`\n  ⚠ 중단 ${errors.length}건`)
  for (const [where, why] of errors) console.error(`    ${where}\n      ${why}`)
  console.error('\n  해당 노트의 첫 문단을 손보거나, 표뿐인 페이지는 config.mjs 의 ROUTE_DESCRIPTIONS 에 설명을 넣으세요.\n')
  process.exit(1)
}

console.log(warns.length ? '  중단할 문제는 없습니다\n' : '  문제 없습니다\n')
