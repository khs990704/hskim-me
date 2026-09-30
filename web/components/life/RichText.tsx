/**
 * 사진 기록 글의 문단 — 줄바꿈 · 굵게(**글**) · 코드(`글`)만 살린다. 색 · 굵기는 노트와 같은 .prose 규칙을 따른다. 나머지 Markdown 기호는 파이프라인이 이미 걷어 냈다.
 * HTML 을 끼워 넣지 않고 조각으로 나눠 그려, 글에 어떤 글자가 있어도 태그로 읽히지 않는다.
 */
const bold = (text: string) => text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g).map((s, i) =>
    s.startsWith('**') && s.endsWith('**') && s.length > 4 ? <strong key={i}>{s.slice(2, -2)}</strong>
    : s.startsWith('`') && s.endsWith('`') && s.length > 2 ? <code key={i}>{s.slice(1, -1)}</code> : s)

export default function RichText({ text }: { text: string }) {
  const lines = text.split('\n')
  return <>{lines.map((l, i) => <span key={i}>{bold(l)}{i < lines.length - 1 && <br />}</span>)}</>
}
