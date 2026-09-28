import { useEffect, type RefObject } from 'react'

const FOCUSABLE = 'a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])'

/**
 * 열린 대화상자 안에 키보드 초점을 가둔다 (KWCAG 2.1.2 초점 이동).
 *
 * 뒤쪽 화면이 가려져 있는데 Tab 이 그 밑으로 빠져나가면, 키보드 사용자는
 * 보이지 않는 곳을 헤매게 된다. 끝에서 Tab 을 누르면 처음으로, 처음에서 Shift+Tab 을
 * 누르면 끝으로 돌린다. 닫히면 열기 전에 있던 곳(여는 단추)으로 초점을 돌려준다.
 */
const focusables = (root: HTMLElement) =>
  Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(el => el.getClientRects().length > 0)

export function useModalFocus(open: boolean, box: RefObject<HTMLElement | null>) {
  useEffect(() => {
    if (!open) return
    const back = document.activeElement as HTMLElement | null

    // 1) 끝 ↔ 처음 돌리기
    let backward = false
    const onKey = (e: KeyboardEvent) => {
      const root = box.current
      if (e.key !== 'Tab' || !root) return
      backward = e.shiftKey
      const items = focusables(root)
      if (!items.length) return
      const first = items[0], last = items[items.length - 1]
      const at = document.activeElement
      if (e.shiftKey && at === first) { e.preventDefault(); last.focus() }
      else if (!e.shiftKey && at === last) { e.preventDefault(); first.focus() }
    }
    // 2) 그래도 밖으로 나가면 되돌린다.
    //    스크롤 영역처럼 브라우저가 스스로 초점을 주는 요소는 목록에 잡히지 않아
    //    1) 만으로는 거기서 다음 Tab 이 밖으로 샌다.
    const onFocusIn = (e: FocusEvent) => {
      const root = box.current
      if (!root || root.contains(e.target as Node)) return
      const items = focusables(root)
      ;(backward ? items[items.length - 1] : items[0])?.focus()
    }
    addEventListener('keydown', onKey)
    document.addEventListener('focusin', onFocusIn)
    return () => {
      removeEventListener('keydown', onKey)
      document.removeEventListener('focusin', onFocusIn)
      // 페이지를 옮긴 경우 여는 단추가 사라졌을 수 있다
      if (back?.isConnected) back.focus({ preventScroll: true })
    }
  }, [open, box])
}
