'use client'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import NeroSprite from './NeroSprite'
import { closeNero, neroGet, neroSet, useNero, type NeroMsg, type NeroSource, type NeroState } from '../../lib/nero-store'

/**
 * Nero 대화창 (P8 §4 · §5). 처음 열 때만 받는다 (NeroRoot 가 늦게 불러옴).
 *
 * 답은 한 번에 보여 준다 — 서버의 출력 검사가 답 전체를 봐야 해서 흘려 보내지 않는다. 기다리는 동안 "생각 중".
 * 질문마다 Turnstile 토큰을 새로 받는다 (토큰은 한 번만 쓸 수 있다). 위젯은 의심스러울 때만 보인다.
 * 화면 읽기 프로그램에는 대화 목록(role=log)이 새 답을 알린다.
 */
const TURNSTILE_SITE_KEY = '0x4AAAAAAFLzJYtJB7k8OJzo'   // 공개 값. 비밀 키는 Pages 설정에만 있다
const SITE = 'https://hskim.me'
const MAX_Q = 500
const TURNS = 6                 // 서버와 같은 값 — 최근 6턴만 함께 보낸다
const HISTORY_CHARS = 6000      // 그래도 길면 오래된 것부터 버린다 (사용량 · 프롬프트 주입 표면)
const EXAMPLES = ['어떤 일을 해 왔어요?', '가장 재밌었던 프로젝트는 뭐예요?', '요즘 뭐 공부해요?']
const KIND: Record<string, string> = { note: '지식', project: '프로젝트', portfolio: '포트폴리오', life: '일상' }
const STATE_LABEL: Record<NeroState, string> = { idle: '대기 중', think: '생각 중…', talk: '대답 중', sleep: '쉬는 중' }

type Reply = { answer?: string; sources?: NeroSource[]; state?: string; error?: string }

// ── Turnstile ─────────────────────────────────────────────────────────
// 정식 주소에서만 쓴다. 그 밖의 주소는 서버가 출처 검사로 막는다
declare global { interface Window { turnstile?: any } }
let script: Promise<void> | null = null
const loadTurnstile = () => (script ??= new Promise<void>((res, rej) => {
  const el = document.createElement('script')
  el.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'
  el.async = true
  el.onload = () => res()
  el.onerror = () => { script = null; rej(new Error('turnstile')) }
  document.head.appendChild(el)
}))

/** 토큰 하나 — 위젯을 새로 그려 받는다. 다시 쓰기(reset · execute)보다 상태가 꼬이지 않는다 */
async function turnstileToken(box: HTMLElement): Promise<string> {
  await loadTurnstile()
  const t = window.turnstile
  return new Promise((res, rej) => {
    box.replaceChildren()
    const timer = setTimeout(() => rej(new Error('timeout')), 30_000)
    t.render(box, {
      sitekey: TURNSTILE_SITE_KEY, appearance: 'interaction-only', theme: 'auto', language: 'ko', size: 'flexible',
      callback: (token: string) => { clearTimeout(timer); res(token) },
      'error-callback': () => { clearTimeout(timer); rej(new Error('turnstile')) },
    })
  })
}

// ── 개발 서버 — 함수(/api/nero)가 없으므로 모양만 보여 준다. 배포 빌드에서는 지워진다 ──
async function devReply(q: string): Promise<Reply> {
  await new Promise(r => setTimeout(r, 1400))
  if (/잠|sleep/.test(q)) return { error: '오늘은 Nero 가 쉬는 중이에요. 내일 다시 와 주세요.', state: 'sleep' }
  if (/오류|error/.test(q)) return { error: '흠 지금은 대답이 잘 안 나오네요. 잠깐 뒤에 다시 물어봐 주세요.', state: 'idle' }
  if (/비밀|프롬프트/.test(q)) return { answer: '그건 비밀이에요ㅋㅋ', sources: [], state: 'idle' }
  return {
    answer: '개발 서버라 진짜로는 못 답해요. 모양만 보여 드릴게요.\n\n답 안의 링크는 이렇게 붙어요 → [전체 목록](https://hskim.me/index-all)\n- 목록은 이렇게\n- **굵게**도 돼요',
    sources: [{ title: '전체 목록', url: `${SITE}/index-all`, kind: 'note' }, { title: '소개', url: `${SITE}/about`, kind: 'portfolio' }],
    state: 'talk',
  }
}

