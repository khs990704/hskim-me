// 문서마다 처음 만든 날 · 마지막으로 고친 날 — Vault 의 git 이력에서 뽑는다 (RSS · 사이트맵용, 2026-10-02).
//
// Vault 는 obsidian-git 자동 백업이라 커밋 시각이 곧 쓴 시각에 가깝다.
// 폴더를 옮긴 노트가 옮긴 날 새로 만든 것처럼 보이지 않도록 이름 바뀜(R)을 따라간다.
// CI 는 Vault 를 전체 이력으로 받는다 (build-deploy.yml, fetch-depth: 0). 얕은 이력 · git 없음이면 빈 표를 쓰고 알린다.
import fs from 'node:fs'
import path from 'node:path'
import { execFileSync } from 'node:child_process'
import { VAULT } from '../config.mjs'

const OUT = path.join(path.dirname(new URL(import.meta.url).pathname), '..', 'out')
const CONTENT = path.join(OUT, 'content')

const walk = (dir, out = []) => {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name)
    if (e.isDirectory()) walk(p, out)
    else if (e.name.endsWith('.json')) out.push(p)
  }
  return out
}
const sources = new Set(walk(CONTENT).map(f => JSON.parse(fs.readFileSync(f, 'utf8')).source))

const git = args => execFileSync('git', ['-C', VAULT, '-c', 'core.quotepath=false', ...args], { encoding: 'utf8', maxBuffer: 128 << 20, stdio: ['ignore', 'pipe', 'ignore'] })

const dates = {}
try {
  if (git(['rev-parse', '--is-shallow-repository']).trim() === 'true') throw new Error('얕은 이력')
  // 오래된 커밋부터 — 만든 날은 처음 본 날, 고친 날은 마지막으로 본 날
  const log = git(['log', '--reverse', '-M', '--name-status', '--format=@@%cI', '--', '*.md'])
  const created = new Map(), updated = new Map()
  let day = ''
  for (const line of log.split('\n')) {
    if (line.startsWith('@@')) { day = line.slice(2, 12); continue }
    const [st, a, b] = line.split('\t')
    if (!st || !a) continue
    if (st[0] === 'R') {
      // 옮긴 노트는 옛 경로의 만든 날을 물려받는다
      created.set(b, created.get(a) ?? day); created.delete(a)
      updated.set(b, day); updated.delete(a)
    } else if (st === 'D') {
      created.delete(a); updated.delete(a)
    } else {
      if (!created.has(a)) created.set(a, day)
      updated.set(a, day)
    }
  }
  for (const s of sources) if (created.has(s)) dates[s] = [created.get(s), updated.get(s)]
} catch (e) {
  console.warn(`  ⚠ 문서 날짜 — Vault git 이력을 읽지 못했습니다 (${e.message.split('\n')[0]}). RSS · 사이트맵에 날짜 없이 나갑니다`)
}

fs.writeFileSync(path.join(OUT, 'dates.json'), JSON.stringify(dates))
console.log(`  문서 날짜 — ${Object.keys(dates).length}/${sources.size}편`)
