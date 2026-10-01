// 화면 시험 — 빌드 결과(out/)를 세 브라우저 엔진으로 열어 확인한다.   npm run qa
//
//   엔진     Chromium(Chrome · Edge · 삼성 인터넷) · Firefox · WebKit(Safari · 아이폰 전부)
//   페이지   메인 · 수식 · 도표 · 코드 · 전체 목록 · 404 · 소개(스탯창) — 데스크톱 1280, 모바일 390
//   확인     스크립트 오류, 가로 스크롤, 그래프 · 수식 · 도표 · 코드 강조 · 글꼴이 그려지는지,
//            키보드(본문 바로가기 · 검색 초점 가두기 · Esc 복귀), 스탯창(상세 창 · 접기 · 숨김 칭호)
//
// 통과하면 엔진마다 한 줄, 실패한 항목만 자세히 찍는다.
//   QA_ENGINES=webkit npm run qa     엔진 고르기
//   QA_SHOTS=경로 npm run qa          스크린샷 저장
//   QA_ROOT=경로 npm run qa           다른 곳의 빌드 결과를 시험
//
// 먼저 빌드가 되어 있어야 한다 (npm run build). 브라우저 엔진은 ~/.cache/ms-playwright 에 한 번만 설치
// (npx playwright install chromium firefox webkit — WebKit 은 sudo npx playwright install-deps webkit 도).
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium, firefox, webkit } from 'playwright'
import { serve } from './serve.mjs'

const WEB = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..')
// QA_ROOT — 다른 곳에 빌드한 결과를 시험할 때 (개발 서버가 켜져 있어 여기서 빌드할 수 없을 때)
const OUT = process.env.QA_ROOT ? path.resolve(process.env.QA_ROOT) : path.join(WEB, 'out')
if (!fs.existsSync(path.join(OUT, 'index.html'))) { console.error('  ✗ out/ 이 없습니다 — 먼저 npm run build'); process.exit(1) }

const PORT = 4599
const B = `http://127.0.0.1:${PORT}`
const ENGINES = { chromium, firefox, webkit }
const pick = (process.env.QA_ENGINES ?? 'chromium,firefox,webkit').split(',').map(s => s.trim()).filter(Boolean)
const SHOTS = process.env.QA_SHOTS
if (SHOTS) fs.mkdirSync(SHOTS, { recursive: true })

// 파일 이름이 바뀌어도 시험이 따라가도록, 특징으로 페이지를 고른다
const findPage = pred => {
  const walk = d => fs.readdirSync(d, { withFileTypes: true }).flatMap(e => e.isDirectory() ? walk(path.join(d, e.name)) : e.name.endsWith('.html') ? [path.join(d, e.name)] : [])
  for (const f of walk(path.join(OUT, 'notes')).concat(walk(path.join(OUT, 'portfolio')))) {
    if (pred(fs.readFileSync(f, 'utf8'))) return '/' + path.relative(OUT, f).replace(/\\/g, '/').replace(/\.html$/, '')
  }
  return null
}
const PAGES = [
  { key: 'home', path: '/', expect: { canvas: true } },
  { key: 'math', path: findPage(h => h.includes('class="katex')), expect: { katex: true } },
  { key: 'mermaid', path: findPage(h => h.includes('class="mermaid')), expect: { diagram: true } },
  { key: 'code', path: findPage(h => h.includes('class="shiki')), expect: { shiki: true } },
  { key: 'index', path: '/index-all' },
  { key: '404', path: '/no-such-page', status404: true },
  { key: 'about', path: '/about', expect: { badges: true } },
  // 페이지와 하위 페이지 폴더가 같이 있는 주소 (serve.mjs 가 404 를 내던 경우)
  { key: 'portfolio', path: '/portfolio' },
  { key: 'life', path: '/life' },
  // 사진 기록 글 하나 (글이 없으면 건너뛴다)
  { key: 'life-post', path: (() => { const d = path.join(OUT, 'life'); const f = fs.existsSync(d) && fs.readdirSync(d).find(x => x.endsWith('.html') && x !== '_.html'); return f ? '/life/' + f.replace(/\.html$/, '') : null })() },
].filter(p => p.path)
const MOBILE = ['home', 'math', 'mermaid', 'about', 'life-post']

const server = await serve(OUT, PORT)
let failedTotal = 0

