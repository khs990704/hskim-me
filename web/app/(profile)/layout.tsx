import SiteHeader from '../../components/SiteHeader'

/**
 * 소개(스탯창) 틀 — 문서 틀과 같은 헤더, 왼쪽 문서 트리는 없다 (2026-09-29 고객 요청).
 * 캐릭터 카드와 트리가 나란히 서면 화면이 좁아진다. 다른 곳으로 가는 길은 헤더에 남는다.
 */
export default function ProfileLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <SiteHeader />
      <main id="main" tabIndex={-1} className="min-w-0">{children}</main>
    </>
  )
}