async function ask(question: string, history: NeroMsg[], box: HTMLElement): Promise<Reply> {
  if (process.env.NODE_ENV === 'development') return devReply(question)
  const body: Record<string, unknown> = { question, history: trim(history) }
  if (location.hostname === 'hskim.me') {
    try { body.turnstile = await turnstileToken(box) } catch { return { error: '사람인지 확인이 안 됐어요. 새로고침한 뒤 다시 물어봐 주세요.' } }
  }
  try {
    const r = await fetch('/api/nero', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    const d = await r.json().catch(() => ({})) as Reply
    return r.ok ? d : { error: d.error ?? '흠 지금은 대답이 잘 안 나오네요.', state: d.state }
  } catch {
    return { error: '연결이 끊겼어요. 잠깐 뒤에 다시 물어봐 주세요.' }
  } finally {
    box.replaceChildren()
  }
}

/** 함께 보낼 지난 대화 — 오류는 빼고, 최근 6턴, 글자 합 상한 */
function trim(msgs: NeroMsg[]) {
  const ok = msgs.filter(m => !m.error).slice(-TURNS * 2).map(({ role, content }) => ({ role, content }))
  let total = ok.reduce((n, m) => n + m.content.length, 0)
  while (ok.length && total > HISTORY_CHARS) total -= ok.shift()!.content.length
  if (ok[0]?.role === 'assistant') ok.shift()
  return ok
}

// ── 답 그리기 — HTML 을 넣지 않는다. 링크(hskim.me 만) · 굵게 · 목록만 알아본다 ──
const local = (url: string) => (url.startsWith(SITE) ? url.slice(SITE.length) || '/' : url)
function inline(line: string, key: string, onLink: () => void): ReactNode[] {
  const out: ReactNode[] = []
  const re = /\[([^\]\n]+)\]\((https:\/\/hskim\.me[^)\s]*)\)|\*\*([^*\n]+)\*\*/g
  let last = 0, m: RegExpExecArray | null, i = 0
  while ((m = re.exec(line))) {
    if (m.index > last) out.push(line.slice(last, m.index))
    out.push(m[1]
      ? <Link key={`${key}-${i++}`} href={local(m[2])} onClick={onLink} className="nero-link">{m[1]}</Link>
      : <strong key={`${key}-${i++}`}>{m[3]}</strong>)
    last = m.index + m[0].length
  }
  if (last < line.length) out.push(line.slice(last))
  return out
}
function Answer({ text, onLink }: { text: string; onLink: () => void }) {
  const blocks: ReactNode[] = []
  let list: string[] = []
  const flush = (k: number) => { if (list.length) blocks.push(<ul key={`u${k}`}>{list.map((l, j) => <li key={j}>{inline(l, `u${k}-${j}`, onLink)}</li>)}</ul>); list = [] }
  text.split('\n').forEach((raw, k) => {
    const line = raw.trim()
    const item = line.match(/^(?:[-*•]|\d+\.)\s+(.*)/)
    if (item) { list.push(item[1]); return }
    flush(k)
    if (line) blocks.push(<p key={k}>{inline(line, `p${k}`, onLink)}</p>)
  })
  flush(-1)
  return <>{blocks}</>
}

