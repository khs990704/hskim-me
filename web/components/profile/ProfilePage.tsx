import Link from 'next/link'
import type { Character, MediaEntry, PixelFont, Profile } from '../../lib/profile'
import { Dialog } from './Dialog'
import ForceDark from './ForceDark'
import SkillBoard from './SkillBoard'
import StatRadar from './StatRadar'
import TitleCollection from './TitleCollection'
import { LinkIcon } from './icons'

/**
 * /about — 캐릭터 스탯창 (기획 docs/01-planning/profile-and-life.md §3 · §4)
 *
 * 숫자는 전부 파이프라인이 기록에서 센 것이다 (character.json). 스스로 매긴 점수는 없다.
 * 게임 용어를 크게, 평범한 말을 작은 부제로 둔다 — 처음 온 사람도 무엇인지 알게.
 */

const DOMAIN_LABEL: Record<string, string> = {
  backend: '백엔드', frontend: '프론트엔드', ai: 'AI · ML', data: '데이터', infra: '인프라', security: '보안',
}
const ym = (d: string | null) => (d ? d.slice(0, 7).replace('-', '.') : '현재')
const LINK_LABEL: Record<string, string> = { email: '이메일', github: 'GitHub', linkedin: 'LinkedIn' }
const hrefOf = (k: string, v: string) => (k === 'email' ? `mailto:${v}` : v)

function Section({ id, title, sub, right, children }: { id: string; title: string; sub: string; right?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section id={id} aria-labelledby={`${id}-h`} className="hud-frame hud-section">
      <header className="mb-5 flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <h2 id={`${id}-h`} className="pixel hud-h2">
          <span aria-hidden className="hud-h2-mark">◆</span> {title}
        </h2>
        <span className="text-[12.5px] text-[var(--fg-faint)]">{sub}</span>
        {right && <span className="ml-auto">{right}</span>}
      </header>
      {children}
    </section>
  )
}

