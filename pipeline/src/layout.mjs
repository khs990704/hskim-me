// 3D 그래프 초기 좌표 사전 계산.
//
// 브라우저에서 477개 노드의 force 시뮬레이션을 처음부터 돌리면 첫 몇 초가
// 노드들이 튀어나오며 자리를 잡는 시간이 된다. 좌표를 빌드 시점에 계산해 두면
//  - 첫 프레임부터 완성된 형태로 보이고
//  - 새로고침해도 배치가 같아서 사용자가 위치로 노드를 기억할 수 있다.
//
// 빌드 간 재현성을 위해 시뮬레이션 동안 난수를 시드 고정한다.
// (시드를 고정하지 않으면 노트 하나만 추가해도 전체 배치가 뒤바뀐다)
import fs from 'node:fs'
import path from 'node:path'
import { forceSimulation, forceLink, forceManyBody, forceCenter } from 'd3-force-3d'
import { ROOT } from '../config.mjs'

const GRAPH = path.join(ROOT, 'out', 'graph.json')
const TICKS = 400

// mulberry32 — 작고 결정적인 PRNG
function seeded(seed) {
  return function () {
    seed |= 0; seed = (seed + 0x6D2B79F5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const graph = JSON.parse(fs.readFileSync(GRAPH, 'utf8'))

// 허브(MOC)는 분류 안의 거의 모든 문서를 가리킨다.
// 이 링크를 그대로 두면 모든 점이 허브로 끌려가 주제 군집이 뭉개진다.
//
// 그렇다고 완전히 빼면 허브로만 이어져 있던 분류가 본체에서 떨어져 나간다.
// 실제로 Open Source(gstack)는 외부 링크가 0개, Mathematics 는 6%뿐이라
// 제거하자마자 반발력에 밀려 멀찍이 날아갔다.
//
// 그래서 '약한 긴 끈'으로 남긴다. 주제 링크가 배치를 지배하되,
// 고립된 분류가 본체에서 이탈하지는 않게 한다.
const nodes = graph.nodes.map(n => ({ ...n }))
const realLinks = graph.links.filter(l => !l.hub).map(l => ({ ...l }))
const hubLinks = graph.links.filter(l => l.hub).map(l => ({ ...l }))

const realRandom = Math.random
Math.random = seeded(20260920)

const sim = forceSimulation(nodes, 3)
  .force('link', forceLink(realLinks).id(d => d.id).distance(28).strength(0.6))
  .force('hub', forceLink(hubLinks).id(d => d.id).distance(110).strength(0.1))
  // 반발 범위를 좁힌다. 600 이면 멀리 있는 군집끼리도 계속 밀어내
  // 외부 링크가 없는 작은 분류(Open Source 등)가 화면 밖으로 밀려난다.
  .force('charge', forceManyBody().strength(-140).distanceMax(300))
  .force('center', forceCenter(0, 0, 0))
  .stop()

for (let i = 0; i < TICKS; i++) sim.tick()
Math.random = realRandom

// 좌표를 보기 좋은 범위로 정규화 (최대 반경 500)
const maxR = Math.max(...nodes.map(n => Math.hypot(n.x, n.y, n.z)))
const scale = maxR > 0 ? 500 / maxR : 1
const round = v => Math.round(v * 100) / 100

const posById = new Map(nodes.map(n => [n.id, [round(n.x * scale), round(n.y * scale), round(n.z * scale)]]))

graph.nodes = graph.nodes.map(n => ({ ...n, pos: posById.get(n.id) }))
graph.layout = {
  algorithm: 'd3-force-3d', ticks: TICKS, seed: 20260920, radius: 500,
  hubLinkStrength: 0.1, chargeDistanceMax: 300,
}

fs.writeFileSync(GRAPH, JSON.stringify(graph))  // 브라우저가 첫 화면에서 받는 파일이라 압축 저장

// 배치 품질 점검: 너무 가까이 붙은 쌍이 있으면 화면에서 겹쳐 보인다
let minDist = Infinity
const sample = graph.nodes.slice(0, 200)
for (let i = 0; i < sample.length; i++) {
  for (let j = i + 1; j < sample.length; j++) {
    const [a, b] = [sample[i].pos, sample[j].pos]
    const d = Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2])
    if (d < minDist) minDist = d
  }
}
const size = (fs.statSync(GRAPH).size / 1024).toFixed(0)

console.log(`\n  좌표 계산 완료 — 노드 ${graph.nodes.length} · 엣지 ${graph.links.length} · ${TICKS} tick`)
console.log(`  주제 링크 ${realLinks.length} (strength 0.6) · 허브 링크 ${hubLinks.length} (strength 0.035)`)
console.log(`  반경 500 정규화 · 표본 최소 간격 ${minDist.toFixed(1)}`)
console.log(`  graph.json ${size}KB\n`)
