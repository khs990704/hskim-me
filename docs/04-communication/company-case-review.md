# 회사 프로젝트 케이스 공개 검수

D-08에 따라 `02 Project Cases/Project Index/03 Company/` 하위 노트는 **기본 비공개**다.
공개하려면 노트 frontmatter에 `publish: true`를 추가해야 하며, 그 전에 이 문서의 기준을 통과해야 한다.

> 이 문서는 법률 자문이 아니다. 최종 판단과 근로계약·비밀유지서약 확인은 김희섭 님이 한다.
> 제작자는 판정 초안과 일반화 재작성안을 만들어, 확인만 하면 되는 상태로 제공한다.

---

## 1. 기준선 — 무엇이 위험한가

혼동하기 쉬운 부분부터 정리한다. **"회사 얘기를 하는 것"이 위험한 게 아니다.** 경력기술서와 이력서는 원래 회사에서 한 일을 적는 문서이고, 그게 금지된다면 아무도 이직을 못 한다.

위험한 것은 **재직 중에만 알 수 있었던 비공개 정보**다. 경계는 이렇게 갈린다.

| | 안전 | 위험 |
|---|---|---|
| **기술 스택** | "Kubeflow, MLflow, MinIO를 사용했다" — 공개 기술의 이름 | "우리는 A 대신 B를 골랐는데, A가 우리 환경에서 이런 문제를 일으켰기 때문" — 회사가 돈 주고 얻은 판단 |
| **역할** | "백엔드 API와 스토리지 연동을 구현했다" | "당시 팀이 2명이라 한 명이 세 영역을 겸했다" — 조직 내부 사정 |
| **결과** | "파이프라인 실행 단계를 자동화했다" | "처리 시간을 47분에서 6분으로 줄였다" — 내부 성능 수치 |
| **아키텍처** | "마이크로서비스로 구성된 플랫폼의 한 서비스를 담당했다" | 서비스 간 호출 관계·데이터 스키마·큐 구성이 드러나는 구조도 |
| **고객/제품** | 회사 홈페이지·보도자료·채용공고에 이미 나온 제품명 | 고객사명, 계약 규모, 미출시 제품, 내부 코드명 |
| **보안 도메인** | "PQC 기반 모델 보호 기능을 다뤘다" | 키 관리 흐름, 암호 파라미터 선택, 취약점 대응 내역 |

**판별 질문 하나** — *"이걸 회사 밖 사람이 알려면, 회사 안에 있어야만 했는가?"*
예라면 위험하다. 공개 문서·표준 기술 지식으로 알 수 있는 것이면 안전하다.

특히 마지막 줄(보안 도메인)은 주의가 필요하다. 보안 제품의 내부 동작은 그 자체가 공격 표면 정보가 되므로, 다른 도메인보다 기준을 한 단계 더 보수적으로 잡는다.

---

## 2. 공개 가능한 서술로 바꾸는 법

핵심은 **"우리 회사가 무엇을 어떻게 만들었는가"에서 "내가 무엇을 할 수 있는가"로 주어를 옮기는 것**이다. 포트폴리오의 목적은 애초에 후자다. 전자는 읽는 사람에게도 별로 필요 없다.

### 재작성 공식

1. **주어를 나로** — "시스템은 ~하게 동작한다" → "나는 ~를 구현했다"
2. **고유명사를 범주로** — 내부 시스템명 → "사내 모델 관리 플랫폼", 고객사명 → "제조업 고객사"
3. **수치를 정성 표현으로** — "47분 → 6분" → "수동 단계를 제거해 실행 시간을 크게 단축"
4. **판단의 근거를 지우고 판단의 결과만** — 왜 그 선택을 했는지(회사 자산)는 빼고, 무엇을 다뤘는지(내 경험)만 남긴다
5. **구조도는 내가 만진 범위만** — 전체 아키텍처 대신 내 담당 컴포넌트와 그 입출력 수준까지

### 예시 (형태만, 실제 케이스 아님)

> **원문** — 모델 등록 시 KMS에서 발급한 키로 가중치를 암호화하고, MDS가 배포 시점에 라이선스를 검증한 뒤 복호화 키를 전달한다. 키 회전 주기는 N일이며 실패 시 폴백은 …
>
> **일반화** — 모델 아티팩트의 암호화 저장과 배포 시점 라이선스 검증을 연결하는 서비스의 백엔드를 담당했다. 키 관리 시스템 연동, 모델 메타데이터 전달, 실행 환경 구성(Python·Docker)을 구현했다.

