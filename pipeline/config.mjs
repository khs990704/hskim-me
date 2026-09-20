// 파이프라인 설정. 경로와 공개 규칙의 단일 출처.
import path from 'node:path'
import { fileURLToPath } from 'node:url'

export const ROOT = path.dirname(fileURLToPath(import.meta.url))

// Obsidian Vault 원본. 이 경로는 읽기 전용으로만 접근한다. (D-03, 원본 무수정 원칙)
export const VAULT = '/mnt/c/Users/user/Documents/Obsidian Vault'

// 필터를 통과한 마크다운이 복사되는 중간 디렉터리. 매 빌드마다 새로 만든다.
export const STAGE = path.join(ROOT, '.vault-cache')

// 공개 대상 (D-01). 폴더 또는 단일 파일.
export const WHITELIST = [
  '01 Knowledge DB',
  '02 Project Cases',
  '03 Portfolio/Portfolio.md',
]

// 옵트인 폴더 (D-08). 이 아래는 frontmatter에 publish: true 가 있어야만 통과한다.
export const OPT_IN = [
  '02 Project Cases/Project Index/03 Company',
]

// URL 에서 걷어낼 컨테이너 성격의 폴더명 (번호 접두사 제거 후 기준).
export const DROP_SEGMENTS = ['project index']

// 라우팅 매핑. 스테이지 경로의 접두사 -> 사이트 URL 접두사.
export const ROUTES = [
  { prefix: '01 Knowledge DB', route: 'notes', kind: 'note' },
  { prefix: '02 Project Cases', route: 'projects', kind: 'project' },
  { prefix: '03 Portfolio', route: 'portfolio', kind: 'portfolio' },
]
