# P1 콘텐츠 파이프라인 PoC — 결과 보고

| | |
|---|---|
| 단계 | P1 |
| 일자 | 2026-09-20 |
| 상태 | **완료 · 고객 검수 대기** |
| 코드 | [`pipeline/`](../../pipeline/) |

---

## 1. 결론

**Obsidian 마크다운은 손실 없이 JSON으로 변환된다.** 477개 문서 전부 성공했고 실패는 0건이다. 위키링크·수식·표·코드블록이 모두 살아 있으며, 백링크와 그래프 데이터가 정상 산출된다.

가장 큰 수확은 **Vault 자체에 깨진 링크가 하나도 없다는 것**이다. 링크 3,445개 중 해석 실패 205개는 전부 "우리가 공개하지 않기로 한 문서를 가리키는 링크"이고, 존재하지 않는 문서를 가리키는 링크는 0건이다.

---

## 2. 변환 통계

```
  문서 477개 → 성공 477 / 실패 0
  링크 3445개 → 엣지 3395개
    해석 실패 205 · 중복 이름 0
  노드 477개 · 고립 0개 · URL 충돌 0건
  표 460 · 코드 123 · 수식 674 · 콜아웃 0 · 이미지 0
  H1 없음 0 · 요약 없음 0 · 요약 잘림 24
```

### 공개 필터 결과 (D-01 / D-06 / D-08)

| | 수 |
|---|---|
| Vault 화이트리스트 스캔 | 553 |
| 공개 통과 | **477** |
| 제외 — 회사 케이스 옵트인 미표기 | 76 |
| 제외 — `publish: false` / `_` 접두사 / 제외 목록 | 0 |

### 깨진 링크 205개의 정체

| 분류 | 수 | 처리 |
|---|---|---|
| 회사 케이스 제외로 인한 것 | 200 | 정책 결과. D-08 판정 후 상당수 복구 예정 |
| 비공개 폴더(`04 Operations`) 참조 | 5 | 정책 결과. 대상 2종 |
| **Vault에 없는 대상** | **0** | — |

### 그래프 구조

연결 상위 노드가 전부 MOC 문서다. 기획에서 "MOC가 허브 뉴런이 된다"고 가정한 것이 실제 데이터로 확인됐다.

| 노트 | 연결 수 |
|---|---|
| Software Engineering MOC | 121 |
| AI and Data MOC | 113 |
| Project Index | 107 |
| Backend | 82 |
| Databases | 71 |

고립 노드 0개 — 모든 문서가 최소 한 개의 연결을 가진다. 3D 그래프에서 떠다니는 외톨이 점이 생기지 않는다.

---

## 3. 아키텍처 변경 — Quartz를 포크하지 않아도 된다

**Quartz v5에서 플러그인이 전부 `@quartz-community/*` npm 패키지로 분리됐다.** 저장소를 클론·포크하지 않고 필요한 변환기만 설치해 쓸 수 있다.

| | 기획 시점 (D-02) | 실제 |
|---|---|---|
| Quartz 취급 | 저장소를 vendor로 두고 커스텀 emitter 추가 | **npm 의존성 4개**만 설치 |
| 설치 규모 | Quartz 전체 (sharp, esbuild, preact 등) | 74패키지 / 8초 |
| 업스트림 추적 | 포크 머지 | `npm update` |

D-02가 의도한 "Quartz는 파서, 화면은 우리 것"이 더 깨끗하게 성립한다. **결정 변경이 아니라 구현이 가벼워진 것**이므로 D-02는 그대로 둔다.

실제 구성:

```
Obsidian 고유 문법  → @quartz-community/obsidian-flavored-markdown
                      (위키링크, 임베드, 콜아웃, 하이라이트, 태그, 블록참조)
내부 링크 정규화    → @quartz-community/crawl-links
슬러그 규칙         → @quartz-community/utils
표준 마크다운·수식   → remark-gfm / remark-math / rehype-katex
```

LaTeX는 Quartz 플러그인 대신 KaTeX를 직접 썼다. Quartz 쪽은 Typst 렌더러까지 끌어와 무겁고, 기획에서 정한 것도 KaTeX다.

---

## 4. 해결한 난제

P1에서 검증하기로 했던 항목들이다.

