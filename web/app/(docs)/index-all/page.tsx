import Link from 'next/link'
import { social } from '../../../lib/og'
import type { Metadata } from 'next'
import { allDocs, type Doc } from '../../../lib/content'
import { GROUP_COLORS } from '../../../lib/graph-colors'
import IndexFilter from '../../../components/IndexFilter'

export const metadata: Metadata = {
  title: '전체 목록',
  description: '공개된 지식 노트와 프로젝트 기록 전체 목록',
  alternates: { canonical: '/index-all' },
  ...social('_index', '전체 목록', '공개된 지식 노트와 프로젝트 기록 전체 목록', 'website'),
}

const strip = (s: string) => s.replace(/^\d{2}\s+/, '')

type Rest = { name: string; items: Doc[] }
type Sub = { name: string; count: number; rests: Map<string, Rest> }
type Field = { id: string; name: string; color: string; count: number; subs: Map<string, Sub> }

/**
 * 문서 하나를 큰 분야 · 하위 분류 · 그 아래 경로로 나눈다.
 * 늘 같은 앞부분(Knowledge DB · Project Cases / Project Index)은 떼어 낸다.
 * 분야 바로 밑 문서(분야 개요 · MOC)는 '개요' 묶음으로 맨 앞에 둔다.
 */
function place(d: Doc): { field: string; sub: string; rest: string } | null {
  const segs = d.category.map(strip).filter(s => s !== 'Project Index')
  if (d.kind === 'note') {
    if (segs.length < 2) return null   // Knowledge DB MOC — 머리말 링크로
    return { field: segs[1], sub: segs[2] ?? '개요', rest: segs.slice(3).join(' / ') }
  }
  if (d.kind === 'project') {
    if (segs.length < 2) return null   // Project Cases MOC — 머리말 링크로
    // 케이스 안의 경로(NSR / rag 등)는 Cases 가 카드로 다시 묶는다
    return { field: 'Project Cases', sub: segs[1], rest: segs.slice(2).join(' / ') }
  }
  if (segs.length < 2) return null     // 소개 · 포트폴리오 첫 화면 — 머리말 링크로
  return { field: '포트폴리오', sub: segs[1], rest: '' }
}

/**
 * 텍스트 인덱스.
 *   - 3D 그래프를 쓸 수 없는 환경의 대체 경로 (D-07)
 *   - 검색 엔진 크롤러의 진입점 (D-09) — 메인이 그래프라 홈에는 읽을 본문이 없다.
 *     그래서 묶음을 접어 두어도 <details> 안의 링크는 모두 HTML 에 남긴다.
 *   - 분야 → 하위 분류(접기) → 문서. 찾기는 IndexFilter 가 그려진 목록을 걸러 낸다 (데이터를 다시 싣지 않는다)
 */