// 세 엔진을 동시에 돌린다 (차례로면 2분, 동시에면 그 절반 이하)
async function runEngine(name) {
  const L = ENGINES[name]
  if (!L) return { name, lines: [`  ? 모르는 엔진: ${name}`], failed: 0 }
  let browser
  try { browser = await L.launch({ args: name === 'chromium' ? ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] : [] }) }
  catch (e) { return { name, lines: [`  ✗ ${name} — 실행 못 함: ${e.message.split('\n')[0]}`], failed: 1 } }
  const fails = []
  const fail = (where, msg) => fails.push(`${where}: ${msg}`)
  let pages = 0

  for (const [vp, size] of [['desktop', { width: 1280, height: 860 }], ['mobile', { width: 390, height: 844 }]]) {
    const ctx = await browser.newContext({ viewport: size, isMobile: vp === 'mobile' && name !== 'firefox', hasTouch: vp === 'mobile' })
    for (const pg of PAGES) {
      if (vp === 'mobile' && !MOBILE.includes(pg.key)) continue
      const where = `${vp}/${pg.key}`
      const page = await ctx.newPage()
      const errs = []
      page.on('pageerror', e => errs.push(e.message.slice(0, 120)))
      page.on('console', m => { if (m.type() === 'error' && !(pg.status404 && /404/.test(m.text()))) errs.push(m.text().slice(0, 120)) })
      // 세 엔진을 동시에 돌리면 가끔 열기가 시간 초과된다 (주로 Firefox, 혼자 돌리면 통과). 한 번만 다시 연다
      await page.goto(B + pg.path, { waitUntil: 'domcontentloaded', timeout: 20000 })
        .catch(() => page.goto(B + pg.path, { waitUntil: 'domcontentloaded', timeout: 30000 }))
        .catch(e => errs.push('열기 실패 ' + e.message.split('\n')[0].slice(0, 80)))
      await page.waitForTimeout(pg.key === 'home' ? 4000 : 1500)
      // 도표 · 그래프는 스크립트가 그린다. 세 엔진을 동시에 돌리면 느려지므로 나타날 때까지 기다린다
      if (pg.expect?.diagram) await page.waitForSelector('.diagram-stage svg, .diagram-error', { timeout: 8000 }).catch(() => {})
      if (pg.expect?.canvas) await page.waitForSelector('canvas', { timeout: 8000 }).catch(() => {})
      const i = await page.evaluate(() => ({
        hscroll: document.documentElement.scrollWidth > innerWidth + 1,
        canvas: !!document.querySelector('canvas'),
        katex: document.querySelectorAll('.katex').length,
        diagram: document.querySelectorAll('.diagram-stage svg').length,
        diagramErr: document.querySelectorAll('.diagram-error').length,
        shiki: document.querySelectorAll('pre.shiki').length,
        badges: document.querySelectorAll('.hud-badge').length,
        font: document.fonts.check('16px "Pretendard Variable"'),
      })).catch(() => null)
      pages++
      if (!i) { fail(where, '페이지를 읽지 못함'); await page.close(); continue }
      if (errs.length) fail(where, `스크립트 오류 ${errs.length} — ${errs[0]}`)
      if (i.hscroll) fail(where, '가로 스크롤이 생김')
      if (!i.font) fail(where, '본문 글꼴(Pretendard)이 없음')
      if (pg.expect?.canvas && !i.canvas) fail(where, '3D 그래프가 그려지지 않음')
      if (pg.expect?.katex && !i.katex) fail(where, '수식이 그려지지 않음')
      if (pg.expect?.diagram && (!i.diagram || i.diagramErr)) fail(where, `도표 ${i.diagram}개 · 오류 ${i.diagramErr}`)
      if (pg.expect?.shiki && !i.shiki) fail(where, '코드 강조가 없음')
      if (pg.expect?.badges && !i.badges) fail(where, '칭호 배지가 없음')
      if (SHOTS) await page.screenshot({ path: path.join(SHOTS, `${name}-${vp}-${pg.key}.png`) }).catch(() => {})
      await page.close()
    }
    await ctx.close()
  }

  // ── 키보드 — 문서 페이지 ──
  try {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 860 } })
    ctx.setDefaultTimeout(5000)
    const p = await ctx.newPage()
    const doc = PAGES.find(x => x.key === 'math')?.path ?? '/index-all'
    await p.goto(B + doc, { waitUntil: 'domcontentloaded', timeout: 30000 }); await p.waitForTimeout(1200)
    await p.keyboard.press('Tab')
    if (!(await p.evaluate(() => document.activeElement?.classList.contains('skip-link')))) fail('keyboard', '첫 Tab 이 본문 바로가기가 아님')
    await p.evaluate(() => document.querySelector('.skip-link')?.focus()); await p.keyboard.press('Enter'); await p.waitForTimeout(150)
    if ((await p.evaluate(() => document.activeElement?.id)) !== 'main') fail('keyboard', '본문 바로가기가 main 으로 가지 않음')
    await p.keyboard.press(name === 'webkit' ? 'Meta+k' : 'Control+k'); await p.waitForTimeout(400)
    if ((await p.evaluate(() => document.activeElement?.getAttribute('role'))) !== 'combobox') fail('keyboard', '단축키로 연 검색창에 초점이 없음')
    await p.keyboard.type('데이터'); await p.waitForTimeout(900)
    for (let k = 0; k < 6; k++) {
      await p.keyboard.press('Tab')
      if (!(await p.evaluate(() => !!document.activeElement?.closest('[role=dialog]')))) { fail('keyboard', `검색창에서 Tab ${k + 1}번 만에 초점이 밖으로 샘`); break }
    }
    await p.keyboard.press('Escape'); await p.waitForTimeout(250)
    if (await p.evaluate(() => !!document.activeElement?.closest('[role=dialog][aria-modal]'))) fail('keyboard', 'Esc 로 검색창이 닫히지 않음')
    await ctx.close()
  } catch (e) { fail('keyboard', `시험 중단 — ${e.message.split('\n')[0]}`) }

  // ── 스탯창 ──
  try {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } })
    ctx.setDefaultTimeout(5000)
    const p = await ctx.newPage()
    await p.goto(B + '/about', { waitUntil: 'domcontentloaded', timeout: 30000 }); await p.waitForTimeout(1200)
    // 스탯창은 사이트 테마를 따른다 — 다크는 우주 바탕, 라이트는 밝은 바탕 (2026-10-01)
    const hudBg = () => p.evaluate(() => getComputedStyle(document.querySelector('.hud')).getPropertyValue('--hud-bg').trim())
    await p.evaluate(() => { document.documentElement.dataset.theme = 'dark' })
    if ((await hudBg()) !== '#070a12') fail('about', '다크에서 스탯창이 우주 바탕이 아님')
    await p.evaluate(() => { document.documentElement.dataset.theme = 'light' })
    if ((await hudBg()) !== '#f3f5fa') fail('about', '라이트에서 스탯창이 밝은 바탕이 아님')
    await p.evaluate(() => { document.documentElement.dataset.theme = 'dark' })
    if (!(await p.locator('button[aria-label$="테마로"]').count())) fail('about', '테마 단추가 없음 (헤더는 모든 페이지에서 같아야 한다)')
    const badge = p.locator('#titles .hud-badge').first()
    await badge.focus(); await p.keyboard.press('Enter'); await p.waitForTimeout(300)
    if (!(await p.evaluate(() => !!document.activeElement?.closest('dialog[open]')))) fail('about', '칭호 상세 창이 열리지 않거나 초점이 창 밖')
    await p.keyboard.press('Escape'); await p.waitForTimeout(250)
    if (await p.evaluate(() => !!document.querySelector('dialog[open]'))) fail('about', 'Esc 로 상세 창이 닫히지 않음')
    else if (!(await p.evaluate(() => document.activeElement?.classList.contains('hud-badge')))) fail('about', '창을 닫은 뒤 배지로 초점이 돌아오지 않음')
    // 접힌 칭호 자리는 높이 0 + inert 로 있고, 배지는 처음 펼 때 그린다 (lazy). 펼치면 inert 가 풀리고 단추가 "펼쳐짐" 이 된다
    const more = p.locator('#titles .hud-more')
    if (await more.count()) {
      const rest = p.locator('#titles .hud-collapse')
      if (!(await rest.evaluate(el => el.inert))) fail('about', '접힌 칭호가 초점을 받을 수 있음 (inert 아님)')
      // 높이 전환(0.35초)은 엔진을 동시에 돌리면 느려진다 — 고정 시간 대신 모양이 될 때까지 기다린다
      const until = fn => p.waitForFunction(fn, null, { timeout: 3000 }).then(() => true, () => false)
      await more.click()
      const opened = await until(() => { const el = document.querySelector('#titles .hud-collapse'); return !el.inert && el.getBoundingClientRect().height > 50 })
      if (!opened || (await more.getAttribute('aria-expanded')) !== 'true') fail('about', '칭호 전체 보기가 펼쳐지지 않음')
      await more.click()
      if (!(await until(() => { const el = document.querySelector('#titles .hud-collapse'); return el.inert && el.getBoundingClientRect().height < 2 }))) fail('about', '접기가 되지 않음')
    }
    if (await p.evaluate(() => [...document.querySelectorAll('.hud-badge')].some(b => b.textContent.includes('???') && /새벽|바보|우주를/.test(b.getAttribute('aria-label') ?? '')))) fail('about', '숨김 칭호 이름이 드러남')
    await ctx.close()
  } catch (e) { fail('about', `시험 중단 — ${e.message.split('\n')[0]}`) }

  await browser.close()
  const lines = fails.length
    ? [`  ✗ ${name} — ${fails.length}건`, ...fails.map(f => `      ${f}`)]
    : [`  ✓ ${name} — ${pages}쪽 · 키보드 · 스탯창 통과`]
  return { name, lines, failed: fails.length }
}

const results = await Promise.all(pick.map(runEngine))
for (const r of results) { for (const l of r.lines) console.log(l); failedTotal += r.failed }

server.close()
process.exit(failedTotal ? 1 : 0)
