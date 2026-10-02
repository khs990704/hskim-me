import type { NeroState } from '../../lib/nero-store'

/**
 * 픽셀 Nero — 우주선을 탄 검은 고양이 (P8 §4, 시안 docs/01-planning/assets/nero-character.html).
 * 25×18 칸. 글자 하나가 한 칸: . 빈칸  K 고양이  G 유리  g 유리 반사  R 테두리  H 선체  h 선체 밝은 줄
 * L 불빛  A 안테나  Y 눈  P 눈동자  N 코  F f 불꽃  E 귀 안쪽  Z 감은 눈  T 꼬리
 * 그림만 픽셀이고, 움직임(불꽃 · 깜빡임 · 말줄임)은 globals.css 의 .nero-* 가 맡는다.
 */
const BASE = [
  '............L............',
  '............A............',
  '........GGGGGGGGG........',
  '......GgGGGGGGGGGGG......',
  '.....GgGKGGGGGGGKGGG.....',
  '....GGGKKKGGGGGKKKGGG....',
  '....GGGKEKKKKKKKEKGGGT...',
  '...GGGKKKKKKKKKKKKKGGTG..',
  '...GGGKKEYEKKKEYEKKGTGG..',
  '...GGGKKKKKKKKKKKKKGTGG..',
  '...GGGGKKKKKNKKKKKGGGGG..',
  '..RRRRRRRRRRRRRRRRRRRRR..',
  'fHHHHHHHHHHHHHHHHHHHHHHH.',
  'FFHHhhhhhhhhhhhhhhhhhHHHH',
  'fHHHHHHHHHHHHHHHHHHHHHHH.',
  '...HHHHHHHHHHHHHHHHHHH...',
  '....HHH..L...L...L..HHH..',
  '...HHH.............HHH...',
]

// 상태마다 눈 · 귀 · 불꽃 · 불빛을 바꾼다
function map(state: NeroState) {
  const m = BASE.map(r => r.split(''))
  const set = (r: number, c: number, ch: string) => { m[r][c] = ch }
  if (state === 'idle') {        // 반쯤 감은 눈 — 시크하게
    ;[9, 10, 15, 16].forEach(c => set(8, c, 'K'))
    ;[9, 15].forEach(c => set(9, c, 'Y')); [10, 16].forEach(c => set(9, c, 'P'))
  }
  if (state === 'think') {       // 위를 봄 + 왼쪽 귀가 돌아감
    set(8, 9, 'P'); set(8, 10, 'Y'); set(8, 15, 'P'); set(8, 16, 'Y')
    set(4, 8, 'G'); set(5, 7, 'K')
  }
  if (state === 'talk') {        // 크게 뜬 눈
    ;[9, 10, 15, 16].forEach(c => set(7, c, 'Y'))
    set(8, 9, 'Y'); set(8, 10, 'P'); set(8, 15, 'P'); set(8, 16, 'Y')
  }
  if (state === 'sleep') {       // 감은 눈 · 불꽃 · 불빛 끔
    ;[9, 10, 15, 16].forEach(c => set(8, c, 'K'))
    ;[9, 10, 15, 16].forEach(c => set(9, c, 'Z'))
    m[12][0] = m[13][0] = m[13][1] = m[14][0] = '.'
    m[0][12] = 'a'; m[16] = m[16].map(ch => (ch === 'L' ? 'l' : ch))
  }
  return m
}

const PAL: Record<string, string> = {
  K: '#0b0b10', G: 'rgba(125,211,252,.16)', g: 'rgba(230,248,255,.55)', R: '#5fb8e6', H: '#1c2644', h: '#33416b',
  L: '#7dd3fc', l: '#33405e', A: '#4a5778', a: '#33405e', Y: '#f5c55b', P: '#0b0b10', N: '#e48ea0', F: '#7dd3fc', f: '#e9fbff',
  E: '#3a1e2c', Z: '#5a6684', T: '#0b0b10',
}

/** 같은 색 칸이 가로로 이어지면 한 사각형으로 묶는다 — 칸마다 그리면 사각형이 300개가 넘는다 */
function runs(state: NeroState) {
  const out: { x: number; y: number; w: number; ch: string }[] = []
  map(state).forEach((row, y) => {
    let x = 0
    while (x < row.length) {
      const ch = row[x]
      let w = 1
      while (x + w < row.length && row[x + w] === ch) w++
      if (PAL[ch]) out.push({ x, y, w, ch })
      x += w
    }
  })
  return out
}

const CLS: Record<string, string> = { F: 'nero-flame', f: 'nero-flame nero-flame-core' }

export default function NeroSprite({ state = 'idle', className = '' }: { state?: NeroState; className?: string }) {
  return (
    <svg viewBox="-1 -1 28 20" shapeRendering="crispEdges" aria-hidden className={`nero-sprite ${className}`} data-state={state}>
      {runs(state).map(({ x, y, w, ch }) => (
        <rect key={`${x}-${y}`} x={x} y={y} width={w + 0.02} height={1.02} fill={PAL[ch]}
          className={CLS[ch] ?? (ch === 'L' && y === 0 ? 'nero-light' : undefined)} />
      ))}
      {state === 'think' && (
        <g className="nero-dots" fill="#e6ebf5"><rect x="21" y="2" width="1" height="1" /><rect x="23" y="1" width="1" height="1" /><rect x="25" y="0" width="1" height="1" /></g>
      )}
      {state === 'sleep' && (
        <g className="nero-zz" fill="#8d97ad"><rect x="21" y="3" width="2" height=".6" /><rect x="22" y="3.6" width=".6" height=".8" /><rect x="21" y="4.4" width="2" height=".6" /></g>
      )}
    </svg>
  )
}
