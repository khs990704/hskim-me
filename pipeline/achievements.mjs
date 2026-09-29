// 칭호 도감 — 업적 하나에 칭호 하나 (기획 docs/01-planning/profile-and-life.md §4.5.1)
//
// 희귀도 기준 — 들인 노력과 드문 정도
//   common    일반  시작하면 얻는 것. 첫 한 번, 하루 분량
//   rare      희귀  같은 일을 여러 번. 몇 주 분량
//   epic      영웅  몇 달 이상 꾸준히, 또는 실무 성과
//   legendary 전설  드문 큰 이정표, 또는 외부 공인 시험 합격
//
// 조건의 세 가지 모양
//   count:  M => 숫자,  target    — 진행도 막대가 생긴다
//   record: 'id'                  — Profile.md 의 records 에 그 id 가 있으면 획득 (날짜 · 설명은 거기서)
//   check:  M => true/false       — 한 번에 판정 (진행도 없음)
// count 가 null 을 돌려주면 "아직 판정할 수 없음" (예: 날짜 출처가 없을 때)
// when: M => 'YYYY-MM(-DD)'      — 얻은 날짜를 알 수 있으면 돌려준다
//
// 새 업적은 이 표에 한 줄. id 는 한번 정하면 바꾸지 않는다 (장착 칭호가 id 가 아니라 이름을 쓰지만,
// 나중에 얻은 날짜 기록 등에 쓸 수 있게).

const nth = (dates, n) => (dates.length >= n ? [...dates].sort()[n - 1] : null)
const courseTheme = re => M => M.courses.filter(c => re.test(c.name + ' ' + (c.nameAlt ?? '')))

export const RARITY = {
  common: '일반',
  rare: '희귀',
  epic: '영웅',
  legendary: '전설',
}

export const GROUPS = {
  record: '기록',
  link: '연결',
  explore: '탐험',
  quest: '퀘스트',
  skill: '스킬',
  cert: '자격',
  career: '경력',
  streak: '꾸준함',
  life: '생활',
  site: '사이트',
  hidden: '???',        // 숨김 계열 — 이름부터 비밀스럽게
}

const cuda = courseTheme(/CUDA/i)
const usd = courseTheme(/OpenUSD/i)
const neural = courseTheme(/Deep Learning|딥러닝|트랜스포머|Transformer/i)
const threat = courseTheme(/Cybersecurity|Anomaly/i)
const orbit = courseTheme(/Satellite/i)
const edge = courseTheme(/Jetson/i)
const dsAccel = courseTheme(/Data Science/i)

