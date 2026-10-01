/**
 * <details> 를 부드럽게 열고 닫는다 — 높이 전환을 지원하지 않는 브라우저가 많아 직접 움직인다.
 * root 안에서 selector 에 맞는 <details> 의 summary 를 누르면, summary 다음 내용(첫 번째 다른 자식)의
 * 높이 · 위아래 안쪽 여백을 0 ↔ 원래 값으로 바꾼다 (여백까지 움직여야 끝에서 툭 줄어들지 않는다).
 * 닫는 동안은 data-closing — 화살표 등을 미리 닫힌 모양으로 돌릴 때 쓴다. 움직임 줄이기 설정이면 바로 열고 닫는다.
 * 쓰는 곳: 전체 목록 하위 분류(IndexFilter), 소개 능력치(SmoothDetails)
 */
export function smoothDetails(root: Element, selector: string): () => void {
  const onClick = (e: Event) => {
    const sum = (e.target as HTMLElement).closest(`${selector} > summary`)
    if (!sum || !root.contains(sum) || matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const d = sum.parentElement as HTMLDetailsElement
    const body = d.querySelector<HTMLElement>(':scope > :not(summary)')
    if (!body || d.dataset.moving !== undefined) return
    e.preventDefault()
    d.dataset.moving = ''
    const opts = { duration: 260, easing: 'cubic-bezier(.2, .8, .2, 1)' }
    body.style.overflow = 'hidden'
    const done = () => { body.style.overflow = ''; delete d.dataset.moving; delete d.dataset.closing }
    const shut = { height: '0px', paddingTop: '0px', paddingBottom: '0px', opacity: 0 }
    const full = () => {
      const cs = getComputedStyle(body)
      return { height: body.offsetHeight + 'px', paddingTop: cs.paddingTop, paddingBottom: cs.paddingBottom, opacity: 1 }
    }
    if (!d.open) {
      d.open = true
      body.animate([shut, full()], opts).onfinish = done
    } else {
      d.dataset.closing = ''
      body.animate([full(), shut], opts).onfinish = () => { d.open = false; done() }
    }
  }
  root.addEventListener('click', onClick)
  return () => root.removeEventListener('click', onClick)
}
