// 사진 기록 날짜 표기 — 화면(클라이언트)에서도 쓰므로 파일을 읽는 lib/life.ts 와 나눈다
export const fmtDate = (d: string) => d.replace(/-/g, '.')
export const when = (p: { date: string; until?: string }) =>
  p.until && p.until !== p.date ? `${fmtDate(p.date)} ~ ${fmtDate(p.until).slice(5)}` : fmtDate(p.date)
