// Nero 설정 (P8, docs/01-planning/ai-nero.md §2 · §6.2).
//
// Vault `04 Operations/Nero.md`(사이트판)를 읽어 서버가 쓸 프롬프트로 만든다 → out/nero.json.
// 원본 `persona.md` 는 읽지 않는다. 앞머리 · %% 메모는 빼고, 길이 상한(5천 자)을 넘으면 멈춘다 —
// 길수록 무료 모델이 지시를 놓친다.
// 이 설정은 새어 나갈 수 있다고 보고 쓴다 — 여기에 들어가는 건 누가 봐도 괜찮은 내용뿐이어야 한다.
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { ROOT, VAULT } from '../config.mjs'

const SRC = path.join(VAULT, '04 Operations', 'Nero.md')
const LIMIT = 5000

if (!fs.existsSync(SRC)) {
  console.warn('  ⚠ Nero 설정이 없습니다 (04 Operations/Nero.md) — Nero 는 꺼진 채로 배포됩니다')
  fs.writeFileSync(path.join(ROOT, 'out', 'nero.json'), JSON.stringify({ prompt: '', hash: '' }))
  process.exit(0)
}
const prompt = fs.readFileSync(SRC, 'utf8')
  .replace(/^---[\s\S]*?---\s*/, '')
  .replace(/%%[\s\S]*?%%/g, '')
  .replace(/\n{3,}/g, '\n\n')
  .trim()

// 메모 상자가 짝이 안 맞으면 메모가 설정에 섞인다 — 메모 안에 %% 를 글자로 쓴 적이 있다 (2026-10-02)
if (prompt.includes('%%')) {
  console.error('\n  ✗ Nero 설정에 %% 가 남았습니다 — 메모 상자(%% … %%)의 짝이 맞지 않습니다. 04 Operations/Nero.md 를 확인해 주세요.\n')
  process.exit(1)
}
if (prompt.length > LIMIT) {
  console.error(`\n  ✗ Nero 설정이 너무 깁니다 — ${prompt.length}자 (상한 ${LIMIT}자). 04 Operations/Nero.md 를 줄여 주세요.\n`)
  process.exit(1)
}
const hash = crypto.createHash('sha1').update(prompt).digest('hex').slice(0, 12)
fs.writeFileSync(path.join(ROOT, 'out', 'nero.json'), JSON.stringify({ prompt, hash }))
console.log(`  Nero 설정 — ${prompt.length}자 (${hash})`)