export default function Page() {
  const docs = allDocs()
  const fields = new Map<string, Field>()
  const top: Doc[] = []
  for (const d of docs) {
    const at = place(d)
    if (!at) { top.push(d); continue }
    let f = fields.get(at.field)
    if (!f) {
      f = { id: 'f-' + at.field.toLowerCase().replace(/[^a-z0-9가-힣]+/g, '-'), name: at.field, color: GROUP_COLORS[at.field] ?? 'var(--fg-faint)', count: 0, subs: new Map() }
      fields.set(at.field, f)
    }
    let s = f.subs.get(at.sub)
    if (!s) { s = { name: at.sub, count: 0, rests: new Map() }; f.subs.set(at.sub, s) }
    let r = s.rests.get(at.rest)
    if (!r) { r = { name: at.rest, items: [] }; s.rests.set(at.rest, r) }
    r.items.push(d)
    s.count++; f.count++
  }
  // 개요를 맨 앞에, 그 밖은 Vault 폴더 순서 그대로
  for (const f of fields.values()) {
    const o = f.subs.get('개요')
    if (o) { f.subs.delete('개요'); f.subs = new Map([['개요', o], ...f.subs]) }
  }
  const list = [...fields.values()]

  return (
    <div className="px-5 py-8 sm:px-8 xl:px-10">
      <header className="mb-6 max-w-[72ch]">
        <h1 className="text-[2rem] font-bold leading-tight tracking-tight text-[var(--fg-strong)]">전체 목록</h1>
        <p className="mt-3 text-[var(--fg-dim)]">
          공개된 문서 {docs.length}개를 분야별로 모았습니다. 묶음을 눌러 펼치거나, 아래 칸에 찾는 말을 넣으세요.
        </p>
        {top.length > 0 && (
          <p className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[13.5px]">
            {top.map(d => (
              <Link key={d.route} href={'/' + d.route} className="text-[var(--accent)] hover:underline">{d.title} →</Link>
            ))}
          </p>
        )}
      </header>

      <IndexFilter>
        <nav aria-label="분야" className="flex flex-wrap gap-1.5">
          {list.map(f => (
            <a key={f.id} href={'#' + f.id} className="idx-chip" style={{ '--c': f.color } as React.CSSProperties}>
              <span className="idx-dot" aria-hidden />{f.name} <span className="tabular-nums text-[var(--fg-faint)]">{f.count}</span>
            </a>
          ))}
        </nav>
      </IndexFilter>

      <div id="index-list" className="mt-6 space-y-10">
        {list.map(f => (
          <section key={f.id} id={f.id} className="idx-field" style={{ '--c': f.color } as React.CSSProperties}>
            <h2 className="idx-field-h">
              <span className="idx-dot" aria-hidden />{f.name}
              <span className="idx-fn ml-2 text-[13px] font-normal tabular-nums text-[var(--fg-faint)]">{f.count}</span>
            </h2>
            <div className="mt-2 divide-y divide-[var(--line-soft)] border-y border-[var(--line-soft)]">
              {[...f.subs.values()].map(s => (
                <details key={s.name} className="idx-sub">
                  <summary>
                    <span className="idx-caret" aria-hidden>▸</span>
                    <span className="text-[var(--fg)]">{s.name}</span>
                    <span className="idx-n tabular-nums text-[var(--fg-faint)]">{s.count}</span>
                  </summary>
                  <div className="pb-4 pl-6">
                    {f.name === 'Project Cases' ? <Cases rests={[...s.rests.values()]} />
                    : f.name === '포트폴리오' ? (
                      <ul className="mt-2 grid gap-2 sm:grid-cols-2">
                        {[...s.rests.values()].flatMap(r => r.items).map(d => <DocCard key={d.route} d={d} desc />)}
                      </ul>
                    ) : [...s.rests.values()].map(r => (
                      <div key={r.name} className="idx-rest">
                        {r.name && <h3 className="mb-1.5 mt-3 text-[12px] font-medium tracking-wide text-[var(--fg-faint)]">{r.name}</h3>}
                        <ul className="mt-2 grid grid-cols-2 gap-2 lg:grid-cols-3">
                          {r.items.map(d => <DocCard key={d.route} d={d} />)}
                        </ul>
                      </div>
                    ))}
                  </div>
                </details>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  )
}


/** 문서 하나의 찾기 낱말 — IndexFilter 가 [data-dq] 로 거른다 (문서 하나에 하나씩) */
const words = (d: Doc) => [d.title, d.description, ...d.tags].join(' ').toLowerCase()

/**
 * 문서 카드 (포트폴리오 페이지와 같은 테두리 카드).
 *   지식 노트 — 제목만 (설명은 대개 제목을 되풀이해 군더더기). 태그가 있으면 셋까지
 *   프로젝트 · 포트폴리오(desc) — 제목 + 설명 2줄. 이름만으로는 무엇인지 알기 어렵다
 */
function DocCard({ d, desc = false }: { d: Doc; desc?: boolean }) {
  return (
    <li className="idx-card" data-dq={words(d)}>
      <Link href={'/' + d.route} className="idx-card-main">
        <span className="idx-card-t">{d.title}</span>
        {desc && d.description && <span className="idx-card-d">{d.description}</span>}
        {!desc && d.tags.length > 0 && <span className="idx-card-tags">{d.tags.slice(0, 3).map(t => '#' + t).join(' ')}</span>}
      </Link>
    </li>
  )
}

/**
 * 폴더의 대표 문서 — 폴더 바로 밑 문서(더 깊은 폴더의 것 말고) 가운데
 * 같은 폴더 문서를 가장 많이 링크하는 문서(폴더 노트)를 고른다.
 * 같으면 다른 제목의 앞머리가 되는 문서(KMS → KMS Admin …), 그다음 짧은 제목
 */
function lead(ds: Doc[]): Doc {
  const set = new Set(ds.map(d => d.route))
  const depth = Math.min(...ds.map(d => d.category.length))
  const score = (d: Doc) => (d.category.length === depth ? 10000 : 0) +
    d.links.filter(l => set.has(l.route)).length * 100 +
    ds.filter(o => o !== d && o.title.startsWith(d.title + ' ')).length * 10 -
    d.title.length / 100
  return [...ds].sort((a, b) => score(b) - score(a))[0]
}

/** 케이스 카드 — 대표 문서의 제목 · 설명 2줄 + 같은 폴더 나머지 문서는 아래 링크 줄 (앞머리 같은 이름은 뗀다) */
function CaseCard({ ds }: { ds: Doc[] }) {
  if (ds.length === 1) return <DocCard d={ds[0]} desc />
  const top = lead(ds)
  const others = ds.filter(d => d !== top)
  const short = (t: string) => t.startsWith(top.title + ' ') ? t.slice(top.title.length + 1) : t
  return (
    <li className="idx-card">
      <Link href={'/' + top.route} className="idx-card-main" data-dq={words(top)}>
        <span className="idx-card-t">{top.title}</span>
        {top.description && <span className="idx-card-d">{top.description}</span>}
      </Link>
      <p className="idx-card-links">
        {others.map(d => <Link key={d.route} href={'/' + d.route} data-dq={words(d)}>{short(d.title)}</Link>)}
      </p>
    </li>
  )
}

/**
 * 프로젝트 케이스 하위 분류(Company · Bootcamps …) 안.
 *   분류 바로 밑 문서 — 카드 하나씩
 *   케이스 폴더(NSR · Hazard Data …) — 안에 폴더가 없으면 카드 한 장
 *   큰 케이스(secuai · NSR 처럼 안에 폴더가 있는 것) — 대표 문서를 머리로 두고, 안쪽 폴더마다 카드 한 장
 */
function Cases({ rests }: { rests: Rest[] }) {
  const root: Doc[] = []
  const cases = new Map<string, Map<string, Doc[]>>()   // 케이스 → 안쪽 폴더('' = 케이스 바로 밑) → 문서
  for (const r of rests) {
    if (!r.name) { root.push(...r.items); continue }
    const [c, inner = ''] = r.name.split(' / ')
    if (!cases.has(c)) cases.set(c, new Map())
    const m = cases.get(c)!
    if (!m.has(inner)) m.set(inner, [])
    m.get(inner)!.push(...r.items)
  }
  return (
    <ul className="mt-2 grid gap-2 sm:grid-cols-2">
      {root.map(d => <DocCard key={d.route} d={d} desc />)}
      {[...cases].map(([c, m]) => {
        if (m.size === 1 && m.has('')) return <CaseCard key={c} ds={m.get('')!} />
        const own = m.get('') ?? []
        const head = own.length ? lead(own) : null
        return (
          <li key={c} className="idx-case sm:col-span-2">
            <div className="idx-case-h" data-dq={head ? words(head) : undefined}>
              {head
                ? <Link href={'/' + head.route}><span className="idx-card-t">{head.title}</span>{head.description && <span className="idx-card-d">{head.description}</span>}</Link>
                : <span className="idx-card-t">{c}</span>}
            </div>
            <ul className="grid gap-2 sm:grid-cols-2">
              {own.filter(d => d !== head).map(d => <DocCard key={d.route} d={d} desc />)}
              {[...m].filter(([k]) => k).map(([k, ds]) => <CaseCard key={k} ds={ds} />)}
            </ul>
          </li>
        )
      })}
    </ul>
  )
}
