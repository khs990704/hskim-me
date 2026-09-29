import { GROUP_COLORS } from './graph-colors'

/**
 * 능력치 · 스킬 분야별 색 — 메인 그래프의 분류 색을 그대로 빌려 사이트 전체에서 같은 분야가 같은 색이 되게 한다.
 * 그래프에 프론트 분류는 없어 사용자와 맞닿는 Product 색을, 언어는 남는 색 중 가장 구분되는 초록을 쓴다.
 * 노랑(Open Source)은 칭호의 전설 금색과 헷갈려 쓰지 않는다. 칭호 희귀도 색은 따로 둔다.
 */
export const DOMAIN_COLOR: Record<string, string> = {
  ai: GROUP_COLORS['AI and Data'],
  data: GROUP_COLORS['Mathematics and Statistics'],
  backend: GROUP_COLORS['Software Engineering'],
  infra: GROUP_COLORS['Infrastructure'],
  security: GROUP_COLORS['Security'],
  frontend: GROUP_COLORS['Product and Business'],
}
export const LANGUAGE_COLOR = GROUP_COLORS['GPU Computing']