잃은 것은 키 회전 주기와 폴백 설계다. 그건 회사 자산이고, 포트폴리오에서 하는 일이 없다. 남은 것만으로 "이 사람은 KMS 연동과 모델 배포 파이프라인을 다뤄 봤다"가 충분히 전달된다.

---

## 3. 노트별 체크리스트

각 노트마다 확인한다. 하나라도 해당되면 원문 그대로는 공개하지 않는다.

| # | 확인 항목 |
|---|---|
| 1 | 회사 고유의 아키텍처 판단·알고리즘·데이터 스키마가 드러나는가 |
| 2 | 고객사·협력사를 식별할 수 있는가 |
| 3 | 내부 수치(성능, 규모, 비용, KPI, 일정)가 들어 있는가 |
| 4 | 보안 제품의 내부 동작이 공격 표면 정보가 될 수 있는가 |
| 5 | 재직 당시 계약·비밀유지서약의 범위에 저촉되는가 |
| 6 | **국가연구개발과제 산출물인가. 그 과제가 보안과제로 지정됐는가** |

### 6번에 대하여 — ETRI 주관 연구과제

회사 케이스 상당수가 ETRI 주관 국가연구개발과제를 회사 소속으로 수행한 결과물이다(2026-09-20 고객 확인). 이 사실은 판단을 두 가지 방향으로 바꾼다.

**더 보수적으로 가야 하는 이유**
- 국가연구개발과제 산출물의 소유·처분 권한은 개인이 아니라 **주관·참여기관**에 있다. 본인이 직접 구현했더라도 공개 권한은 별개다.
- PQC(ML-KEM)와 OP-TEE 기반 온디바이스 모델 보호는 **보안과제로 지정되기 쉬운 주제**다. 보안과제로 지정된 경우 연구성과 공개 자체가 제한된다.

**안전한 기준선**
- 국가과제는 과제명·연구목표·수행기관 등 요약 정보가 NTIS 등에 공개되는 경우가 많다. **이미 공개된 그 수준 + "이 과제에서 내가 무엇을 담당했는가"** 까지가 안전선이다. 세상에 이미 나와 있는 정보이기 때문이다.

**김희섭 님이 확인할 것은 하나다** — *"그 과제가 보안과제로 지정됐는가."* 협약서나 회사 연구관리 담당자에게 한 줄이면 확인된다. P7 이전까지만 확인되면 되고, 그때까지는 기본값이 비공개라 위험이 없다.

### 판정 구분

| 판정 | 처리 |
|---|---|
| ✅ 공개 | 원문 그대로 `publish: true` |
| 🔄 일반화 후 공개 | §2 공식으로 재작성한 **별도 노트**를 만들어 공개. 원본은 Vault에 비공개로 유지 |
| ⛔ 비공개 | 아무것도 하지 않는다 (기본값) |

**원본을 고치지 않는다.** Vault의 원본은 김희섭 님의 자산이고 기록이다. 공개용은 별도 노트로 분리해, 원본의 상세함과 공개본의 안전성을 동시에 유지한다.

---

## 4. 진행 방식

| 시점 | 주체 | 내용 |
|---|---|---|
| P1 | 제작자 | 회사 케이스 전체 목록과 **1차 판정 초안** 작성 (✅/🔄/⛔ 및 사유) |
| P1 | 김희섭 | 초안 확인. 계약·서약 관련(체크리스트 5번)은 본인만 판단 가능하므로 여기서 확인 |
| P5~P7 | 제작자 | 🔄 판정 노트의 **일반화 재작성안** 작성 |
| P7 | 김희섭 | 재작성안 검토 후 `publish: true` 부여. 최종 공개 승인 |

1차 판정을 P7이 아니라 **P1으로 당긴다.** P1에서 어차피 전체 콘텐츠를 파싱하므로 비용이 거의 들지 않고, 공개 가능한 회사 케이스의 규모를 일찍 알아야 포트폴리오 구성(P5)을 제대로 짤 수 있다.

---

## 5. 1차 판정 초안 (P1, 2026-09-20)

**✅ 16 · 🔄 45 · ⛔ 15 (총 76)**

이 초안은 제목·문서 구조·자동 패턴 검출·표본 정독에 근거한다. 🔄 판정 노트는 재작성 시점(P5)에 전문을 읽고 확정한다.
**체크리스트 5번(계약·비밀유지서약 저촉)은 제작자가 판단할 수 없으므로 김희섭 님이 직접 확인해야 한다.**

### 회사 케이스 노트의 공통 구조

전 노트가 같은 템플릿을 쓴다.

```
한 줄 설명 / 문제 또는 목표 / 사용한 기술 / 구현 또는 진행 흐름 / 내가 설명할 수 있는 부분 / 결과
```

