/**
 * 분류별 색. 기획 §7 의 팔레트를 따른다.
 * 본문 타이포그래피(h2 시안 / h3 보라)와 같은 계열이라 인상이 이어진다.
 */
export const GROUP_COLORS: Record<string, string> = {
  'AI and Data': '#22D3EE',
  'Software Engineering': '#A78BFA',
  'Infrastructure': '#FB923C',
  'GPU Computing': '#4ADE80',
  'Security': '#F87171',
  'Mathematics and Statistics': '#60A5FA',
  'Product and Business': '#F472B6',
  'Open Source': '#FBBF24',
}

/** 프로젝트 케이스·포트폴리오는 지식 노트와 성격이 달라 흰색 계열로 구분한다 */
const PROJECT_COLOR = '#E8EDF5'
const FALLBACK = '#8B95A7'

export function colorOf(group: string, kind: string): string {
  if (kind !== 'note') return PROJECT_COLOR
  const second = group.split('/')[1]?.replace(/\.md$/, '') ?? ''
  return GROUP_COLORS[second] ?? FALLBACK
}

/** 범례에 쓸 목록 */
export const LEGEND = [
  ...Object.entries(GROUP_COLORS).map(([label, color]) => ({ label, color })),
  { label: '프로젝트·포트폴리오', color: PROJECT_COLOR },
]
