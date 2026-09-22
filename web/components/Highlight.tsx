import { looseRegex } from '../lib/search'

/**
 * 검색어와 맞은 부분을 강조한다.
 * 어느 단어 때문에 이 문서가 나왔는지 보이게 하려는 것이다.
 */
export default function Highlight({ text, terms }: { text: string; terms: string[] }) {
  if (!terms.length || !text) return <>{text}</>

  // 모든 검색어의 위치를 모아 겹치는 구간을 합친다
  const ranges: [number, number][] = []
  for (const term of terms) {
    if (!term) continue
    const re = looseRegex(term)
    let m: RegExpExecArray | null
    while ((m = re.exec(text)) !== null) {
      if (m[0].length === 0) break
      ranges.push([m.index, m.index + m[0].length])
    }
  }
  if (!ranges.length) return <>{text}</>

  ranges.sort((a, b) => a[0] - b[0])
  const merged: [number, number][] = []
  for (const r of ranges) {
    const last = merged[merged.length - 1]
    if (last && r[0] <= last[1]) last[1] = Math.max(last[1], r[1])
    else merged.push([...r] as [number, number])
  }

  const out: React.ReactNode[] = []
  let at = 0
  merged.forEach(([s, e], i) => {
    if (s > at) out.push(text.slice(at, s))
    out.push(
      <mark key={i} className="rounded-[2px] bg-[var(--accent)]/22 px-[1px] text-[var(--fg-strong)]">
        {text.slice(s, e)}
      </mark>,
    )
    at = e
  })
  if (at < text.length) out.push(text.slice(at))
  return <>{out}</>
}
