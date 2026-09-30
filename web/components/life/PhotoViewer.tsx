'use client'
import { useEffect, useRef, useState } from 'react'
import type { LifePhoto } from '../../lib/life'

const srcset = (v: { w: number; url: string }[]) => v.map(x => `${x.url} ${x.w}w`).join(', ')
const SIZES = '(min-width: 1024px) 880px, 100vw'

/**
 * 글 페이지의 사진 넘기기 — 단추 · ← → 키(사진 칸에 초점이 있을 때) · 좌우로 밀기.
 * 몇 번째 사진인지는 화면 읽기 프로그램에도 알린다 (aria-live).
 * 사진 설명(노트의 `|` 뒤)은 대체 글이면서 사진 밑 한 줄 글로도 보인다 — 인스타그램 설명처럼 쓰는 경우가 많다.
 */
export default function PhotoViewer({ photos }: { photos: LifePhoto[] }) {
  const [at, setAt] = useState(0)
  const startX = useRef<number | null>(null)
  const step = (d: number) => setAt(i => Math.min(photos.length - 1, Math.max(0, i + d)))
  const photo = photos[at]
  const many = photos.length > 1

  // 다음 · 이전 사진을 미리 받아 둔다 — 넘기는 순간 비지 않게. 브라우저가 고를 크기(srcset)까지 같게 해야 실제로 쓰인다
  useEffect(() => {
    for (const k of [at + 1, at - 1]) {
      const ph = photos[k]
      if (!ph) continue
      const img = new Image()
      img.sizes = SIZES
      img.srcset = srcset(ph.variants)
      img.src = ph.variants[Math.min(1, ph.variants.length - 1)].url
    }
  }, [at, photos])

  return (
    <figure>
    <div
      // 칸 높이를 고정한다. 아직 받지 않은 다음 사진은 잠깐 높이가 0 이 되어 페이지가 줄고 스크롤이 위로 튀었다 (2026-09-30).
      // 사진은 칸 안에 맞춰(contain) 비율이 달라도 잘리지 않는다
      className="relative h-[min(72vh,640px)] select-none overflow-hidden rounded-lg bg-black"
      role={many ? 'group' : undefined}
      aria-roledescription={many ? '사진 넘기기' : undefined}
      aria-label={many ? `사진 ${photos.length}장` : undefined}
      tabIndex={many ? 0 : undefined}
      onKeyDown={e => {
        if (e.key === 'ArrowRight') { e.preventDefault(); step(1) }
        else if (e.key === 'ArrowLeft') { e.preventDefault(); step(-1) }
      }}
      onPointerDown={e => { startX.current = e.clientX }}
      onPointerUp={e => {
        if (startX.current == null) return
        const dx = e.clientX - startX.current
        startX.current = null
        if (Math.abs(dx) > 40) step(dx < 0 ? 1 : -1)
      }}
    >
      <img
        key={photo.variants[0].url}
        src={photo.variants[Math.min(1, photo.variants.length - 1)].url}
        srcSet={srcset(photo.variants)}
        sizes={SIZES}
        width={photo.width}
        height={photo.height}
        alt={photo.alt}
        draggable={false}
        fetchPriority={at === 0 ? 'high' : undefined}
        className="h-full w-full object-contain"
      />
      {many && (
        <>
          <button type="button" className="life-nav left-2" onClick={() => step(-1)} disabled={at === 0} aria-label="이전 사진">‹</button>
          <button type="button" className="life-nav right-2" onClick={() => step(1)} disabled={at === photos.length - 1} aria-label="다음 사진">›</button>
          <p className="absolute bottom-2 left-1/2 -translate-x-1/2 rounded-full bg-black/55 px-2.5 text-[12px] leading-6 text-white tabular-nums" aria-live="polite">
            {at + 1} / {photos.length}
          </p>
        </>
      )}
    </div>
    {/* 설명이 없는 사진도 있어 자리를 비워 두지 않는다. 넘길 때 높이가 흔들리지 않게 최소 높이만 준다 */}
    <figcaption className="mt-2 min-h-[1.5em] text-center text-[13.5px] text-[var(--fg-dim)]" aria-hidden>{photo.alt}</figcaption>
    </figure>
  )
}