export default function ProfilePage({ profile, character: ch, media, font }: {
  profile: Profile
  character: Character
  media: Record<string, MediaEntry>
  font: PixelFont | null
}) {
  const routeOf = Object.fromEntries(ch.projects.map(p => [p.name, p.route]))
  const inLevel = ch.xp - ch.xpLevelStart
  const levelSpan = ch.xpNextLevel - ch.xpLevelStart
  const xpPct = Math.round((inLevel / levelSpan) * 100)
  const avatar = media.avatar
  const total = ch.achievements.length
  const quests = [
    ...profile.career.map(c => ({ kind: '경력', from: c.from, to: c.to, org: c.org, what: c.role })),
    ...profile.training.map(c => ({ kind: '교육', from: c.from, to: c.to, org: c.org, what: c.name })),
    ...profile.education.map(c => ({ kind: '학력', from: c.from, to: c.to, org: c.org, what: `${c.major}${c.note ? ` · ${c.note}` : ''}` })),
  ].sort((a, b) => b.from.localeCompare(a.from))
  const skillGroups = Object.entries(DOMAIN_LABEL).map(([key, label]) => ({ key, label, items: ch.tools.filter(t => t.domain === key) }))

  return (
    <div className="hud">
      <ForceDark />
      {font && (
        <style>{Object.values(font.files).map(f =>
          `@font-face{font-family:'${font.family}';src:url('${f.url}') format('woff2');font-weight:${f.weight};font-display:swap}`).join('')}</style>
      )}

      <div className="mx-auto grid max-w-[1180px] gap-6 px-4 py-8 sm:px-8 lg:grid-cols-[300px_minmax(0,1fr)] lg:items-start">
        {/* ── 캐릭터 카드 ───────────────────────────────────────── */}
        <aside className="hud-frame hud-card" aria-label="캐릭터">
          <div className="pixel hud-tag">CHARACTER</div>
          <div className="hud-avatar">
            {avatar ? (
              // 파이프라인이 크기별 WebP 를 만들고 메타데이터(GPS 등)를 지웠다 (pipeline/src/media.mjs)
              <img
                src={avatar.variants[Math.min(1, avatar.variants.length - 1)].url}
                srcSet={avatar.variants.map(v => `${v.url} ${v.w}w`).join(', ')}
                sizes="180px"
                width={180}
                height={180}
                alt={`${profile.name} 프로필 사진`}
              />
            ) : (
              <img src="/avatar-placeholder.svg" width={180} height={180} alt="프로필 이미지 자리 (임시 그림)" />
            )}
          </div>

          <p className="pixel hud-title">
            <span className="sr-only">장착 칭호: </span>
            {profile.title ? `「${profile.title}」` : <span className="opacity-60">칭호 없음</span>}
          </p>
          <h1 className="pixel hud-name">{profile.name}</h1>
          <p className="hud-name-en">{profile.nameEn}</p>
          <p className="mt-3 text-[13px]"><span className="pixel hud-k">CLASS</span> <span className="text-[var(--fg-strong)]">{profile.class}</span></p>

          <div className="mt-4">
            <div className="flex items-baseline justify-between">
              <span className="pixel hud-level">Lv.{ch.level}</span>
              <Dialog
                title="경험치 내역"
                className="hud-link text-[12px]"
                ariaLabel={`경험치 ${ch.xp.toLocaleString('ko-KR')}, 다음 레벨까지 ${(ch.xpNextLevel - ch.xp).toLocaleString('ko-KR')} — 내역 보기`}
                label={<span className="tabular-nums">{ch.xp.toLocaleString('ko-KR')} / {ch.xpNextLevel.toLocaleString('ko-KR')} XP</span>}
              >
                <table className="hud-table">
                  <thead><tr><th scope="col">쌓인 것</th><th scope="col">개수</th><th scope="col">하나당</th><th scope="col">경험치</th></tr></thead>
                  <tbody>
                    {ch.xpRules.map(r => (
                      <tr key={r.key}><th scope="row">{r.label}</th><td>{r.count.toLocaleString('ko-KR')}</td><td>{r.each}</td><td>{r.xp.toLocaleString('ko-KR')}</td></tr>
                    ))}
                  </tbody>
                  <tfoot><tr><th scope="row" colSpan={3}>합계</th><td>{ch.xp.toLocaleString('ko-KR')}</td></tr></tfoot>
                </table>
                <p className="mt-3 text-[12.5px] text-[var(--fg-dim)]">{ch.xpFormula}. Lv.{ch.level + 1} 까지 {(ch.xpNextLevel - ch.xp).toLocaleString('ko-KR')} 남음.</p>
              </Dialog>
            </div>
            <div className="hud-xp mt-1.5" role="progressbar" aria-label={`Lv.${ch.level} 경험치`} aria-valuemin={0} aria-valuemax={levelSpan} aria-valuenow={inLevel} aria-valuetext={`${xpPct}%`}>
              <span style={{ width: `${xpPct}%` }} />
            </div>
          </div>

          <p className="mt-4 text-[13.5px] leading-6 text-[var(--fg)]">{profile.tagline}</p>

          <ul className="mt-4 flex flex-wrap gap-1.5">
            {Object.entries(profile.links).map(([k, v]) => (
              <li key={k}>
                <a href={hrefOf(k, v)} className="hud-chip" {...(k === 'email' ? {} : { rel: 'me noopener' })}>
                  <LinkIcon kind={k} /> <span>{LINK_LABEL[k] ?? k}</span>
                </a>
              </li>
            ))}
          </ul>

          <dl className="hud-summary mt-5">
            <div><dt>칭호</dt><dd className="pixel"><a href="#titles" className="hud-link">{ch.summary.done}<span className="opacity-60">/{total}</span></a></dd></div>
            <div><dt>퀘스트</dt><dd className="pixel">{ch.projects.length}</dd></div>
            <div><dt>자격 · 수료</dt><dd className="pixel">{profile.certs.length}</dd></div>
            <div><dt>언어</dt><dd className="pixel">{ch.languages.length}</dd></div>
          </dl>
        </aside>

        {/* ── 오른쪽 ───────────────────────────────────────────── */}
        <div className="min-w-0 space-y-6">
          {profile.sections['자기소개'] && (
            <Section id="intro" title="소개" sub="어떤 사람인가">
              <div className="prose hud-prose" dangerouslySetInnerHTML={{ __html: profile.sections['자기소개'] }} />
            </Section>
          )}

          <Section id="stats" title="능력치" sub="STATS · 그 분야 기술을 쓴 프로젝트 수">
            <div className="grid items-center gap-6 md:grid-cols-[minmax(0,300px)_minmax(0,1fr)]">
              <StatRadar stats={ch.stats} />
              <ul className="space-y-1.5">
                {ch.stats.map(s => {
                  const max = Math.max(...ch.stats.map(x => x.value), 1)
                  return (
                    <li key={s.key}>
                      <details className="hud-stat">
                        <summary>
                          <span className="pixel hud-stat-label">{s.label}</span>
                          <span className="hud-meter" aria-hidden><span style={{ width: `${(s.value / max) * 100}%` }} /></span>
                          <span className="pixel hud-stat-value">{s.value}</span>
                        </summary>
                        <ul className="hud-stat-projects">
                          {s.projects.map(p => (
                            <li key={p}>{routeOf[p] ? <Link href={'/' + routeOf[p]} className="hud-link">{p}</Link> : p}</li>
                          ))}
                        </ul>
                      </details>
                    </li>
                  )
                })}
              </ul>
            </div>
          </Section>

          <Section id="titles" title="칭호 도감" sub="ACHIEVEMENTS · 업적을 달성하면 칭호를 얻는다"
            right={<span className="pixel text-[13px] text-[var(--fg-dim)]">{ch.summary.done} / {total}</span>}>
            <TitleCollection items={ch.achievements} equipped={profile.title} />
          </Section>

          <Section id="licenses" title="자격 · 수료" sub="LICENSES · 자격증과 수료증">
            <ul className="grid gap-2.5 sm:grid-cols-2">
              {profile.certs.map(c => (
                <li key={c.name + c.date} className="hud-cert" data-kind={c.kind}>
                  <span className="pixel hud-cert-kind">{c.kind === 'license' ? '자격증' : '수료증'}</span>
                  <p className="text-[14px] font-medium leading-snug text-[var(--fg-strong)]">{c.name}</p>
                  {c.nameAlt && <p className="text-[12.5px] text-[var(--fg-dim)]">{c.nameAlt}</p>}
                  <p className="mt-1 text-[12.5px] text-[var(--fg-dim)]">
                    {c.issuer} · <span className="tabular-nums">{ym(c.date)}</span>
                    {c.urls.map((u, i) => (
                      <a key={u} href={u} className="hud-link ml-2" aria-label={`${c.name} 확인${c.urls.length > 1 ? ` ${i + 1}` : ''} (새 사이트로 이동)`} rel="noopener">
                        확인{c.urls.length > 1 ? ` ${i + 1}` : ''} ↗
                      </a>
                    ))}
                  </p>
                </li>
              ))}
            </ul>
          </Section>

          <Section id="quests" title="퀘스트 로그" sub="경력 · 학력">
            <ol className="hud-timeline">
              {quests.map((q, i) => (
                <li key={i}>
                  <span className="pixel hud-timeline-kind">{q.kind}</span>
                  <p className="tabular-nums text-[12.5px] text-[var(--fg-dim)]">{ym(q.from)} ~ {ym(q.to)}</p>
                  <p className="text-[15px] font-medium text-[var(--fg-strong)]">{q.org}</p>
                  <p className="text-[13.5px] text-[var(--fg)]">{q.what}</p>
                </li>
              ))}
            </ol>
          </Section>

          <Section id="featured" title="주요 퀘스트" sub="대표 프로젝트">
            <ul className="grid gap-3 sm:grid-cols-2">
              {profile.featured.map(p => (
                <li key={p.slug}>
                  <Link href={'/' + p.route} className="hud-quest">
                    <span className="pixel hud-quest-cat">{p.category[1] ?? '프로젝트'}</span>
                    <span className="pixel hud-quest-title">{p.title}</span>
                    <span className="text-[13px] leading-6 text-[var(--fg-dim)]">{p.description}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </Section>

          <Section id="skills" title="스킬" sub="기술 스택 · 괄호 안은 쓴 프로젝트 수">
            <SkillBoard groups={skillGroups} languages={ch.languages} routes={routeOf} />
          </Section>

          {profile.traits.length > 0 && (
            <Section id="traits" title="특성" sub="핵심 역량">
              <ul className="grid gap-3 sm:grid-cols-2">
                {profile.traits.map(t => (
                  <li key={t.name} className="hud-trait">
                    <p className="pixel text-[14px] text-[var(--fg-strong)]">{t.name}</p>
                    <p className="mt-1 text-[13px] leading-6 text-[var(--fg-dim)]">{t.desc}</p>
                    <p className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[12.5px]">
                      {t.projects.map(p => <Link key={p.slug} href={'/' + p.route} className="hud-link">{p.title}</Link>)}
                    </p>
                  </li>
                ))}
              </ul>
            </Section>
          )}

          {profile.sections['사이드 퀘스트'] && (
            <Section id="side" title="사이드 퀘스트" sub="일 밖의 기록">
              <div className="prose hud-prose" dangerouslySetInnerHTML={{ __html: profile.sections['사이드 퀘스트'] }} />
              <p className="mt-3"><span className="hud-chip opacity-70">일상 기록 · 준비 중</span></p>
            </Section>
          )}
        </div>
      </div>
    </div>
  )
}
