// 파이프라인 설정. 경로와 공개 규칙의 단일 출처.
import path from 'node:path'
import { fileURLToPath } from 'node:url'

export const ROOT = path.dirname(fileURLToPath(import.meta.url))

// Obsidian Vault 원본. 이 경로는 읽기 전용으로만 접근한다. (D-03, 원본 무수정 원칙)
//
// 로컬(WSL)에서는 Windows 의 Vault 를 직접 읽고,
// CI 에서는 private 저장소로 체크아웃된 사본을 읽는다. VAULT_PATH 로 넘긴다.
export const VAULT = process.env.VAULT_PATH ?? '/mnt/c/Users/user/Documents/Obsidian Vault'

// 필터를 통과한 마크다운이 복사되는 중간 디렉터리. 매 빌드마다 새로 만든다.
export const STAGE = path.join(ROOT, '.vault-cache')

// 공개 대상 (D-01). 폴더 또는 단일 파일.
export const WHITELIST = [
  '01 Knowledge DB',
  '02 Project Cases',
  '03 Portfolio/Portfolio.md',
  '03 Portfolio/Profile.md',
  '06 Life',
]

// 프로필 (기획 profile-and-life.md). 일반 문서가 아니라 /about 스탯창의 데이터다.
// 공개 규칙 · 콘텐츠 가드는 다른 문서와 똑같이 거치고, 그래프 · 검색 · 트리에는 넣지 않는다.
export const PROFILE = '03 Portfolio/Profile.md'

// 사진 기록 (기획 profile-and-life.md §6). 글 한 편 = 노트 하나. /life 의 데이터라 일반 문서로 만들지 않는다 —
// 그래프 · 검색 · 트리 · 경험치에 넣지 않는다. 공개 규칙(publish: false) · 콘텐츠 가드는 똑같이 거친다.
export const LIFE = '06 Life'

// 옵트인 폴더 (D-08). 이 아래는 frontmatter에 publish: true 가 있어야만 통과한다.
export const OPT_IN = [
  '02 Project Cases/Project Index/03 Company',
]

/**
 * OPT_IN 아래에서 공개를 승인한 경로 (D-16).
 *
 * 회사 노트는 Vault 에서 공개 기준('Project 케이스 지식화 규칙 > 회사 실무 케이스
 * 공개 기준')에 맞게 쓰여 있다. 기준을 놓친 표현은 Vault 의 04 Operations/guard-rules-company.txt 가
 * 배포 전에 잡는다. 여기 없는 경로는 그대로 비공개다.
 */
export const OPT_IN_APPROVED = [
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

/**
 * 본문이 표뿐이라 첫 문단을 뽑을 수 없는 페이지의 설명.
 *
 * /portfolio 는 '프로젝트 한눈에 보기' 표 하나로만 이루어져 있다.
 * 검색 결과와 링크 미리보기에 그대로 나가는 글이라 비워 둘 수 없다.
 */
export const ROUTE_DESCRIPTIONS = {
  portfolio: '개인·팀 프로젝트와 데이터 분석·모델링 프로젝트를 한눈에 모아 둔 목록입니다.',
}
