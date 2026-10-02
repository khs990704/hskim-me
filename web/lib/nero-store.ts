'use client'
import { useSyncExternalStore } from 'react'

/**
 * Nero 대화 상태 (P8, docs/01-planning/ai-nero.md §4 · §5).
 *
 * 정박 단추 · 메인 비행 · 검색 창 탭 · 대화창이 같은 대화를 본다. 루트 layout 에 붙은 대화창이
 * 페이지를 옮겨도 남아 있으므로, 대화는 이 탭 안에서만 이어지고 새로고침하면 처음부터다.
 * 서버는 대화를 저장하지 않는다.
 */
export type NeroState = 'idle' | 'think' | 'talk' | 'sleep'
export type NeroSource = { title: string; url: string; kind: string }
export type NeroMsg = { role: 'user' | 'assistant'; content: string; sources?: NeroSource[]; error?: boolean }

type Store = { open: boolean; state: NeroState; draft: string; msgs: NeroMsg[] }
let s: Store = { open: false, state: 'idle', draft: '', msgs: [] }
const subs = new Set<() => void>()
const SERVER: Store = s

export const neroGet = () => s
export function neroSet(p: Partial<Store>) { s = { ...s, ...p }; subs.forEach(f => f()) }
export const openNero = (draft?: string) => neroSet({ open: true, ...(draft ? { draft } : {}) })
export const closeNero = () => neroSet({ open: false })

export function useNero() {
  return useSyncExternalStore(f => { subs.add(f); return () => { subs.delete(f) } }, () => s, () => SERVER)
}
