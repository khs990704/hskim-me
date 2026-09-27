// 페이지마다 OG 이미지(링크 미리보기 카드)를 만든다.
//
// 카톡·슬랙·링크드인에 링크를 붙이면 이 이미지가 뜬다. 이력서에 사이트 링크를
// 넣을 것이므로, 카드만 보고도 무슨 글인지 알 수 있어야 한다.
//
//   출력   public/og/<route>.jpg   (1200×630, .gitignore 대상 — 매 빌드 다시 만든다)
//   특수   public/og/_site.jpg 등  (메인·목록 페이지용)
//
// JPEG 로 낸다. 성운 그라데이션과 별 때문에 PNG 는 한 장에 115KB 였고(571장 64MB),
// JPEG 85% 는 눈으로 차이 없이 32KB 다.
//
// Satori 로 그리고 resvg 로 PNG 로 바꾼다. Satori 는 woff2 를 못 읽어서
// assets/og-fonts 의 OTF 를 쓴다(scripts/fetch-fonts.mjs 가 받아 둔다).
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import satori from 'satori'
import { Resvg } from '@resvg/resvg-js'
import sharp from 'sharp'

const HERE = path.dirname(fileURLToPath(import.meta.url))
const WEB = path.join(HERE, '..')
const CONTENT = path.join(WEB, '..', 'pipeline', 'out', 'content')
const OUT = path.join(WEB, 'public', 'og')
const FONTS = path.join(WEB, 'assets', 'og-fonts')

const W = 1200, H = 630

const fonts = [
  { name: 'Pretendard', data: fs.readFileSync(path.join(FONTS, 'Pretendard-Bold.otf')), weight: 700, style: 'normal' },
  { name: 'Pretendard', data: fs.readFileSync(path.join(FONTS, 'Pretendard-Medium.otf')), weight: 500, style: 'normal' },
]

// 사이트 아이콘(연결된 노드 셋)을 카드 오른쪽 아래에 둔다
const ICON = 'data:image/svg+xml;base64,' +
  Buffer.from(fs.readFileSync(path.join(WEB, 'app', 'icon.svg'))).toString('base64')

/** 종류별 이름과 강조색. 사이트 본문의 제목 색과 같은 계열이다 */
const KIND = {
  note:      { label: '지식 노트',   accent: '#7dd3fc' },
  project:   { label: '프로젝트 기록', accent: '#a78bfa' },
  portfolio: { label: '포트폴리오',   accent: '#f0c674' },
  site:      { label: '지식 그래프',  accent: '#7dd3fc' },
}

const el = (type, style, children) => ({ type, props: { style, children } })

/** 경로마다 같은 별자리가 나오도록 주소로 씨앗을 만든다 */
function stars(seed) {
  let h = 2166136261
  for (const c of seed) h = Math.imul(h ^ c.charCodeAt(0), 16777619)
  const rnd = () => ((h = Math.imul(h ^ (h >>> 15), 2246822507) ^ Math.imul(h ^ (h >>> 13), 3266489909)) >>> 0) / 4294967296
  // 글자가 놓이는 곳에는 별을 두지 않는다. 글자 뒤에 겹치면 가운뎃점(·)처럼 읽힌다
  const onText = (x, y) =>
    (x > 56 && x < 1150 && y > 150 && y < 470) ||   // 분류·제목·설명
    (x > 56 && x < 260 && y > 60 && y < 115) ||     // 사이트 이름
    (x > 950 && y > 55 && y < 120) ||               // 종류 표시
    (y > 525 && y < 585 && (x < 460 || x > 1060))   // 아래 줄
  const out = []
  while (out.length < 70) {
    const x = rnd() * W, y = rnd() * H
    const s = rnd() < 0.85 ? 1 + rnd() * 1.5 : 2.5 + rnd() * 1.5
    const a = (0.25 + rnd() * 0.6).toFixed(2)
    if (onText(x, y)) continue
    out.push(el('div', {
      position: 'absolute', left: x, top: y, width: s, height: s,
      borderRadius: s, backgroundColor: `rgba(232,246,255,${a})`,
    }))
  }
  return out
}

/** 글자 수로 제목 크기를 정한다. 카드 한 장에 세 줄을 넘기지 않게 */
const titleSize = t => (t.length <= 16 ? 78 : t.length <= 28 ? 66 : t.length <= 44 ? 56 : 48)
const clip = (t, n) => (t.length > n ? t.slice(0, n - 1).trimEnd() + '…' : t)
// 'Project Index' 는 사이트 주소에서도 빼는 내부 폴더라 분류에도 쓰지 않는다
const crumb = cat => cat
  .map(c => c.replace(/^\d{2}\s+/, ''))
  .filter(c => c.toLowerCase() !== 'project index')
  .slice(-2).join('  ·  ')