### 4-1. 위키링크 2종 혼용 ✅

`[[React]]`(짧은 형태)와 `[[02 Project Cases/.../Personal Projects]]`(전체 경로)가 섞여 있다. Quartz는 링크를 슬러그로 정규화해 주지만 짧은 형태를 전체 경로로 확장하지는 않는다. 슬러그 공간을 아는 쪽에서 해석해야 해서 [`src/resolve.mjs`](../../pipeline/src/resolve.mjs)를 만들었다. 정확 일치 → 파일명 일치 → 중복 시 모호 표시 순으로 해석한다.

### 4-2. Obsidian 폴더 노트 관례 ✅

`Studiary/Studiary.md`, `aikey-today/aikey-today.md`처럼 폴더와 같은 이름의 노트가 있다. Quartz는 이를 `.../studiary/index`로 바꾸는데, 위키링크는 `[[Studiary]]`로 참조한다. 이 불일치로 깨진 링크가 61개 발생하고 있었다. 해석기에서 부모 폴더명으로도 찾도록 보정했다. **이건 미리 알 수 없었던 문제로, P1을 먼저 친 이유가 바로 이런 것이다.**

### 4-3. 한글·특수문자 파일명 ✅

한글은 그대로 유지하고 소문자·하이픈 정규화만 한다(D-09). `&`는 URL에서 제거한다.

| 원본 | 공개 URL |
|---|---|
| `01 Knowledge DB/02 Software Engineering/02 Frontend/React.md` | `/notes/software-engineering/frontend/react` |
| `.../Idea Mining & Specification Validation Harness.md` | `/projects/team/idea-mining-specification-validation-harness` |
| `03 Portfolio/Portfolio.md` | `/portfolio` |

URL 충돌 0건이다.

### 4-4. 슬러그 2계층 설계 ✅

링크 해석과 URL은 요구가 다르다. 전자는 Quartz 규칙을 그대로 따라야 정확하고, 후자는 사람이 읽고 검색 엔진이 색인한다. 둘을 분리했다.

| | 예 | 용도 |
|---|---|---|
| internal slug | `01-knowledge-db/02-software-engineering/02-frontend/react` | 위키링크 해석 전용 |
| public route | `notes/software-engineering/frontend/react` | 사이트 URL. 번호 접두사와 컨테이너 폴더 제거 |

본문 HTML의 `<a href>`도 공개 URL로 치환한다. 프론트엔드는 내부 슬러그를 몰라도 된다.

### 4-5. frontmatter 없는 노트의 제목·요약 ✅

H1 누락 0건, 요약 추출 실패 0건. Vault 노트가 "제목 다음 줄에 정의문"으로 일관되게 쓰여 있어 첫 문단이 그대로 검색 결과용 요약이 된다.

실제 추출 예:

> **Structured Logging** — Structured Logging은 로그를 자유 문장만으로 남기지 않고, 정해진 field를 가진 record로 남기는 방식이다. JSON, JSONL, key-value log가 대표적인 형태다.
>
> **Dynamic SQL** — 동적 SQL은 실행할 SQL 문이 프로그램 작성 시점이 아니라 실행 시점에 문자열로 결정되는 방식이다.

### 4-6. 수식·표·코드 ✅

수식 674개가 KaTeX로 렌더된다. 표 460개, 코드블록 123개 정상. 콜아웃은 0개인데, Vault가 콜아웃 문법을 쓰지 않기 때문이다(처리기는 켜 뒀다). 이미지 0개 — `05 Attachments`가 비어 있는 현황과 일치한다.

---

## 5. 회사 케이스 1차 판정 초안 (D-08)

76개 전수에 대해 초안을 만들었다. 전체 표는 [company-case-review.md](../04-communication/company-case-review.md)에 있다.

| 판정 | 수 |
|---|---|
| ✅ 원문 공개 | 16 |
| 🔄 일반화 후 공개 | 45 |
| ⛔ 비공개 | 15 |

### 중요한 발견 — 노트 구조가 일관적이다

회사 케이스는 전부 같은 템플릿을 쓴다.

```
한 줄 설명 / 문제 또는 목표 / 사용한 기술 / 구현 또는 진행 흐름 / 내가 설명할 수 있는 부분 / 결과
```

