import type { Stat } from '../../lib/profile'
import { DOMAIN_COLOR } from '../../lib/domain-colors'

/** 가장 큰 값이 차지하는 비율 — 테두리에 닿지 않게 (막대도 같은 기준) */
export const STAT_FILL = 0.8

/**
 * 능력치 육각형 — 가장 큰 값을 바깥 테두리의 80% 에 둔 상대 비교.
 * 그림은 보조다. 같은 숫자를 옆의 목록이 글자로 보여 준다 (KWCAG 1.1.1).
 */
export default function StatRadar({ stats }: { stats: Stat[] }) {
  const S = 260, C = S / 2, R = 92
  const max = Math.max(1, ...stats.map(s => s.value))
  const n = stats.length
  const pt = (i: number, r: number) => {
    const a = -Math.PI / 2 + (i * 2 * Math.PI) / n
    return [C + r * Math.cos(a), C + r * Math.sin(a)] as const
  }
  const ring = (k: number) => stats.map((_, i) => pt(i, (R * k) / 4).join(',')).join(' ')
  const shape = stats.map((s, i) => pt(i, Math.max(6, (R * STAT_FILL * s.value) / max)).join(',')).join(' ')
  const summary = stats.map(s => `${s.label} ${s.value}`).join(', ')

  return (
    <svg viewBox={`0 0 ${S} ${S}`} className="hud-radar w-full max-w-[300px]" role="img" aria-label={`능력치 육각형 그래프 — ${summary} (그 분야 기술을 쓴 프로젝트 수)`}>
      {[1, 2, 3, 4].map(k => <polygon key={k} points={ring(k)} className="hud-radar-ring" />)}
      {stats.map((_, i) => { const [x, y] = pt(i, R); return <line key={i} x1={C} y1={C} x2={x} y2={y} className="hud-radar-ring" /> })}
      <polygon points={shape} className="hud-radar-shape" />
      {stats.map((s, i) => { const [x, y] = pt(i, Math.max(6, (R * STAT_FILL * s.value) / max)); return <circle key={s.key} cx={x} cy={y} r="4" className="hud-radar-dot" style={{ fill: DOMAIN_COLOR[s.key] }} /> })}
      {stats.map((s, i) => {
        const [x, y] = pt(i, R + 22)
        return (
          <text key={s.key} x={x} y={y} textAnchor="middle" dominantBaseline="middle" className="pixel hud-radar-label" style={{ fill: DOMAIN_COLOR[s.key] }}>
            {s.label}
          </text>
        )
      })}
    </svg>
  )
}