export const ACHIEVEMENTS = [
  // ── 기록 — 공개 문서 수 ──
  { id: 'docs-1', group: 'record', title: '첫 발자국', cond: '공개 문서 1개', rarity: 'common', count: M => M.docs, target: 1 },
  { id: 'docs-100', group: 'record', title: '꾸준한 기록자', cond: '공개 문서 100개', rarity: 'rare', count: M => M.docs, target: 100 },
  { id: 'docs-500', group: 'record', title: '별을 잇는 자', cond: '공개 문서 500개', rarity: 'epic', count: M => M.docs, target: 500 },
  { id: 'docs-1000', group: 'record', title: '은하 제작자', cond: '공개 문서 1,000개', rarity: 'legendary', count: M => M.docs, target: 1000 },
  { id: 'docs-2000', group: 'record', title: '우주의 사서', cond: '공개 문서 2,000개', rarity: 'legendary', count: M => M.docs, target: 2000 },

  // ── 연결 — 문서 사이 링크 ──
  { id: 'links-1000', group: 'link', title: '실을 잇는 자', cond: '문서 사이 링크 1,000개', rarity: 'rare', count: M => M.links, target: 1000 },
  { id: 'links-3000', group: 'link', title: '그물을 짜는 자', cond: '문서 사이 링크 3,000개', rarity: 'epic', count: M => M.links, target: 3000 },
  { id: 'links-10000', group: 'link', title: '성간 항로 설계자', cond: '문서 사이 링크 10,000개', rarity: 'legendary', count: M => M.links, target: 10000 },

  // ── 탐험 — 지식 분야 ──
  { id: 'explore-all', group: 'explore', title: '성계 탐험가', cond: '지식 분야 모두에 노트', rarity: 'epic', count: M => M.domains.filter(d => d.notes > 0).length, target: M => M.domains.length },
  { id: 'explore-100x1', group: 'explore', title: '한 우물의 탐구자', cond: '한 분야 노트 100개', rarity: 'epic', count: M => M.domains.filter(d => d.notes >= 100).length, target: 1 },
  { id: 'explore-100x2', group: 'explore', title: '쌍성의 탐구자', cond: '두 분야 노트 100개씩', rarity: 'epic', count: M => M.domains.filter(d => d.notes >= 100).length, target: 2 },
  { id: 'explore-100x3', group: 'explore', title: '삼중성계의 현자', cond: '세 분야 노트 100개씩', rarity: 'legendary', count: M => M.domains.filter(d => d.notes >= 100).length, target: 3 },
  { id: 'explore-security', group: 'explore', title: '방벽의 학자', cond: '보안 노트 50개', rarity: 'rare', count: M => M.domain('Security'), target: 50 },
  { id: 'explore-math', group: 'explore', title: '수식의 항해사', cond: '수학·통계 노트 50개', rarity: 'rare', count: M => M.domain('Mathematics and Statistics'), target: 50 },
  { id: 'explore-gpu', group: 'explore', title: '코어의 조율사', cond: 'GPU 컴퓨팅 노트 30개', rarity: 'rare', count: M => M.domain('GPU Computing'), target: 30 },
  { id: 'explore-product', group: 'explore', title: '시장을 읽는 자', cond: '제품·비즈니스 노트 30개', rarity: 'rare', count: M => M.domain('Product and Business'), target: 30 },

  // ── 퀘스트 — 프로젝트 ──
  { id: 'quest-1', group: 'quest', title: '모험의 시작', cond: '프로젝트 1개', rarity: 'common', count: M => M.projects.length, target: 1 },
  { id: 'quest-10', group: 'quest', title: '퀘스트 수집가', cond: '프로젝트 10개', rarity: 'rare', count: M => M.projects.length, target: 10 },
  { id: 'quest-30', group: 'quest', title: '퀘스트 마스터', cond: '프로젝트 30개', rarity: 'epic', count: M => M.projects.length, target: 30 },
  { id: 'quest-50', group: 'quest', title: '전설의 모험담', cond: '프로젝트 50개', rarity: 'legendary', count: M => M.projects.length, target: 50 },
  { id: 'quest-company-5', group: 'quest', title: '현장의 개발자', cond: '회사 프로젝트 5개', rarity: 'epic', count: M => M.projectsIn('Company'), target: 5 },
  { id: 'quest-personal-5', group: 'quest', title: '독립 개척자', cond: '개인 프로젝트 5개', rarity: 'rare', count: M => M.projectsIn('Personal'), target: 5 },
  { id: 'quest-team-2', group: 'quest', title: '파티원', cond: '팀 프로젝트 2개', rarity: 'rare', count: M => M.projectsIn('Team'), target: 2 },
  { id: 'quest-team-5', group: 'quest', title: '파티의 중심', cond: '팀 프로젝트 5개', rarity: 'epic', count: M => M.projectsIn('Team'), target: 5 },
  { id: 'quest-training', group: 'quest', title: '수련관 졸업생', cond: '교육 과정 수료', rarity: 'rare', check: M => M.profile.training.some(t => t.to), when: M => M.profile.training.filter(t => t.to).map(t => t.to).sort()[0] },
  { id: 'quest-degree', group: 'quest', title: '학사 모험가', cond: '학위 취득', rarity: 'epic', check: M => M.profile.education.some(e => /졸업/.test(e.note)), when: M => M.profile.education.find(e => /졸업/.test(e.note))?.to },
  { id: 'quest-portfolio-10', group: 'quest', title: '이야기꾼', cond: '포트폴리오 10편', rarity: 'rare', count: M => M.portfolio, target: 10 },
  { id: 'quest-portfolio-25', group: 'quest', title: '서사시 작가', cond: '포트폴리오 25편', rarity: 'epic', count: M => M.portfolio, target: 25 },
  { id: 'quest-package', group: 'quest', title: '나누는 자', cond: '공개 패키지 배포', rarity: 'rare', record: 'package' },
  { id: 'quest-oss', group: 'quest', title: '오픈소스 동료', cond: '외부 오픈소스에 기여', rarity: 'epic', record: 'oss-contribution' },

  // ── 스킬 — 기술 스택 ──
  { id: 'skill-lang-3', group: 'skill', title: '다국어 구사자', cond: '프로그래밍 언어 3개', rarity: 'rare', count: M => M.languages.length, target: 3 },
  { id: 'skill-lang-5', group: 'skill', title: '바벨의 통역사', cond: '프로그래밍 언어 5개', rarity: 'epic', count: M => M.languages.length, target: 5 },
  { id: 'skill-lang-7', group: 'skill', title: '만국의 언어술사', cond: '프로그래밍 언어 7개', rarity: 'legendary', count: M => M.languages.length, target: 7 },
  { id: 'skill-tools-30', group: 'skill', title: '도구 수집가', cond: '기술 30종', rarity: 'rare', count: M => M.tools.length, target: 30 },
  { id: 'skill-tools-100', group: 'skill', title: '기술 백과', cond: '기술 100종', rarity: 'epic', count: M => M.tools.length, target: 100 },
  { id: 'skill-all-stats', group: 'skill', title: '만능 모험가', cond: '능력치 6개 모두 1 이상', rarity: 'epic', count: M => M.stats.filter(s => s.value > 0).length, target: M => M.stats.length },
  { id: 'skill-stat-10', group: 'skill', title: '한 길의 달인', cond: '한 능력치 프로젝트 10개', rarity: 'epic', count: M => Math.max(0, ...M.stats.map(s => s.value)), target: 10 },

  // ── 자격 ──
  { id: 'cert-license-1', group: 'cert', title: '공인 엔지니어', cond: '국가기술자격 1개', rarity: 'legendary', count: M => M.licenses.length, target: 1, when: M => nth(M.licenses.map(c => c.date), 1) },
  { id: 'cert-license-2', group: 'cert', title: '쌍검의 엔지니어', cond: '국가기술자격 2개', rarity: 'legendary', count: M => M.licenses.length, target: 2, when: M => nth(M.licenses.map(c => c.date), 2) },
  { id: 'cert-course-1', group: 'cert', title: '배움의 첫 장', cond: '수료 1개', rarity: 'common', count: M => M.courses.length, target: 1, when: M => nth(M.courses.map(c => c.date), 1) },
  { id: 'cert-course-5', group: 'cert', title: '부지런한 학도', cond: '수료 5개', rarity: 'rare', count: M => M.courses.length, target: 5, when: M => nth(M.courses.map(c => c.date), 5) },
  { id: 'cert-course-10', group: 'cert', title: '가속의 학도', cond: '수료 10개', rarity: 'epic', count: M => M.courses.length, target: 10, when: M => nth(M.courses.map(c => c.date), 10) },
  { id: 'cert-course-20', group: 'cert', title: '지식의 대현자', cond: '수료 20개', rarity: 'legendary', count: M => M.courses.length, target: 20, when: M => nth(M.courses.map(c => c.date), 20) },
  { id: 'cert-year-5', group: 'cert', title: '몰입의 해', cond: '한 해에 수료 5개', rarity: 'rare', count: M => M.coursesBestYear.count, target: 5, when: M => M.coursesBestYear.fifth },
  { id: 'cert-cuda', group: 'cert', title: '병렬의 수련자', cond: 'CUDA 과정 3개', rarity: 'epic', count: M => cuda(M).length, target: 3, when: M => nth(cuda(M).map(c => c.date), 3) },
  { id: 'cert-usd', group: 'cert', title: '세계를 짓는 자', cond: 'OpenUSD 과정 4개', rarity: 'epic', count: M => usd(M).length, target: 4, when: M => nth(usd(M).map(c => c.date), 4) },
  { id: 'cert-neural', group: 'cert', title: '신경망 탐구자', cond: '딥러닝·트랜스포머 과정 2개', rarity: 'rare', count: M => neural(M).length, target: 2, when: M => nth(neural(M).map(c => c.date), 2) },
  { id: 'cert-threat', group: 'cert', title: '위협 사냥꾼', cond: '사이버보안·이상 탐지 과정 2개', rarity: 'rare', count: M => threat(M).length, target: 2, when: M => nth(threat(M).map(c => c.date), 2) },
  { id: 'cert-orbit', group: 'cert', title: '궤도의 관측자', cond: '위성 영상 과정', rarity: 'common', count: M => orbit(M).length, target: 1, when: M => nth(orbit(M).map(c => c.date), 1) },
  { id: 'cert-edge', group: 'cert', title: '엣지의 개척자', cond: 'Jetson 과정', rarity: 'common', count: M => edge(M).length, target: 1, when: M => nth(edge(M).map(c => c.date), 1) },
  { id: 'cert-ds', group: 'cert', title: '데이터 가속자', cond: '데이터 사이언스 가속 과정', rarity: 'common', count: M => dsAccel(M).length, target: 1, when: M => nth(dsAccel(M).map(c => c.date), 1) },
  // 과정 수료증이 아니라 자격증(kind: license)만. Profile.md certs 의 field 로 분야를 적는다
  { id: 'cert-cloud', group: 'cert', title: '구름 위의 설계자', cond: '클라우드 자격증 1개', rarity: 'epic', count: M => M.licensesIn('cloud').length, target: 1, when: M => nth(M.licensesIn('cloud').map(c => c.date), 1) },
  { id: 'cert-security', group: 'cert', title: '성벽의 수호자', cond: '보안 자격증 1개', rarity: 'epic', count: M => M.licensesIn('security').length, target: 1, when: M => nth(M.licensesIn('security').map(c => c.date), 1) },

  // ── 경력 ──
  { id: 'career-12', group: 'career', title: '1년 차 모험가', cond: '경력 12개월', rarity: 'rare', count: M => M.careerMonths, target: 12 },
  { id: 'career-36', group: 'career', title: '노련한 모험가', cond: '경력 36개월', rarity: 'epic', count: M => M.careerMonths, target: 36 },
  { id: 'career-60', group: 'career', title: '베테랑', cond: '경력 60개월', rarity: 'legendary', count: M => M.careerMonths, target: 60 },
  { id: 'career-research', group: 'career', title: '연구소의 동료', cond: '연구과제 참여', rarity: 'epic', record: 'research' },
  { id: 'career-gov', group: 'career', title: '국가사업 수행자', cond: '정부 발주 사업 수행', rarity: 'rare', record: 'gov-project' },

  // ── 꾸준함 — Vault 커밋 날짜 (대량 가져오기 커밋은 뺀다) ──
  { id: 'streak-7', group: 'streak', title: '불씨', cond: '7일 연속 기록', rarity: 'rare', count: M => M.dates && M.dates.longestStreak, target: 7 },
  { id: 'streak-30', group: 'streak', title: '꺼지지 않는 불꽃', cond: '30일 연속 기록', rarity: 'epic', count: M => M.dates && M.dates.longestStreak, target: 30 },
  { id: 'streak-month-30', group: 'streak', title: '폭주 기관차', cond: '한 달에 문서 30개', rarity: 'epic', count: M => M.dates && M.dates.bestMonth, target: 30 },
  { id: 'streak-12-months', group: 'streak', title: '사계절의 기록자', cond: '12개월 연속 매달 기록', rarity: 'legendary', count: M => M.dates && M.dates.longestMonthRun, target: 12 },

  // ── 생활 — 사진 기록 (/life) ──
  { id: 'life-1', group: 'life', title: '셔터를 누른 자', cond: '첫 사진 기록', rarity: 'common', count: M => M.life.total, target: 1 },
  { id: 'life-all', group: 'life', title: '균형 잡힌 삶', cond: '6개 분류에 1편씩', rarity: 'rare', count: M => M.life.categories, target: 6 },
  { id: 'life-travel-5', group: 'life', title: '방랑자', cond: '여행 5편', rarity: 'rare', count: M => M.life.by('여행'), target: 5 },
  { id: 'life-travel-20', group: 'life', title: '세계 여행자', cond: '여행 20편', rarity: 'epic', count: M => M.life.by('여행'), target: 20 },
  { id: 'life-map-10', group: 'life', title: '지도를 채우는 자', cond: '지도에 지역 10곳', rarity: 'epic', count: M => M.life.places, target: 10 },
  { id: 'life-food-20', group: 'life', title: '미식 탐험가', cond: '음식 20편', rarity: 'rare', count: M => M.life.by('음식'), target: 20 },
  { id: 'life-cafe-10', group: 'life', title: '카페 순례자', cond: '카페 10편', rarity: 'rare', count: M => M.life.by('카페'), target: 10 },
  { id: 'life-exhibit-5', group: 'life', title: '전시 탐방자', cond: '전시 5편', rarity: 'rare', count: M => M.life.by('전시'), target: 5 },
  { id: 'life-workout-30', group: 'life', title: '단련하는 자', cond: '운동 30편', rarity: 'epic', count: M => M.life.by('운동'), target: 30 },

  // ── 사이트 ──
  { id: 'site-launch', group: 'site', title: '행성 개척자', cond: 'hskim.me 공개', rarity: 'epic', record: 'site-launch' },
  { id: 'site-a11y', group: 'site', title: '모두를 위한 설계자', cond: '웹 접근성 자체 점검', rarity: 'rare', record: 'a11y-audit' },
  { id: 'site-headers', group: 'site', title: '방화벽 건축가', cond: '보안 헤더 A 등급', rarity: 'rare', record: 'security-headers' },
  { id: 'site-indexed', group: 'site', title: '지도에 오른 별', cond: '검색 엔진 색인', rarity: 'rare', record: 'search-indexed' },

  // ── 숨김 — 방문자에게는 얻기 전까지 조건이 ??? ──
  { id: 'hidden-dawn', group: 'hidden', hidden: true, title: '새벽의 기록자', cond: '새벽 3~5시에 기록', rarity: 'rare', count: M => M.dates && M.dates.dawn, target: 1 },
  { id: 'hidden-april', group: 'hidden', hidden: true, title: '바보의 날', cond: '4월 1일에 기록', rarity: 'common', count: M => M.dates && M.dates.aprilFools, target: 1 },
  { id: 'hidden-cosmos', group: 'hidden', hidden: true, title: '우주를 품은 자', cond: "제목에 '우주' 가 든 문서", rarity: 'common', count: M => M.titles.filter(t => t.includes('우주')).length, target: 1 },
]

/** Profile.md 의 records 에 쓸 수 있는 id 와 뜻 */
/** Profile.md certs 의 field 에 쓸 수 있는 분야 */
export const CERT_FIELDS = {
  cloud: '클라우드',
  security: '보안',
  ai: 'AI',
  data: '데이터',
  infra: '인프라',
  dev: '개발',
}

export const RECORD_IDS = Object.fromEntries(
  ACHIEVEMENTS.filter(a => a.record).map(a => [a.record, a.cond]),
)
