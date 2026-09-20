// 위키링크 대상 해석기.
//
// Vault 에는 두 형태가 섞여 있다.
//   [[React]]                                    → 짧은 형태 (파일명만)
//   [[02 Project Cases/.../Personal Projects]]   → 전체 경로 형태
//
// Quartz 의 CrawlLinks 는 링크를 슬러그로 정규화해 주지만, 짧은 형태를
// 전체 경로로 확장하는 것은 슬러그 공간을 아는 쪽의 몫이다. 여기서 처리한다.
export function makeResolver(allSlugs) {
  const exact = new Set(allSlugs)
  // Obsidian 폴더 노트 관례: Studiary/Studiary.md 는 Quartz 에서 .../studiary/index 가 된다.
  // [[Studiary]] 로 참조되므로 부모 폴더명으로도 찾을 수 있어야 한다.
  const byBasename = new Map()
  const add = (key, slug) => {
    if (!byBasename.has(key)) byBasename.set(key, [])
    if (!byBasename.get(key).includes(slug)) byBasename.get(key).push(slug)
  }
  for (const s of allSlugs) {
    const parts = s.split('/')
    const base = parts.pop()
    if (base === 'index' && parts.length) add(parts[parts.length - 1], s)
    else add(base, s)
  }

  return function resolve(rawTarget) {
    const target = String(rawTarget).replace(/#.*$/, '').replace(/\/+$/, '')
    if (!target) return { status: 'empty' }
    if (exact.has(target)) return { status: 'ok', slug: target }

    const base = target.split('/').pop()
    const candidates = byBasename.get(base) ?? []
    if (candidates.length === 1) return { status: 'ok', slug: candidates[0], via: 'basename' }
    if (candidates.length > 1) return { status: 'ambiguous', candidates }

    // 폴더를 가리키는 링크 (원본이 '.../frontend/' 형태)
    if (String(rawTarget).endsWith('/')) return { status: 'folder', target }
    return { status: 'broken', target }
  }
}