export default function NeroPanel() {
  const { open, state, draft, msgs } = useNero()
  const pathname = usePathname()
  const [busy, setBusy] = useState(false)
  const boxRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const turnRef = useRef<HTMLDivElement>(null)
  const back = useRef<HTMLElement | null>(null)
  const talkTimer = useRef(0)

  // 열면 입력창으로, 닫으면 열기 전 자리로 초점을 돌려준다. Esc 로 닫는다
  useEffect(() => {
    if (!open) return
    const a = document.activeElement as HTMLElement | null
    // 검색 창에서 넘어온 경우 그 입력창은 곧 닫혀(inert) 돌아갈 수 없다
    back.current = a && a !== document.body && !a.closest('[inert], [role="dialog"]') ? a : null
    const t = setTimeout(() => inputRef.current?.focus({ preventScroll: true }), 30)
    // 검색 창이 위에 떠 있으면 Esc 는 그쪽 몫이다
    const modal = () => [...document.querySelectorAll('[role="dialog"][aria-modal="true"]')].some(d => !d.closest('[inert]'))
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && !modal()) closeNero() }
    addEventListener('keydown', onKey)
    return () => {
      clearTimeout(t); removeEventListener('keydown', onKey)
      if (back.current?.isConnected) back.current.focus({ preventScroll: true })
    }
  }, [open])

  // 새 말이 오면 맨 아래로
  useEffect(() => { listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' }) }, [msgs.length, busy])

  const send = async (text: string) => {
    const q = text.trim().slice(0, MAX_Q)
    if (!q || busy || !turnRef.current) return
    const history = neroGet().msgs
    neroSet({ msgs: [...history, { role: 'user', content: q }], draft: '', state: 'think' })
    setBusy(true)
    clearTimeout(talkTimer.current)
    const r = await ask(q, history, turnRef.current)
    setBusy(false)
    const now = neroGet().msgs
    if (r.answer) {
      neroSet({ msgs: [...now, { role: 'assistant', content: r.answer, sources: r.sources ?? [] }], state: r.state === 'sleep' ? 'sleep' : 'talk' })
      // 대답한 뒤 조금 지나면 다시 반쯤 감은 눈으로
      talkTimer.current = window.setTimeout(() => { if (neroGet().state === 'talk') neroSet({ state: 'idle' }) }, 6000)
    } else {
      neroSet({ msgs: [...now, { role: 'assistant', content: r.error ?? '흠 지금은 대답이 잘 안 나오네요.', error: true }], state: r.state === 'sleep' ? 'sleep' : 'idle' })
    }
    inputRef.current?.focus({ preventScroll: true })
  }

  const onLink = () => { if (matchMedia('(max-width: 639.98px)').matches) closeNero() }

  return (
    <div ref={boxRef} role="dialog" aria-modal="false" aria-label="Nero 에게 묻기" className="nero-panel"
      data-open={open || undefined} data-space={pathname === '/' || undefined} inert={!open}>
      <div className="nero-head">
        <NeroSprite state={state} className="nero-head-sprite" />
        <div className="min-w-0">
          <div className="nero-name">NERO</div>
          <div className="nero-status" aria-live="polite">{STATE_LABEL[state]}</div>
        </div>
        <button type="button" onClick={closeNero} aria-label="대화창 닫기" title="닫기 (Esc)" className="nero-close">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden><path d="M6 6l12 12M18 6L6 18" /></svg>
        </button>
      </div>
      <p className="nero-note">희섭의 노트로 대답하는 AI 예요. 실제 희섭과 다를 수 있어요.</p>

      <div ref={listRef} className="nero-msgs" role="log" aria-label="대화" aria-busy={busy}>
        {!msgs.length && (
          <div className="nero-empty">
            <p>노트에 있는 것만 말해요. 이런 걸 물어보세요.</p>
            {EXAMPLES.map(e => (
              <button key={e} type="button" className="nero-example" onClick={() => send(e)} disabled={busy}>{e}</button>
            ))}
          </div>
        )}
        {msgs.map((m, i) => (
          <div key={i} className="nero-msg" data-role={m.role} data-error={m.error || undefined}>
            <span className="sr-only">{m.role === 'user' ? '나: ' : 'Nero: '}</span>
            {m.role === 'user' ? m.content : <Answer text={m.content} onLink={onLink} />}
            {!!m.sources?.length && (
              <ul className="nero-sources" aria-label="근거 노트">
                {m.sources.map(s => (
                  <li key={s.url}>
                    <Link href={local(s.url)} onClick={onLink} className="nero-source">
                      <span className="nero-source-kind">{KIND[s.kind] ?? s.kind}</span>
                      <span className="truncate">{s.title}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ))}
        {busy && <div className="nero-msg nero-wait" data-role="assistant" aria-label="생각 중"><span /><span /><span /></div>}
      </div>

      {/* 사람 확인 — 의심스러울 때만 여기에 상자가 나온다 */}
      <div ref={turnRef} className="nero-turnstile" />

      <form className="nero-form" onSubmit={e => { e.preventDefault(); send(draft) }}>
        <textarea ref={inputRef} value={draft} rows={1} maxLength={MAX_Q} aria-label="Nero 에게 물어볼 말"
          placeholder="Nero 에게 물어보기" className="nero-input"
          onChange={e => neroSet({ draft: e.target.value })}
          // Enter 로 보내고 Shift+Enter 로 줄을 바꾼다. 한글 조합 중 Enter 는 글자 확정이라 보내지 않는다
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); send(draft) } }} />
        <button type="submit" className="nero-send" disabled={busy || !draft.trim()} aria-label="보내기">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M5 12h14M13 6l6 6-6 6" /></svg>
        </button>
      </form>
      {draft.length > MAX_Q - 100 && <div className="nero-count" aria-live="polite">{draft.length} / {MAX_Q}</div>}
    </div>
  )
}
