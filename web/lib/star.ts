import * as THREE from 'three'

/**
 * 별 스프라이트.
 *
 * 구체(Mesh)로 그리면 표면에 음영이 생겨 '공'으로 보인다. 별은 표면이 없다.
 * 항상 카메라를 향하는 스프라이트에 방사형 광량 분포를 그려 넣어야
 * 점광원처럼 읽힌다.
 *
 * 광량 분포는 세 겹이다.
 *   1. 아주 작고 강한 중심핵  — 별의 실체
 *   2. 넓고 옅은 헤일로       — 대기 산란
 *   3. 희미한 십자 회절       — 이게 있어야 '점'이 아니라 '별'로 읽힌다
 */
let cached: THREE.Texture | null = null

export function starTexture(): THREE.Texture {
  if (cached) return cached

  const S = 128
  const c = document.createElement('canvas')
  c.width = c.height = S
  const ctx = c.getContext('2d')!
  const mid = S / 2

  // 2. 헤일로 — 짧게 끊는다.
  // 넓게 퍼뜨렸더니 별끼리 헤일로가 겹쳐 뭉개졌다. 번짐만 남고 점이 사라진다.
  const halo = ctx.createRadialGradient(mid, mid, 0, mid, mid, mid)
  halo.addColorStop(0.00, 'rgba(255,255,255,1)')
  halo.addColorStop(0.14, 'rgba(255,255,255,1)')
  halo.addColorStop(0.22, 'rgba(255,255,255,0.58)')
  halo.addColorStop(0.32, 'rgba(255,255,255,0.14)')
  halo.addColorStop(0.55, 'rgba(255,255,255,0.02)')
  halo.addColorStop(1.00, 'rgba(255,255,255,0)')
  ctx.fillStyle = halo
  ctx.fillRect(0, 0, S, S)

  // 3. 십자 회절 — 아주 옅게. 세지면 장난감처럼 보인다
  ctx.globalCompositeOperation = 'lighter'
  const spike = (w: number, h: number) => {
    const g = ctx.createLinearGradient(mid - w, 0, mid + w, 0)
    g.addColorStop(0, 'rgba(255,255,255,0)')
    g.addColorStop(0.5, 'rgba(255,255,255,0.13)')
    g.addColorStop(1, 'rgba(255,255,255,0)')
    ctx.fillStyle = g
    ctx.fillRect(mid - w, mid - h, w * 2, h * 2)
  }
  spike(mid * 0.72, 0.8)         // 가로
  ctx.save()
  ctx.translate(mid, mid); ctx.rotate(Math.PI / 2); ctx.translate(-mid, -mid)
  spike(mid * 0.72, 0.8)         // 세로
  ctx.restore()

  // 1. 중심핵 — 작고 강하게. 가산 합성으로 두 번 얹어 또렷하게 만든다.
  // 핵이 약하면 헤일로만 남아 '흐릿한 얼룩' 이 된다.
  const core = ctx.createRadialGradient(mid, mid, 0, mid, mid, mid * 0.15)
  core.addColorStop(0.0, 'rgba(255,255,255,1)')
  core.addColorStop(0.5, 'rgba(255,255,255,0.75)')
  core.addColorStop(1.0, 'rgba(255,255,255,0)')
  ctx.fillStyle = core
  ctx.fillRect(0, 0, S, S)
  ctx.fillRect(0, 0, S, S)
  ctx.globalCompositeOperation = 'source-over'

  const tex = new THREE.CanvasTexture(c)
  tex.colorSpace = THREE.SRGBColorSpace
  cached = tex
  return tex
}

export function createStar(color: string, radius: number): THREE.Sprite {
  const mat = new THREE.SpriteMaterial({
    map: starTexture(),
    color: new THREE.Color(color),
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  })
  const sprite = new THREE.Sprite(mat)
  // 헤일로를 짧게 끊었으므로 전체 크기도 줄인다.
  // 6.2 배일 때는 화면의 대부분이 옅은 헤일로라 별이 뭉개져 보였다.
  sprite.scale.setScalar(radius * 3.8)
  return sprite
}