위험은 **「구현 또는 진행 흐름」에 집중**되고, 나머지 섹션은 이미 안전한 높이에 있다. 일반화 작업이 노트마다 다른 판단이 아니라 **섹션 단위의 기계적 처리**에 가까워진다는 뜻이다. 예상보다 훨씬 다루기 쉽다.

### ⛔ 판정의 근거 — 실제 사례

`C ONNX Cryptography` 노트를 전문 확인했다. 다음이 그대로 적혀 있다.

- 암호 구성: AES-256-GCM + ML-KEM-512 하이브리드
- 키 래핑 5단계 절차와 각 단계의 버퍼 규약
- 공유 비밀을 SHA-256 한 번으로 래핑 키로 변환하는 방식
- 임시 버퍼 소거·메모리 잠금 처리

이건 상용 보안 제품의 암호 설계 자체이고, 공개하면 그 제품을 공격하려는 사람에게 출발점을 준다. 고유명사를 전부 지워도 위험이 사라지지 않는 종류다. **패턴 검사로는 절대 잡히지 않는다** — 이 노트의 자동 검출 신호는 0건이었다.

on-device-security 묶음의 암호·키·보안 저장소 계열 15개를 같은 기준으로 ⛔ 처리했다.

### 한계

이 초안은 제목·문서 구조·패턴 검출·표본 정독에 근거한다. 🔄 판정 노트는 재작성 시점(P5)에 전문을 읽고 확정한다. **체크리스트 5번(계약·비밀유지서약 저촉)은 제작자가 판단할 수 없으므로 김희섭 님이 직접 봐야 한다.**

---

## 6. 그래프 초기 좌표 · 콘텐츠 가드 · 미리보기

### 6-1. 그래프 초기 좌표 사전 계산

`d3-force-3d`로 빌드 시점에 477개 노드의 3D 배치를 계산해 `graph.json`에 넣는다.

| | |
|---|---|
| 알고리즘 | force-directed 3D (link 28 / charge -140 / center) |
| 반복 | 400 tick |
| 정규화 | 최대 반경 500 |
| 표본 최소 간격 | 17.2 (겹침 없음) |
| 파일 크기 | 520KB → gzip 40KB |

**난수를 시드 고정**했다(`20260920`). 고정하지 않으면 노트 하나만 추가해도 전체 배치가 뒤바뀌어, 사용자가 "그 위치에 있던 노드"를 다시 찾을 수 없게 된다.

### 6-2. 콘텐츠 가드 (기획 §10 계층 2)

규칙 17개를 `guard-rules.txt`에 등록했다. `error`가 하나라도 나오면 **빌드를 실패시킨다.**

| 분류 | 규칙 | 심각도 |
|---|---|---|
| credential | 개인키 블록, AWS 키, GitHub 토큰, Slack 토큰, JWT, 하드코딩 자격증명, 비밀번호 포함 커넥션 문자열 | error |
| internal-net | 사설 IP 대역, 내부 도메인(`.internal`/`.local`/`.corp`) | error |
| internal-net | localhost, IP 형태 URL | warn |
| identity | 이메일, 사번 언급, 법인명 표기 | warn |
| local-path | 사용자 계정이 드러나는 절대 경로 | warn |
| business | 금액 표기, 계약·재무 표현 | warn |

**전수 스캔 결과 — error 0건 · warn 16건 · 예외 1건.**

첫 실행에서 error 1건이 잡혔다. `IP Address.md`의 `192.168.1.2`인데, IP 주소를 설명하는 지식 노트의 교재적 예시라 오탐이다. 이 때문에 `guard-allow.txt` 예외 장치를 만들었다. 예외는 **사유를 반드시 적게** 되어 있다 — "검토했고 안전하다고 판단했다"는 기록이지 귀찮아서 끄는 스위치가 아니다.

warn 16건은 전부 `매출` 같은 단어로, Regression·A/B Test 같은 지식 노트의 정상 용례다.

**가드의 한계를 다시 확인해 둔다.** `C ONNX Cryptography`(⛔ 판정)의 자동 검출 신호는 0건이었다. 설계 판단으로만 식별되는 위험은 이 계층에서 잡히지 않으며, 그래서 회사 케이스는 애초에 옵트인(D-08)이다.

