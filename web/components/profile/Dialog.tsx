'use client'
import { useRef, type ReactNode } from 'react'

/**
 * 누르면 열리는 상세 창.
 *
 * 브라우저 기본 <dialog> 의 showModal() 을 쓴다. 뒤쪽을 막고(inert), 초점을 안에 가두고,
 * Esc 로 닫고, 닫으면 여는 단추로 초점을 돌려주는 일을 브라우저가 한다 (KWCAG 2.1.2).
 */
export function Dialog({ label, title, className, children, ariaLabel }: {
  label: ReactNode
  title: string
  className?: string
  ariaLabel?: string
  children: ReactNode
}) {
  const ref = useRef<HTMLDialogElement>(null)
  return (
    <>
      <button type="button" className={className} aria-label={ariaLabel} aria-haspopup="dialog" onClick={() => ref.current?.showModal()}>
        {label}
      </button>
      <DialogShell ref={ref} title={title}>{children}</DialogShell>
    </>
  )
}

export function DialogShell({ ref, title, children, onClose }: { ref: React.Ref<HTMLDialogElement>; title: string; children: ReactNode; onClose?: () => void }) {
  return (
    <dialog
      ref={ref}
      className="hud-dialog"
      aria-label={title}
      onClose={onClose}
      // 바깥(어두운 막)을 누르면 닫는다
      onClick={e => { if (e.target === e.currentTarget) (e.currentTarget as HTMLDialogElement).close() }}
    >
      {/* 열리면 초점을 창 자체에 둔다. 브라우저는 첫 단추(닫기)로 보내 초점선을 그리는데,
          눌러서 연 사람에게는 누르지 않은 단추가 선택된 것처럼 보인다 (검색창과 같은 이유). Tab 으로 닫기 단추에 간다 */}
      <div className="hud-frame p-5 sm:p-6" tabIndex={-1} autoFocus>
        <div className="mb-4 flex items-start justify-between gap-4">
          {/* 창 이름은 dialog 의 aria-label 로 전한다. 페이지의 제목 구조(h1 → h2)에 끼어들지 않게 제목 태그를 쓰지 않는다 */}
          <p className="pixel text-[17px] leading-snug text-[var(--fg-strong)]">{title}</p>
          <form method="dialog">
            <button className="pixel -mr-1 -mt-1 rounded px-2 py-1 text-[13px] text-[var(--fg-dim)] hover:text-[var(--fg-strong)]" aria-label="닫기">✗</button>
          </form>
        </div>
        {children}
      </div>
    </dialog>
  )
}
