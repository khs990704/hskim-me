// 회사 케이스 1차 판정 초안 생성 (D-08).
// 규칙 기반으로 초안을 만들고, 사람이 검토·수정하는 것을 전제로 한다.
import fs from 'node:fs'
import path from 'node:path'
import { ROOT } from '../config.mjs'

const rows = JSON.parse(fs.readFileSync(path.join(ROOT, 'company-digest.json'), 'utf8'))

// 암호·키·TEE 내부 동작 = 공개 시 공격 표면 정보. 가장 보수적으로.
const CRYPTO = /(cryptograph|encryption|key |keys|zeroization|storage ta|secure storage|hash verification|packag|buffer)/i
// 허브 노트: 한 줄 설명과 하위 링크만 있는 상위 문서
const HUB = /^(company projects|secuai model security platform|secuai pqc (sdk|mds)|secuai mlops pipeline|kms|mdms|mds dashboard|nsr|company mlops platform|on-device security|on-device rust|op-tee|hazard data|c onnx packaging|mds|secuai edge test api|mlops (backend|frontend))$/i

const verdict = r => {
  const t = r.title
  if (r.group === 'on-device-security' && CRYPTO.test(t)) return ['⛔', '암호 구성·키 래핑·보안 저장소 내부 동작. 공개 시 공격 표면 정보가 된다']
  if (/hash verification|model protection demo/i.test(t)) return ['⛔', '보안 검증 절차의 내부 동작']
  if (HUB.test(t)) {
    // 허브라도 위험 신호(내부 수치·경로 등)가 검출되면 자동 승인하지 않는다.
    if (Object.keys(r.signals).length) return ['🔄', '허브 노트이나 내부 수치·경로가 검출됨. 해당 부분만 제거']
    return ['✅', '한 줄 설명과 하위 링크 중심의 허브 노트. 구현 세부 없음']
  }
  if (r.group === 'on-device-security') return ['🔄', 'TEE·런타임 연동 흐름 제거 후 담당 범위만 남김']
  if (/internationalization|deployment|runtime configuration|docker/i.test(t)) return ['🔄', '기능 성격은 안전. 내부 경로·설정값만 제거']
  return ['🔄', '「구현 또는 진행 흐름」 섹션을 걷어내고 담당 범위와 사용 기술만 남김']
}

const out = []
const tally = { '✅': 0, '🔄': 0, '⛔': 0 }
for (const r of rows) {
  const [v, why] = verdict(r)
  tally[v]++
  const sig = Object.entries(r.signals).map(([k, n]) => `${k}×${n}`).join(', ') || '-'
  out.push(`| ${r.group} | ${r.title} | ${v} | ${sig} | ${why} |`)
}

const md = [
  '| 묶음 | 노트 | 판정 | 자동 검출 신호 | 사유 / 재작성 방향 |',
  '|---|---|---|---|---|',
  ...out,
].join('\n')

fs.writeFileSync(path.join(ROOT, 'company-verdict.md'), md)
console.log(`\n  1차 판정 초안: ✅ ${tally['✅']}  🔄 ${tally['🔄']}  ⛔ ${tally['⛔']}  (총 ${rows.length})\n`)