위험은 **「구현 또는 진행 흐름」에 집중**되고 나머지는 이미 안전한 높이에 있다. 일반화가 노트마다 다른 판단이 아니라 섹션 단위의 기계적 처리에 가깝다.

### ⛔ 판정 기준

`C ONNX Cryptography` 전문을 확인한 결과, 암호 구성(AES-256-GCM + ML-KEM-512), 키 래핑 5단계 절차, 버퍼 규약, 키 파생 방식이 그대로 적혀 있었다. 상용 보안 제품의 암호 설계 자체이며 공개 시 공격 출발점이 된다. **이 노트의 자동 패턴 검출 신호는 0건이었다** — 가드만으로는 잡히지 않는다는 D-08의 근거가 실물로 확인됐다.

on-device-security 묶음의 암호·키·보안 저장소 계열을 같은 기준으로 처리했다.

### 판정표

| 묶음 | 노트 | 판정 | 자동 검출 신호 | 사유 / 재작성 방향 |
|---|---|---|---|---|
| Company Projects.md | Company Projects | ✅ | - | 한 줄 설명과 하위 링크 중심의 허브 노트. 구현 세부 없음 |
| Hazard Data | Building Hazard Data Codes | 🔄 | 수치×15 | 「구현 또는 진행 흐름」 섹션을 걷어내고 담당 범위와 사용 기술만 남김 |
| Hazard Data | Hazard Data | 🔄 | 수치×15 | 허브 노트이나 내부 수치·경로가 검출됨. 해당 부분만 제거 |
| Hazard Data | SDF File Processing | 🔄 | 수치×15 | 「구현 또는 진행 흐름」 섹션을 걷어내고 담당 범위와 사용 기술만 남김 |
| MLOps | MLOps Backend API Integration Updates | 🔄 | - | 「구현 또는 진행 흐름」 섹션을 걷어내고 담당 범위와 사용 기술만 남김 |
| MLOps | MLOps Backend MinIO Integration | 🔄 | - | 「구현 또는 진행 흐름」 섹션을 걷어내고 담당 범위와 사용 기술만 남김 |
| MLOps | MLOps Backend | ✅ | - | 한 줄 설명과 하위 링크 중심의 허브 노트. 구현 세부 없음 |
| MLOps | Company MLOps Platform | ✅ | - | 한 줄 설명과 하위 링크 중심의 허브 노트. 구현 세부 없음 |
| MLOps | MLOps Frontend Feature and Design Updates | 🔄 | - | 「구현 또는 진행 흐름」 섹션을 걷어내고 담당 범위와 사용 기술만 남김 |
| MLOps | MLOps Frontend MinIO UI | 🔄 | - | 「구현 또는 진행 흐름」 섹션을 걷어내고 담당 범위와 사용 기술만 남김 |
| MLOps | MLOps Frontend | ✅ | - | 한 줄 설명과 하위 링크 중심의 허브 노트. 구현 세부 없음 |
| NSR | NSR RAG Chatbot | 🔄 | - | 「구현 또는 진행 흐름」 섹션을 걷어내고 담당 범위와 사용 기술만 남김 |
| NSR | NSR | ✅ | - | 한 줄 설명과 하위 링크 중심의 허브 노트. 구현 세부 없음 |
| NSR | NSR FastAPI Context API | 🔄 | - | 「구현 또는 진행 흐름」 섹션을 걷어내고 담당 범위와 사용 기술만 남김 |
| NSR | NSR FastAPI Streaming API | 🔄 | - | 「구현 또는 진행 흐름」 섹션을 걷어내고 담당 범위와 사용 기술만 남김 |
| NSR | NSR RAG Answering Model | 🔄 | - | 「구현 또는 진행 흐름」 섹션을 걷어내고 담당 범위와 사용 기술만 남김 |
| NSR | NSR Server React Build Deployment | 🔄 | - | 기능 성격은 안전. 내부 경로·설정값만 제거 |
| NSR | NSR Server | 🔄 | - | 「구현 또는 진행 흐름」 섹션을 걷어내고 담당 범위와 사용 기술만 남김 |
| on-device-security | C ONNX Packaging | ⛔ | - | 암호 구성·키 래핑·보안 저장소 내부 동작. 공개 시 공격 표면 정보가 된다 |
| on-device-security | C ONNX Cryptography | ⛔ | - | 암호 구성·키 래핑·보안 저장소 내부 동작. 공개 시 공격 표면 정보가 된다 |
| on-device-security | C ONNX Package Metadata | ⛔ | - | 암호 구성·키 래핑·보안 저장소 내부 동작. 공개 시 공격 표면 정보가 된다 |
| on-device-security | C ONNX Model Packager | ⛔ | - | 암호 구성·키 래핑·보안 저장소 내부 동작. 공개 시 공격 표면 정보가 된다 |
| on-device-security | C ONNX Runtime Model Loading | 🔄 | - | TEE·런타임 연동 흐름 제거 후 담당 범위만 남김 |
| on-device-security | On-device Security | ✅ | - | 한 줄 설명과 하위 링크 중심의 허브 노트. 구현 세부 없음 |
| on-device-security | On-device Rust | ✅ | - | 한 줄 설명과 하위 링크 중심의 허브 노트. 구현 세부 없음 |
| on-device-security | Rust Inference Buffer Zeroization | ⛔ | - | 암호 구성·키 래핑·보안 저장소 내부 동작. 공개 시 공격 표면 정보가 된다 |
| on-device-security | Rust ONNX Inference | 🔄 | - | TEE·런타임 연동 흐름 제거 후 담당 범위만 남김 |
| on-device-security | Rust ONNX Model Buffer Zeroization | ⛔ | - | 암호 구성·키 래핑·보안 저장소 내부 동작. 공개 시 공격 표면 정보가 된다 |
| on-device-security | OP-TEE | ✅ | - | 한 줄 설명과 하위 링크 중심의 허브 노트. 구현 세부 없음 |
| on-device-security | OP-TEE File Delete Client | 🔄 | - | TEE·런타임 연동 흐름 제거 후 담당 범위만 남김 |
| on-device-security | OP-TEE File Get Client | 🔄 | - | TEE·런타임 연동 흐름 제거 후 담당 범위만 남김 |
| on-device-security | OP-TEE File Save Client | 🔄 | - | TEE·런타임 연동 흐름 제거 후 담당 범위만 남김 |
| on-device-security | OP-TEE Key Delete Client | ⛔ | - | 암호 구성·키 래핑·보안 저장소 내부 동작. 공개 시 공격 표면 정보가 된다 |
| on-device-security | OP-TEE Key Get Client | ⛔ | - | 암호 구성·키 래핑·보안 저장소 내부 동작. 공개 시 공격 표면 정보가 된다 |
| on-device-security | OP-TEE Key Save Client | ⛔ | - | 암호 구성·키 래핑·보안 저장소 내부 동작. 공개 시 공격 표면 정보가 된다 |
| on-device-security | OP-TEE Model Parameter Processing | 🔄 | - | TEE·런타임 연동 흐름 제거 후 담당 범위만 남김 |
| on-device-security | OP-TEE Model Recovery and Inference | 🔄 | - | TEE·런타임 연동 흐름 제거 후 담당 범위만 남김 |
| on-device-security | OP-TEE Secure Storage Client | ⛔ | - | 암호 구성·키 래핑·보안 저장소 내부 동작. 공개 시 공격 표면 정보가 된다 |
| on-device-security | OP-TEE Storage Process Integration | 🔄 | - | TEE·런타임 연동 흐름 제거 후 담당 범위만 남김 |
| on-device-security | OP-TEE File Storage TA | ⛔ | - | 암호 구성·키 래핑·보안 저장소 내부 동작. 공개 시 공격 표면 정보가 된다 |
| on-device-security | OP-TEE Key Storage TA | ⛔ | - | 암호 구성·키 래핑·보안 저장소 내부 동작. 공개 시 공격 표면 정보가 된다 |
| on-device-security | OP-TEE Secure Storage | ⛔ | - | 암호 구성·키 래핑·보안 저장소 내부 동작. 공개 시 공격 표면 정보가 된다 |
| secuai | Edge Metrics Push Sender | 🔄 | - | 「구현 또는 진행 흐름」 섹션을 걷어내고 담당 범위와 사용 기술만 남김 |
| secuai | Edge Model Hash Verification | ⛔ | - | 보안 검증 절차의 내부 동작 |
| secuai | SecuAI Edge Test API | ✅ | - | 한 줄 설명과 하위 링크 중심의 허브 노트. 구현 세부 없음 |
| secuai | KMS Admin Workflow Updates | 🔄 | - | 「구현 또는 진행 흐름」 섹션을 걷어내고 담당 범위와 사용 기술만 남김 |
| secuai | KMS Excel Bulk Import Validation | 🔄 | - | 「구현 또는 진행 흐름」 섹션을 걷어내고 담당 범위와 사용 기술만 남김 |
| secuai | KMS Internationalization | 🔄 | - | 기능 성격은 안전. 내부 경로·설정값만 제거 |
| secuai | KMS | ✅ | - | 한 줄 설명과 하위 링크 중심의 허브 노트. 구현 세부 없음 |
| secuai | MDS Dashboard Backend Deployment Script | 🔄 | - | 기능 성격은 안전. 내부 경로·설정값만 제거 |
| secuai | MDS Dashboard Backend | 🔄 | - | 「구현 또는 진행 흐름」 섹션을 걷어내고 담당 범위와 사용 기술만 남김 |
| secuai | MDS Dashboard License Query API | 🔄 | - | 「구현 또는 진행 흐름」 섹션을 걷어내고 담당 범위와 사용 기술만 남김 |
| secuai | MDS Dashboard Frontend Deployment Configuration | 🔄 | - | 기능 성격은 안전. 내부 경로·설정값만 제거 |
| secuai | MDS Dashboard Frontend | 🔄 | - | 「구현 또는 진행 흐름」 섹션을 걷어내고 담당 범위와 사용 기술만 남김 |
| secuai | MDS Dashboard License Internationalization | 🔄 | - | 기능 성격은 안전. 내부 경로·설정값만 제거 |
| secuai | MDS Dashboard License Visualization and Filtering | 🔄 | - | 「구현 또는 진행 흐름」 섹션을 걷어내고 담당 범위와 사용 기술만 남김 |
| secuai | MDS Dashboard | ✅ | - | 한 줄 설명과 하위 링크 중심의 허브 노트. 구현 세부 없음 |
| secuai | MDMS | ✅ | - | 한 줄 설명과 하위 링크 중심의 허브 노트. 구현 세부 없음 |
| secuai | MDS Deployment Status Tracking | 🔄 | - | 기능 성격은 안전. 내부 경로·설정값만 제거 |
| secuai | MDS Docker Runtime Configuration | 🔄 | - | 기능 성격은 안전. 내부 경로·설정값만 제거 |
| secuai | MDS Edge Monitoring Controls | 🔄 | - | 「구현 또는 진행 흐름」 섹션을 걷어내고 담당 범위와 사용 기술만 남김 |
| secuai | MDS Internationalization | 🔄 | - | 기능 성격은 안전. 내부 경로·설정값만 제거 |
| secuai | MDS License Status Management | 🔄 | - | 「구현 또는 진행 흐름」 섹션을 걷어내고 담당 범위와 사용 기술만 남김 |
| secuai | PQC MDS Internationalization | 🔄 | - | 기능 성격은 안전. 내부 경로·설정값만 제거 |
| secuai | PQC MDS MLOps Metadata Integration | 🔄 | - | 「구현 또는 진행 흐름」 섹션을 걷어내고 담당 범위와 사용 기술만 남김 |
| secuai | PQC MDS Model Format Support | 🔄 | - | 「구현 또는 진행 흐름」 섹션을 걷어내고 담당 범위와 사용 기술만 남김 |
| secuai | PQC MDS Model Protection Demo Workflow | ⛔ | - | 보안 검증 절차의 내부 동작 |
| secuai | PQC MDS Runtime Environment Configuration | 🔄 | - | 「구현 또는 진행 흐름」 섹션을 걷어내고 담당 범위와 사용 기술만 남김 |
| secuai | SecuAI PQC MDS | ✅ | - | 한 줄 설명과 하위 링크 중심의 허브 노트. 구현 세부 없음 |
| secuai | PQC SDK Docker Runtime Configuration | 🔄 | - | 기능 성격은 안전. 내부 경로·설정값만 제거 |
| secuai | PQC SDK Model Metadata Integration | 🔄 | - | 「구현 또는 진행 흐름」 섹션을 걷어내고 담당 범위와 사용 기술만 남김 |
| secuai | SecuAI PQC SDK | ✅ | - | 한 줄 설명과 하위 링크 중심의 허브 노트. 구현 세부 없음 |
| secuai | SecuAI Model Security Platform | ✅ | - | 한 줄 설명과 하위 링크 중심의 허브 노트. 구현 세부 없음 |
| secuai | SecuAI MLOps Model Registration and SDK Integration | 🔄 | - | 「구현 또는 진행 흐름」 섹션을 걷어내고 담당 범위와 사용 기술만 남김 |
| secuai | SecuAI MLOps Pipeline Orchestration | 🔄 | - | 「구현 또는 진행 흐름」 섹션을 걷어내고 담당 범위와 사용 기술만 남김 |
| secuai | SecuAI MLOps Pipeline | ✅ | - | 한 줄 설명과 하위 링크 중심의 허브 노트. 구현 세부 없음 |
