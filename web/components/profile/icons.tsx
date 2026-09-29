// 칭호 계열별 작은 그림. 24×24, 선으로만 — 희귀도 색을 currentColor 로 받는다
const P: Record<string, string> = {
  record: 'M5 4h10l4 4v12H5z M15 4v4h4 M8 12h8 M8 16h6',                          // 문서
  link: 'M6 7a2 2 0 1 0 0.01 0 M18 7a2 2 0 1 0 0.01 0 M12 17a2 2 0 1 0 0.01 0 M7.5 8.5l3.5 7 M16.5 8.5l-3.5 7 M8 7h8', // 이어진 점
  explore: 'M12 7a5 5 0 1 0 0.01 0 M3 14c3-3 15-7 18-6',                          // 행성
  quest: 'M6 21V4 M6 4h11l-2 4 2 4H6',                                              // 깃발
  skill: 'M13 3L5 13h6l-1 8 8-10h-6z',                                              // 번개
  cert: 'M12 3a6 6 0 1 0 0.01 0 M9 14l-2 7 5-3 5 3-2-7',                             // 메달
  career: 'M7 3h10 M7 21h10 M8 3c0 5 8 5 8 9s-8 4-8 9 M16 3c0 5-8 5-8 9s8 4 8 9',   // 모래시계
  streak: 'M12 3c1 4 5 6 5 11a5 5 0 0 1-10 0c0-3 2-4 2-7 2 1 3 3 3 5 1-2 0-6 0-9z',   // 불꽃
  life: 'M4 8h4l2-3h4l2 3h4v11H4z M12 11a3 3 0 1 0 0.01 0',                         // 사진기
  site: 'M12 3c4 3 5 8 3 13H9C7 11 8 6 12 3z M9 16l-3 4 M15 16l3 4 M12 9a1.5 1.5 0 1 0 0.01 0', // 로켓
  hidden: 'M9 9a3 3 0 1 1 4 2.8c-.8.4-1 1-1 2.2 M12 18v.5',                          // 물음표
}

export function GroupIcon({ group, size = 22 }: { group: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d={P[group] ?? P.hidden} />
    </svg>
  )
}

export function LinkIcon({ kind }: { kind: string }) {
  const d: Record<string, string> = {
    email: 'M3 6h18v12H3z M3 7l9 6 9-6',
    github: 'M9 19c-4 1.5-4-2-6-2.5 M15 21v-3.5c0-1 .1-1.5-.5-2 2.8-.3 5.5-1.4 5.5-6a4.6 4.6 0 0 0-1.3-3.2 4.3 4.3 0 0 0-.1-3.2s-1-.3-3.4 1.3a11.6 11.6 0 0 0-6.2 0C6.6 2.8 5.6 3.1 5.6 3.1a4.3 4.3 0 0 0-.1 3.2A4.6 4.6 0 0 0 4.2 9.5c0 4.6 2.7 5.7 5.5 6-.6.5-.6 1.2-.5 2V21',
    linkedin: 'M4 9h3v11H4z M5.5 4.5a1.5 1.5 0 1 0 .01 0 M10 9h3v1.5c.6-1 1.8-1.8 3.5-1.8 2.5 0 3.5 1.6 3.5 4.3v7h-3v-6.3c0-1.4-.5-2.2-1.7-2.2-1.4 0-2.3 1-2.3 2.6V20h-3z',
  }
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d={d[kind] ?? d.email} />
    </svg>
  )
}

// 특성(핵심 역량) 그림 — 이름의 낱말로 고른다. 맞는 게 없으면 번개
const TRAIT: [RegExp, string][] = [
  // 앞에서부터 맞춰 본다 — "백엔드·운영 도구 통합" 이 톱니(운영)가 되지 않게 백엔드를 먼저
  [/백엔드|통합|API/, 'M4 5h16v5H4z M4 14h16v5H4z M8 7.5h.01 M8 16.5h.01'],                  // 서버
  [/보안/, 'M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6z M9.5 12l2 2 3.5-4'],            // 방패
  [/프론트|라이브러리|화면/, 'M3 5h18v14H3z M3 9h18 M8 9v10'],                             // 화면 틀
  [/분석|모델링/, 'M4 20V10 M10 20V4 M16 20v-7 M22 20H2'],                                   // 막대그래프
  [/운영/, 'M12 8a4 4 0 1 0 .01 0 M12 2v3 M12 19v3 M4.2 4.2l2.1 2.1 M17.7 17.7l2.1 2.1 M2 12h3 M19 12h3 M4.2 19.8l2.1-2.1 M17.7 6.3l2.1-2.1'], // 톱니
  [/AI/, 'M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z M19 16l.8 2.2L22 19l-2.2.8L19 22l-.8-2.2L16 19l2.2-.8z'], // 반짝임
]
export function TraitIcon({ name, size = 22 }: { name: string; size?: number }) {
  const d = TRAIT.find(([re]) => re.test(name))?.[1] ?? P.skill
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d={d} />
    </svg>
  )
}