### 6-3. 변환 검수용 HTML 미리보기

JSON만으로는 "Obsidian에서 보던 대로 변환됐는가"를 확인할 수 없어, 최소 스타일로 감싼 HTML 7개를 만들었다.

**열기** — `pipeline/preview/index.html`
Windows 탐색기: `\\wsl.localhost\Ubuntu-24.04\home\hskim\project\hskim-me\pipeline\preview\index.html`

| 문서 | 확인 포인트 |
|---|---|
| Framer Motion | 위키링크·백링크가 전형적인 지식 노트 |
| GAN | 수식(KaTeX) 렌더링 |
| AI and Data MOC | 대형 표, 허브 노트(연결 113) |
| n8n_tech_crawler | 코드블록이 있는 프로젝트 케이스 |
| Studiary | 폴더 노트 관례로 해결한 케이스 |
| Project Cases MOC | **비공개 문서를 가리키는 링크 29개** — 결정 사항 1번 판단용 |

각 문서에 공개 URL·원본 경로·검색용 요약·목차 수·링크 수를 함께 띄운다. **최종 사이트 디자인이 아니다.** 변환 충실도만 보는 화면이다.

---

## 7. 산출물 구조

```
pipeline/
├── config.mjs              경로·공개 규칙의 단일 출처
├── exclude.txt             공개 제외 패턴
├── guard-rules.txt         금칙 패턴 17개
├── guard-allow.txt         예외 목록 (사유 필수)
├── src/
│   ├── stage.mjs           Vault → .vault-cache 필터 복사 (원본 무수정)
│   ├── guard.mjs           콘텐츠 가드. error 검출 시 빌드 중단
│   ├── render.mjs          unified 파이프라인 구성
│   ├── slug.mjs            슬러그 2계층
│   ├── resolve.mjs         위키링크 해석기
│   ├── rewrite-links.mjs   href → 공개 URL 치환
│   ├── build.mjs           본체. 파싱 → 연결 → 출력
│   ├── layout.mjs          3D 초기 좌표 사전 계산 (시드 고정)
│   ├── preview.mjs         검수용 HTML 생성
│   ├── classify-broken.mjs 깨진 링크 원인 분류
│   ├── company-digest.mjs  회사 케이스 요약 추출
│   └── company-verdict.mjs 1차 판정 초안 생성
└── out/                    산출물 (git 미추적)
    ├── content/**.json     문서별 JSON
    ├── graph.json          노드 477 / 엣지 3395
    └── slug-map.json       URL ↔ 원본 경로 (301 리다이렉트용)
```

**Vault는 읽기만 했다.** 원본 파일은 한 건도 수정되지 않았다.

---

## 8. 결정이 필요한 사항

| # | 항목 | 선택지 | 제작자 의견 |
|---|---|---|---|
| 1 | 비공개 문서를 가리키는 링크(205개) 표시 — **미리보기의 Project Cases MOC에서 현재 모습 확인 가능** | ① 링크 해제하고 일반 텍스트 ② 회색 비활성 + "비공개" 툴팁 ③ 그대로 표시하고 404 | **①** — ②는 "여기 뭔가 있는데 안 보여준다"는 인상을 주고, 회사 케이스의 존재를 오히려 드러낸다 |
| 2 | 요약문 160자 초과 24건 | ① 160자에서 자르기(현재) ② 첫 문장까지만 ③ 그대로 두기 | **②** — 검색 결과에서 문장이 중간에 끊기는 것보다 낫다 |
| 3 | `Portfolio.md` 190KB 단일 문서 | P5에서 `##` 단위 분할 예정 | 현재는 한 덩어리로 나온다. P5 착수 전 분할 기준 확정 필요 |
| 4 | 회사 케이스 1차 판정 | 검토 필요 | 특히 체크리스트 5번은 본인만 판단 가능 |

---

## 9. 다음 단계

P2 — 동기화·배포 파이프라인. private 저장소 2개, Obsidian Git, GitHub Actions, Cloudflare Pages, 도메인 연결.
**고객 계정 권한이 필요한 작업**(저장소 생성, DNS 변경)이 포함되므로 착수 전 별도 협의가 필요하다.
