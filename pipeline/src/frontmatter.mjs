// 최소 frontmatter 리더.
// Vault 노트 대부분은 frontmatter 가 없다. publish 플래그만 안정적으로 읽으면 된다.
export function readFrontmatter(raw) {
  if (!raw.startsWith('---')) return { data: {}, body: raw }

  const end = raw.indexOf('\n---', 3)
  if (end === -1) return { data: {}, body: raw }

  const block = raw.slice(raw.indexOf('\n') + 1, end)
  const body = raw.slice(raw.indexOf('\n', end + 1) + 1)

  const data = {}
  for (const line of block.split('\n')) {
    const m = line.match(/^([A-Za-z0-9_-]+)\s*:\s*(.*)$/)
    if (!m) continue
    const [, key, rawValue] = m
    const value = rawValue.trim().replace(/^["']|["']$/g, '')
    if (value === 'true') data[key] = true
    else if (value === 'false') data[key] = false
    else data[key] = value
  }
  return { data, body }
}
