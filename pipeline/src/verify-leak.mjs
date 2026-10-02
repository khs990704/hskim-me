// 공개 산출물 전체에 비공개 회사 케이스의 '문서 이름'이 남아 있는지 최종 확인.
// 기술 용어(OP-TEE, ML-KEM 등)는 공개 기술이므로 지식 노트에 있는 것은 정상이다.
// 여기서 찾는 것은 '회사 케이스 문서의 제목'이다.
import fs from 'node:fs'
import path from 'node:path'
import { ROOT } from '../config.mjs'

import { privateTitles } from './private-titles.mjs'

const titles = privateTitles()

function walk(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name)
    e.isDirectory() ? walk(p, out) : out.push(p)
  }
  return out
}

const hits = []
for (const f of walk(path.join(ROOT, 'out', 'content'))) {
  const doc = JSON.parse(fs.readFileSync(f, 'utf8'))
  const text = doc.html.replace(/<[^>]+>/g, ' ')
  for (const t of titles) {
    if (text.includes(t)) hits.push({ route: doc.route, title: t })
  }
}

console.log(`\n  비공개 회사 케이스 제목 ${titles.length}종 / 공개 문서 전수 검사`)
if (!hits.length) {
  console.log('  남아 있는 참조 없음\n')
} else {
  const by = {}
  for (const h of hits) (by[h.route] ??= []).push(h.title)
  console.log(`  ⚠ ${hits.length}건 발견\n`)
  for (const [route, ts] of Object.entries(by)) console.log(`    ${route}\n      ${[...new Set(ts)].join(', ')}`)
  console.error('\n  빌드 중단: 공개 산출물에 비공개 회사 케이스 제목이 남아 있습니다.')
  console.error('  exclude-sections.txt 를 조정하거나 해당 참조를 정리한 뒤 다시 빌드하세요.\n')
  process.exit(1)
}
