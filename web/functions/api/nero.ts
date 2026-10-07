// POST /api/nero — Nero 에게 묻기 (P8, docs/01-planning/ai-nero.md §3 · §6).
// 같은 주소에서만 부른다 (CORS 를 열지 않는다). 순서: 끄는 스위치 → 모양 · 출처 → 봇 확인 → 한도 → 근거 → 답 → 출력 검사.
import neroConfig from '../_lib/prompt.ts'
import { LIMITS, SITE, parseRequest, retrieve, buildMessages, generate, sanitize, today, visitorKey, isExtraction, SECRET_ANSWER, type Bindings } from '../_lib/nero.ts'

type KV = { get(k: string): Promise<string | null>; put(k: string, v: string, o?: { expirationTtl?: number }): Promise<void> }
type Env = {
  AI: { run(model: string, input: unknown): Promise<any> }
  VECTORIZE: { query(v: number[], o: { topK: number; returnMetadata: 'all' }): Promise<{ matches: any[] }> }
  NERO_KV: KV
  TURNSTILE_SECRET?: string
  NERO_ENABLED?: string          // "on" 일 때만 답한다 — 끄는 스위치
}

const json = (status: number, body: unknown) => new Response(JSON.stringify(body), {
  status, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' },
})
// 오류에는 내부 정보(스택 · 모델 · 프롬프트)를 담지 않는다 (§6.6)
const fail = (status: number, message: string, state = 'idle') => json(status, { error: message, state })

// 한 사람 1분 한도 — 이 실행 환경(isolate) 안에서만 센다. 대략이면 충분하다
const minute = new Map<string, number[]>()

async function verifyTurnstile(token: string, secret: string, ip: string) {
  const form = new FormData()
  form.append('secret', secret); form.append('response', token); form.append('remoteip', ip)
  const r = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', { method: 'POST', body: form })
  const d = await r.json().catch(() => ({})) as { success?: boolean; hostname?: string }
  return !!d.success
}

export async function onRequestPost({ request, env }: { request: Request; env: Env }): Promise<Response> {
  if (env.NERO_ENABLED !== 'on' || !neroConfig.prompt) return fail(503, 'Nero 는 지금 정비 중이에요. 조금 뒤에 다시 와 주세요.', 'sleep')

  // 같은 사이트에서 온 JSON 만
  const origin = request.headers.get('Origin')
  if (origin !== SITE && !origin?.startsWith('http://localhost')) return fail(403, '이 주소에서는 부를 수 없어요.')
  if (!request.headers.get('Content-Type')?.startsWith('application/json')) return fail(415, '요청 형식이 맞지 않아요.')
  const raw = await request.text()
  if (raw.length > LIMITS.body) return fail(413, '요청이 너무 길어요.')
  let body: any
  try { body = JSON.parse(raw) } catch { return fail(400, '요청 형식이 맞지 않아요.') }
  const parsed = parseRequest(body)
  if ('error' in parsed) return fail(400, parsed.error)

  // 봇 확인 (Turnstile) — 질문마다 새 토큰
  const ip = request.headers.get('CF-Connecting-IP') ?? '0.0.0.0'
  if (!env.TURNSTILE_SECRET) return fail(503, 'Nero 는 지금 정비 중이에요.', 'sleep')
  if (typeof body.turnstile !== 'string' || !(await verifyTurnstile(body.turnstile, env.TURNSTILE_SECRET, ip))) return fail(403, '사람인지 확인이 안 됐어요. 새로고침한 뒤 다시 물어봐 주세요.')

  // 한도 — 한 사람 1분 · 하루, 사이트 하루 (IP 는 해시로만)
  const who = await visitorKey(ip, env.TURNSTILE_SECRET)
  const now = Date.now()
  const recent = (minute.get(who) ?? []).filter(t => now - t < 60_000)
  if (recent.length >= LIMITS.perMinute) return fail(429, '조금 천천히 물어봐 주세요. 1분 뒤에 다시요.')
  const day = today()
  const [mine, site] = await Promise.all([env.NERO_KV.get(`u:${day}:${who}`), env.NERO_KV.get(`s:${day}`)])
  if (Number(site ?? 0) >= LIMITS.siteDay) return fail(429, '오늘은 Nero 가 쉬는 중이에요. 내일 다시 와 주세요.', 'sleep')
  if (Number(mine ?? 0) >= LIMITS.perDay) return fail(429, '오늘 물어볼 수 있는 만큼 다 물어보셨어요. 내일 또 와 주세요.', 'sleep')
  recent.push(now); minute.set(who, recent)
  // 한 사람 기록(IP 해시)은 이틀 뒤 지운다. 사이트 전체 하루 질문 수는 숫자 하나뿐이라 40일 남겨 쓰임새를 돌아본다 (2026-10-07)
  await Promise.all([
    env.NERO_KV.put(`u:${day}:${who}`, String(Number(mine ?? 0) + 1), { expirationTtl: 60 * 60 * 48 }),
    env.NERO_KV.put(`s:${day}`, String(Number(site ?? 0) + 1), { expirationTtl: 60 * 60 * 24 * 40 }),
  ])

  // 설정을 캐는 질문은 모델을 부르지 않는다
  if (isExtraction(parsed.question)) return json(200, { answer: SECRET_ANSWER, sources: [], state: 'idle' })

  const b: Bindings = { run: (m, i) => env.AI.run(m, i), query: (v, o) => env.VECTORIZE.query(v, o) }
  try {
    const matches = await retrieve(b, parsed.question)
    const answer = await generate(b, buildMessages(neroConfig.prompt, matches, parsed.history, parsed.question))
    const out = sanitize(answer, neroConfig.prompt, matches)
    // 대화는 저장하지 않는다 (§6.8). 막은 종류만 운영 기록에 (내용 없이)
    if (out.blocked.length) console.log(JSON.stringify({ nero: 'blocked', kinds: [...new Set(out.blocked)] }))
    return json(200, { answer: out.answer, sources: out.sources, state: 'talk' })
  } catch {
    return fail(502, '흠 지금은 대답이 잘 안 나오네요. 잠깐 뒤에 다시 물어봐 주세요.')
  }
}

// POST 외에는 받지 않는다
export const onRequest = () => fail(405, 'POST 로만 물어볼 수 있어요.')
