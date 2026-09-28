'use client'
import { useEffect, useRef, useState } from 'react'
import type { Skill } from '../../lib/profile'
import { DialogShell } from './Dialog'

/** 스킬 배지 — 누르면 그 기술을 쓴 프로젝트가 열린다 */
export default function SkillBoard({ groups, languages, routes }: {
  groups: { key: string; label: string; items: Skill[] }[]
  languages: Skill[]
  routes: Record<string, string | null>
}) {
  const [open, setOpen] = useState<Skill | null>(null)
  const ref = useRef<HTMLDialogElement>(null)
  const show = (s: Skill) => setOpen(s)
  // 고른 항목이 정해지면 바로 연다. 다음 화면 갱신(requestAnimationFrame)을 기다리면
  // WebKit 에서 창이 늦게 열려, 그사이 누른 Esc 가 먹히지 않았다.
  useEffect(() => { if (open && !ref.current?.open) ref.current?.showModal() }, [open])

  const Row = ({ label, items }: { label: string; items: Skill[] }) => (
    <div className="hud-skill-row">
      <h3 className="pixel hud-skill-label">{label}</h3>
      <ul className="flex flex-wrap gap-1.5">
        {items.map(s => (
          <li key={s.name}>
            <button type="button" className="hud-skill" onClick={() => show(s)} aria-haspopup="dialog" aria-label={`${s.name}, 프로젝트 ${s.projects.length}개`}>
              <span>{s.name}</span>
              <span className="pixel hud-skill-count">×{s.projects.length}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  )

  return (
    <div className="space-y-3">
      <Row label="언어" items={languages} />
      {groups.filter(g => g.items.length).map(g => <Row key={g.key} label={g.label} items={g.items} />)}

      <DialogShell ref={ref} onClose={() => setOpen(null)} title={open ? `${open.name} — 프로젝트 ${open.projects.length}개` : ''}>
        {open && (
          <ul className="space-y-1.5 text-[14px]">
            {open.projects.map(p => (
              <li key={p}>
                {routes[p] ? <a href={'/' + routes[p]} className="hud-link">{p}</a> : <span>{p}</span>}
              </li>
            ))}
          </ul>
        )}
      </DialogShell>
    </div>
  )
}
