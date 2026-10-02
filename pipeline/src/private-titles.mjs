// 비공개로 남은 회사 케이스의 제목 — verify-leak(공개 산출물) · chunks(Nero 색인)가 함께 쓴다.
import fs from 'node:fs'
import path from 'node:path'
import { VAULT, STAGE, OPT_IN } from '../config.mjs'

// 공개 기술 이름과 겹치는 케이스 제목은 검사에서 뺀다.
// 예) 회사 케이스 노트 이름이 'OP-TEE' 인데, OP-TEE 는 공개 오픈소스 프로젝트다.
// 지식 노트가 그 기술을 일반적으로 설명하는 것은 공개해도 무방하다.
const PUBLIC_TECH_NAMES = new Set(['OP-TEE'])

// 비공개 케이스 제목은 Vault 에서 직접 읽는다.
// 중간 산출물(company-digest.json)에 의존하면 CI 에서 파일이 없어 실패한다.
// 비공개로 남은 회사 케이스의 제목을 모은다.
//
// 스테이지에 들어가지 못한 노트가 비공개다. 공개를 승인한 노트(D-16)는 제목이
// 사이트에 나와야 정상이므로 검사에서 뺀다. 이렇게 하면 공개 범위를 바꿀 때
// 이 파일을 따로 고칠 필요가 없다.
function collectPrivateTitles(dir, rel, out = []) {
  if (!fs.existsSync(dir)) return out
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name)
    const r = `${rel}/${e.name}`
    if (e.isDirectory()) collectPrivateTitles(p, r, out)
    else if (e.name.endsWith('.md') && !fs.existsSync(path.join(STAGE, r))) {
      const h1 = fs.readFileSync(p, 'utf8').split('\n').find(l => l.startsWith('# '))
      out.push(h1 ? h1.slice(2).trim() : path.basename(e.name, '.md'))
    }
  }
  return out
}

export const privateTitles = () => [...new Set(OPT_IN.flatMap(rel => collectPrivateTitles(path.join(VAULT, rel), rel)))]
  .filter(t => t.length >= 6 && !PUBLIC_TECH_NAMES.has(t))
  .sort((a, b) => b.length - a.length)