function card({ title, description, kind, category, seed }) {
  const k = KIND[kind] ?? KIND.note
  return el('div', {
    width: W, height: H, display: 'flex', position: 'relative', overflow: 'hidden',
    backgroundColor: '#04060c', fontFamily: 'Pretendard', color: '#e8edf5',
    wordBreak: 'keep-all',   // 한국어 낱말 중간에서 줄을 바꾸지 않는다
  }, [
    // 성운 — 강조색 빛 한 덩이와 보라빛 한 덩이
    el('div', { position: 'absolute', left: 620, top: -260, width: 900, height: 700, display: 'flex',
      backgroundImage: `radial-gradient(circle at center, ${k.accent}33 0%, transparent 62%)` }),
    el('div', { position: 'absolute', left: -320, top: 300, width: 900, height: 700, display: 'flex',
      backgroundImage: 'radial-gradient(circle at center, #6d4ac933 0%, transparent 60%)' }),
    ...stars(seed),

    el('div', { position: 'absolute', left: 0, top: 0, width: W, height: H, display: 'flex',
      flexDirection: 'column', padding: '64px 72px' }, [
      // 위 — 사이트 이름과 종류
      el('div', { display: 'flex', justifyContent: 'space-between', alignItems: 'center' }, [
        el('div', { display: 'flex', fontSize: 32, fontWeight: 700, letterSpacing: -0.5 }, [
          el('span', {}, 'hskim'), el('span', { color: '#5c6678' }, '.me'),
        ]),
        el('div', { display: 'flex', fontSize: 22, fontWeight: 500, color: k.accent,
          border: `1.5px solid ${k.accent}88`, borderRadius: 999, padding: '8px 20px' }, k.label),
      ]),

      // 가운데 — 분류, 제목, 설명
      el('div', { display: 'flex', flexDirection: 'column', flexGrow: 1, justifyContent: 'center' }, [
        category ? el('div', { display: 'flex', fontSize: 26, fontWeight: 500, color: k.accent, marginBottom: 20 }, category) : null,
        el('div', { display: 'flex', fontSize: titleSize(title), fontWeight: 700, lineHeight: 1.18,
          letterSpacing: -1, maxHeight: 3 * 1.18 * titleSize(title), overflow: 'hidden' }, clip(title, 64)),
        description ? el('div', { display: 'flex', fontSize: 28, fontWeight: 500, color: '#9aa5b8',
          lineHeight: 1.5, marginTop: 26, maxHeight: 2 * 1.5 * 28, overflow: 'hidden' }, clip(description, 84)) : null,
      ].filter(Boolean)),

      // 아래 — 한 줄 소개와 아이콘
      el('div', { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }, [
        el('div', { display: 'flex', fontSize: 22, fontWeight: 500, color: '#5c6678' }, '지식 노트와 프로젝트 기록을 연결해 둔 곳'),
        { type: 'img', props: { src: ICON, width: 56, height: 56, style: { borderRadius: 12 } } },
      ]),
    ]),
  ])
}

async function render(node, file) {
  const svg = await satori(node, { width: W, height: H, fonts })
  const png = new Resvg(svg, { fitTo: { mode: 'width', value: W } }).render().asPng()
  const jpg = await sharp(png).jpeg({ quality: 85, mozjpeg: true }).toBuffer()
  fs.mkdirSync(path.dirname(file), { recursive: true })
  fs.writeFileSync(file, jpg)
  return jpg.length
}

function walk(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name)
    if (e.isDirectory()) walk(p, out)
    else if (e.name.endsWith('.json')) out.push(JSON.parse(fs.readFileSync(p, 'utf8')))
  }
  return out
}

// OG_ONLY=<route> 를 주면 그 페이지만 다시 그린다. 모양을 고칠 때 확인용
const ONLY = process.env.OG_ONLY
const started = Date.now()
if (!ONLY) fs.rmSync(OUT, { recursive: true, force: true })

// 메인과 목록 페이지
const SPECIAL = [
  // 위에 이미 hskim.me 가 있으므로 가운데에는 이름을 둔다. 이력서와 함께 보일 카드다
  ['_site',     { title: '김희섭', description: '지식 노트와 프로젝트 기록을 3D 그래프로 연결한 개인 사이트', kind: 'site' }],
  ['_notes',    { title: '지식 노트', description: 'AI·데이터, 소프트웨어 공학, 인프라, 보안까지 공부하고 정리한 노트', kind: 'note' }],
  ['_projects', { title: '프로젝트 기록', description: '실무·팀·개인 프로젝트에서 맡은 일과 해결한 문제', kind: 'project' }],
  ['_index',    { title: '전체 목록', description: '사이트의 모든 문서를 분류별로 모아 둔 목록', kind: 'site' }],
]
let bytes = 0
const specials = ONLY ? SPECIAL.filter(([n]) => n === ONLY) : SPECIAL
for (const [name, c] of specials) bytes += await render(card({ ...c, category: '', seed: name }), path.join(OUT, `${name}.jpg`))

const docs = walk(CONTENT).filter(d => !ONLY || d.route === ONLY)
for (const d of docs) {
  bytes += await render(card({
    title: d.title,
    description: d.description,
    kind: d.kind,
    category: crumb(d.category ?? []),
    seed: d.route,
  }), path.join(OUT, `${d.route}.jpg`))
}

const secs = ((Date.now() - started) / 1000).toFixed(1)
console.log(`\n  OG 이미지 — ${docs.length + specials.length}장 · ${(bytes / 1048576).toFixed(1)}MB · ${secs}s\n`)
