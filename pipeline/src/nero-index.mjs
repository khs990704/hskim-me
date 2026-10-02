// Nero 색인 올리기 (P8, docs/01-planning/ai-nero.md §3).
//
// out/chunks.json(공개 승인 · 유출 검사를 통과한 조각)을 임베딩해 Cloudflare Vectorize 에 올린다.
// 바뀐 조각만 다시 임베딩한다 — 지난 배포가 사이트에 남긴 목록(nero-manifest.json, 조각 id → 내용 해시)과 비교.
// 목록에는 id 와 해시만 있다 (본문 없음).
//
// 환경 변수 (CI: GitHub 비밀)
//   CLOUDFLARE_ACCOUNT_ID
//   NERO_INDEX_TOKEN   Vectorize 편집 + Workers AI 읽기 권한만 가진 토큰. 배포 토큰과 따로 둔다 (§6.7)
//   NERO_INDEX         색인 이름 (기본 nero)
// 토큰이 없으면 건너뛴다 — 사이트 배포는 막지 않고, 지난 목록을 그대로 다시 싣는다. 올리다 실패해도 경고만 남기고 배포는 계속한다.
import fs from 'node:fs'
import path from 'node:path'
import { ROOT } from '../config.mjs'

const MODEL = '@cf/baai/bge-m3'        // 1024 차원 · 한국어 근거 찾기 10/10 (2026-10-02 비교, Qwen3 Embedding 보다 첫 결과가 정확하고 8배 빠름)
const INDEX = process.env.NERO_INDEX ?? 'nero'
const ACC = process.env.CLOUDFLARE_ACCOUNT_ID
const TOKEN = process.env.NERO_INDEX_TOKEN
const MANIFEST_URL = process.env.NERO_MANIFEST_URL ?? 'https://hskim.me/nero-manifest.json'
const OUT = path.join(ROOT, '..', 'web', 'public', 'nero-manifest.json')
const API = `https://api.cloudflare.com/client/v4/accounts/${ACC}`
const H = { Authorization: `Bearer ${TOKEN}` }

const prev = await fetch(MANIFEST_URL).then(r => (r.ok ? r.json() : null)).catch(() => null)
const write = m => { fs.mkdirSync(path.dirname(OUT), { recursive: true }); fs.writeFileSync(OUT, JSON.stringify(m)) }

if (!ACC || !TOKEN) {
  console.warn('  ⚠ Nero 색인 — NERO_INDEX_TOKEN 이 없어 건너뜁니다 (색인은 지난 상태 그대로)')
  if (prev) write(prev)
  process.exit(0)
}

const chunks = JSON.parse(fs.readFileSync(path.join(ROOT, 'out', 'chunks.json'), 'utf8'))
// 모델 · 색인이 바뀌었으면 전부 새로
const old = prev && prev.model === MODEL && prev.index === INDEX ? prev.ids : {}
const now = Object.fromEntries(chunks.map(c => [c.id, c.hash]))
const todo = chunks.filter(c => old[c.id] !== c.hash)
const gone = Object.keys(old).filter(id => !(id in now))

const call = async (url, init) => {
  for (let i = 0; i < 4; i++) {
    const r = await fetch(url, init).then(r => r.json()).catch(e => ({ success: false, errors: [{ message: e.message }] }))
    if (r.success) return r.result
    if (i === 3) throw new Error(JSON.stringify(r.errors).slice(0, 300))
    await new Promise(res => setTimeout(res, 1500 * (i + 1)))
  }
}

// 지금까지 올린 것 — 실패해도 여기까지는 목록에 남긴다. 바뀐 조각의 옛 해시 · 못 지운 id 는 그대로 두어 다음 배포에서 다시 시도된다
const done = { ...Object.fromEntries(Object.entries(old).filter(([id]) => id in now)) }
let sent = 0, deleted = 0
try {
for (let i = 0; i < todo.length; i += 50) {
  const batch = todo.slice(i, i + 50)
  const emb = await call(`${API}/ai/run/${MODEL}`, { method: 'POST', headers: { ...H, 'Content-Type': 'application/json' }, body: JSON.stringify({ text: batch.map(c => c.embed) }) })
  const vecs = emb.data ?? emb.response
  // Worker 가 조각 본문을 따로 찾지 않게 메타데이터에 싣는다 (조각 하나 1100자 안팎 — 한도 10KiB 안)
  const ndjson = batch.map((c, k) => JSON.stringify({
    id: c.id, values: vecs[k],
    metadata: { route: c.route, title: c.title, section: c.section, kind: c.kind, text: c.text },
  })).join('\n')
  await call(`${API}/vectorize/v2/indexes/${INDEX}/upsert`, { method: 'POST', headers: { ...H, 'Content-Type': 'application/x-ndjson' }, body: ndjson })
  for (const c of batch) done[c.id] = c.hash
  sent += batch.length
}
for (let i = 0; i < gone.length; i += 100) {
  await call(`${API}/vectorize/v2/indexes/${INDEX}/delete_by_ids`, { method: 'POST', headers: { ...H, 'Content-Type': 'application/json' }, body: JSON.stringify({ ids: gone.slice(i, i + 100) }) })
  for (const id of gone.slice(i, i + 100)) delete done[id]
  deleted += Math.min(100, gone.length - i)
}
} catch (e) {
  // 색인이 실패해도 사이트 배포는 막지 않는다 — 노트 공개와 Nero 색인은 따로 간다. Nero 는 그동안 예전 색인으로 답한다.
  // GitHub Actions 요약 화면에 경고로 크게 남긴다 (::warning::)
  write({ model: MODEL, index: INDEX, ids: done })
  console.log(`::warning title=Nero 색인 실패::${e.message} — 올림 ${sent}/${todo.length} · 지움 ${deleted}/${gone.length}. 나머지는 다음 배포에서 다시 시도합니다. 토큰(NERO_INDEX_TOKEN) 권한이 Workers AI 읽기 + Vectorize 편집인지 확인하세요`)
  process.exit(0)
}

write({ model: MODEL, index: INDEX, ids: done })
console.log(`  Nero 색인 — 조각 ${chunks.length}개 중 새로 올림 ${sent} · 지움 ${gone.length} · 그대로 ${chunks.length - sent}`)
