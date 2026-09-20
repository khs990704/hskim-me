# P2 배포 설정 가이드

Obsidian 커밋이 `hskim.me` 까지 도달하는 경로를 만드는 절차다.
**계정 권한이 필요한 작업이라 김희섭 님이 직접 수행한다.** 각 단계의 결과만 알려주면 나머지는 제작자가 맞춘다.

```
Obsidian (Windows)
   │ Obsidian Git 플러그인으로 커밋·푸시
   ▼
hskim-vault (private)          ← 1단계
   │ push → notify-site.yml 이 알림 발송
   ▼
hskim-me (private)             ← 2단계
   │ build-deploy.yml : Vault 체크아웃 → 변환 → 가드·검증 → 사이트 생성
   ▼
Cloudflare Pages               ← 3단계
   ▼
hskim.me                       ← 4단계
```

---

## 1단계 — Vault 저장소 만들기

1. GitHub에서 **private** 저장소 `hskim-vault` 생성 (README 등 아무것도 추가하지 않음)
2. Windows PowerShell에서 Vault 폴더로 이동해 초기화

   ```powershell
   cd "$env:USERPROFILE\Documents\Obsidian Vault"
   git init -b main
   ```

3. 이 저장소의 `infra/vault-repo/` 파일들을 Vault 루트로 복사

   | 원본 | 복사 위치 |
   |---|---|
   | `gitignore` | `.gitignore` |
   | `gitattributes` | `.gitattributes` |
   | `notify-site.yml` | `.github/workflows/notify-site.yml` |

   `.gitignore` 는 **허용 목록 방식**이다. 기본적으로 전부 제외하고 `01 Knowledge DB`, `02 Project Cases`, `03 Portfolio`, `05 Attachments` 만 다시 넣는다. 제외 목록 방식이면 나중에 새 폴더를 만들었을 때 자동으로 올라가 버린다. 그 반대가 안전하다.

4. 첫 커밋 전에 **무엇이 올라가는지 반드시 확인한다.**

   ```powershell
   git add -A
   git status --short
   ```

   목록에 다음만 있어야 한다.

   ```
   .gitattributes
   .github/workflows/notify-site.yml
   .gitignore
   "01 Knowledge DB/..."
   "02 Project Cases/..."
   "03 Portfolio/Portfolio.md"
   ```

   `05 Attachments` 는 현재 비어 있어 목록에 나오지 않는다. git 은 빈 폴더를 추적하지 않는다. 정상이다.

   `00 Inbox`, `04 Operations`, `Relay`, `.obsidian` 중 하나라도 보이면 `.gitignore` 가 제대로 복사되지 않은 것이다. 커밋하지 말고 확인한다.

5. 커밋·푸시

   ```powershell
   git commit -m "chore: Obsidian Vault 초기 커밋"
   git remote add origin https://github.com/<계정>/hskim-vault.git
   git push -u origin main
   ```

---

## 2단계 — 사이트 저장소와 권한 연결

### 2-1. 사이트 저장소

이 저장소(`hskim-me`)를 GitHub **private** 저장소로 push 한다.

### 2-2. Vault 읽기용 배포 키

CI가 private Vault를 읽으려면 키가 필요하다. WSL에서 키를 만든다.

```bash
ssh-keygen -t ed25519 -C "hskim-me ci" -f ~/.ssh/hskim_vault_ci -N ""
cat ~/.ssh/hskim_vault_ci.pub   # 공개키
cat ~/.ssh/hskim_vault_ci       # 개인키
```

| 어디에 | 무엇을 |
|---|---|
| `hskim-vault` → Settings → Deploy keys → Add | **공개키**. 쓰기 권한은 주지 않는다 (읽기 전용) |
| `hskim-me` → Settings → Secrets → Actions → New secret | 이름 `VAULT_DEPLOY_KEY`, 값은 **개인키** 전문 |

### 2-3. 빌드 요청용 토큰

Vault 저장소가 사이트 저장소에 "빌드해 달라"고 알리기 위한 토큰이다.

1. GitHub → Settings → Developer settings → **Fine-grained personal access token** 생성

   | 항목 | 값 |
   |---|---|
   | Expiration | **1년** (최대치) |
   | Repository access | **Only select repositories → `hskim-me` 하나만** |
   | Permissions | **Repository permissions → Contents → Read and write** |

   **`hskim-vault` 는 넣지 않는다.** 이 토큰은 Vault 저장소의 워크플로가 *사이트 저장소에 빌드를 요청*할 때만 쓴다. Vault 자신은 워크플로가 이미 그 저장소 안에서 돌기 때문에 접근 권한이 필요 없다. 권한은 쓰는 곳에만 준다.

   `Contents — Read and write` 가 필요한 이유는 `repository_dispatch` API 가 그 권한을 요구하기 때문이다. 이름과 달리 파일을 쓰는 동작은 하지 않는다.

2. `hskim-vault` → Settings → Secrets and variables → Actions → `SITE_DISPATCH_TOKEN` 에 등록

### 토큰 만료에 대비하기

**만료되면 사이트가 조용히 멈춘다.** Obsidian에서 커밋해도 사이트가 갱신되지 않는다.

- 증상을 보는 곳: `hskim-vault` → **Actions 탭에 빨간 X**. `notify site` 가 401 로 실패한다.
- 만료일을 캘린더에 기록해 둔다. 재발급 후 `SITE_DISPATCH_TOKEN` 값만 교체하면 된다.
- 급할 때는 `hskim-me` → Actions → `build & deploy` → **Run workflow** 로 수동 배포할 수 있다. 토큰과 무관하게 동작한다.

### 2-4. 변수 등록

| 저장소 | 종류 | 이름 | 값 |
|---|---|---|---|
| `hskim-me` | Variables | `VAULT_REPO` | `<계정>/hskim-vault` |
| `hskim-vault` | Variables | `SITE_REPO` | `<계정>/hskim-me` |

---

## 3단계 — Cloudflare Pages

대시보드 메뉴 이름은 자주 바뀐다. **CLI(`wrangler`) 기준으로 진행하면 버전에 흔들리지 않는다.**
WSL 터미널에서 수행한다. `wrangler` 는 `npx` 로 그때그때 받아 쓰므로 설치할 필요 없다.

### 3-1. Cloudflare 계정

[dash.cloudflare.com](https://dash.cloudflare.com) 에서 계정 생성 또는 로그인. 무료 플랜으로 충분하다.

### 3-2. API 토큰 발급

대시보드에서만 가능한 작업이다.

1. 우측 상단 프로필 → **My Profile** → 왼쪽 **API Tokens**
   (바로가기: `https://dash.cloudflare.com/profile/api-tokens`)
2. **Create Token** → 맨 아래 **Create Custom Token** 의 *Get started*
3. 아래처럼 설정한다.

   | 항목 | 값 |
   |---|---|
   | Token name | `hskim-me deploy` |
   | Permissions | **Account** · **Cloudflare Pages** · **Edit** |
   | Account Resources | Include · 본인 계정 |
   | TTL (선택) | 비워 두면 무기한. 1년으로 두고 갱신해도 된다 |

   권한은 이 한 줄이면 된다. Zone 권한은 필요 없다 — 도메인 연결(4단계)은 대시보드에서 직접 한다.
   `User → Memberships` 같은 계정 조회 권한도 필요 없다. 배포에 쓰이지 않는다.

4. **Continue → Create Token** → 표시된 토큰을 복사한다. **이 화면을 벗어나면 다시 볼 수 없다.**

### 3-3. Account ID 확인과 토큰 검증

**Account ID 는 대시보드 주소창에서 얻는다.** 로그인한 상태의 URL 이 이렇게 생겼다.

```
https://dash.cloudflare.com/8f3c1d2e9a7b5c4d6e0f1a2b3c4d5e6f/workers-and-pages
                            └──────── 이 32자리가 Account ID ────────┘
```

Workers & Pages 화면 우측 사이드바에도 `Account ID` 로 표시된다.

> `npx wrangler whoami` 는 쓰지 않는다. 계정 목록을 조회하려면 `User → Memberships → Read` 권한이 따로 필요한데, 배포에는 쓰이지 않는 권한이다. 토큰을 넓히는 대신 ID 를 직접 넣는다.

터미널에 두 값을 넣고, **Pages 권한만으로 동작하는 명령으로 검증한다.**

```bash
export CLOUDFLARE_API_TOKEN="여기에_복사한_토큰"
export CLOUDFLARE_ACCOUNT_ID="여기에_Account_ID"

npx wrangler pages project list
```

프로젝트 목록이 (비어 있더라도) 정상 출력되면 토큰과 ID 가 모두 맞다.

| 증상 | 원인 |
|---|---|
| `Authentication error` | 토큰 값이 잘못됐거나 만료 |
| `... permissions` 관련 오류 | 토큰 권한이 `Cloudflare Pages · Edit` 이 아님 |
| 다른 계정의 목록이 나옴 | `CLOUDFLARE_ACCOUNT_ID` 가 다른 계정 |

### 3-4. Pages 프로젝트 생성

```bash
npx wrangler pages project create hskim-me --production-branch main
```

- 프로젝트 이름 `hskim-me` 는 워크플로의 `--project-name=hskim-me` 와 반드시 같아야 한다.
- 이미 있다는 오류가 나면 그대로 두고 다음으로 간다.

### 3-5. 첫 배포를 로컬에서 해 본다

CI 를 붙이기 전에 손으로 한 번 배포해 본다. 여기서 실패하면 원인이 토큰·프로젝트 설정에 있다는 뜻이라, CI 로그를 뒤질 필요가 없다.

```bash
cd ~/project/hskim-me
VAULT_PATH="/mnt/c/Users/user/Documents/Obsidian Vault" npm --prefix pipeline run build
node web/build-site.mjs
npx wrangler pages deploy web/dist --project-name=hskim-me --branch=main
```

성공하면 `https://hskim-me.pages.dev` 같은 주소가 출력된다. 열어서 **공개 문서 수가 표시되는 임시 페이지**가 보이면 3단계 완료다.

### 3-6. GitHub Secrets 등록

`hskim-me` → Settings → Secrets and variables → Actions → Secrets

| 이름 | 값 |
|---|---|
| `CLOUDFLARE_API_TOKEN` | 3-2 에서 발급한 토큰 |
| `CLOUDFLARE_ACCOUNT_ID` | 3-3 에서 확인한 ID |

---

## 4단계 — 도메인 연결 (등록기관: hosting.kr)

> 🔴 **2026-09-20 현재 이 단계는 보류 상태다.**
> Cloudflare 에 `hskim.me` 를 추가할 때 **zone hold** 오류가 발생한다.
> 해제 요청 절차와 대안은 [zone-hold-request.md](zone-hold-request.md) 참고.
> **2·3·6단계는 `hskim-me.pages.dev` 로 그대로 진행할 수 있다.**

> ⚠️ **이 도메인으로 Google Workspace 메일(`mail@hskim.me`)을 쓰고 있다.**
> 네임서버를 옮기면 DNS 관리 주체가 hosting.kr → Cloudflare 로 바뀐다.
> **메일 레코드를 Cloudflare 에 먼저 옮겨 놓지 않으면 메일이 끊긴다.**
> 순서를 지킨다: Cloudflare 에 레코드 준비 → 확인 → 그다음에 네임서버 변경.

### 4-0. 현재 설정 (2026-09-20 조회)

| 종류 | 이름 | 값 | 처리 |
|---|---|---|---|
| NS | @ | `ns1~ns4.hostingkr.net` | 교체 대상 |
| **MX** | @ | `1 smtp.google.com` | **반드시 유지** |
| **MX** | @ | `15 ….mx-verification.google.com` | **반드시 유지** |
| **TXT** | @ | `v=spf1 include:_spf.google.com ~all` | **반드시 유지** |
| **TXT** | @ | `anthropic-domain-verification-…` | **반드시 유지** (잃으면 재인증) |
| A | @ | `168.107.15.60` | hosting.kr 주차 페이지. 폐기 |
| A | www | `168.107.15.60` | 폐기 |

DKIM(`google._domainkey`)과 DMARC(`_dmarc`)는 설정돼 있지 않다. 옮길 것이 없다.

현재 값은 언제든 다시 확인할 수 있다.

```bash
node infra/check-dns.mjs
```

### 4-1. Cloudflare 에 사이트 추가

1. 대시보드 → **Add a site** → `hskim.me` 입력
2. 플랜 선택에서 **Free**
3. Cloudflare 가 기존 DNS 레코드를 자동으로 긁어온다

### 4-2. ★ 레코드 확인 — 여기서 멈추고 검증한다

DNS 화면에서 아래 4개가 **전부** 있는지 확인한다. 하나라도 없으면 직접 추가한다.

| Type | Name | Content | Priority | Proxy |
|---|---|---|---|---|
| MX | `hskim.me` | `smtp.google.com` | 1 | — |
| MX | `hskim.me` | `…mx-verification.google.com` | 15 | — |
| TXT | `hskim.me` | `v=spf1 include:_spf.google.com ~all` | — | — |
| TXT | `hskim.me` | `anthropic-domain-verification-…` | — | — |

- **MX 레코드에는 Proxy(주황 구름)를 켜지 않는다.** 메일은 프록시 대상이 아니다.
- `A` 레코드 `168.107.15.60` 은 삭제한다. hosting.kr 주차 페이지이고, 4-5 에서 Pages 가 대신 채운다.

자동 스캔이 값을 놓쳤다면 hosting.kr 의 DNS 관리 화면에서 원본을 복사해 온다.

### 4-3. hosting.kr 에서 DNSSEC 확인

hosting.kr 도메인 관리에 **DNSSEC** 항목이 켜져 있으면 **끈다.**
켜진 상태로 네임서버를 바꾸면 서명 불일치로 도메인 전체가 조회되지 않는다. 메일까지 함께 죽는다.

없거나 비활성이면 그대로 진행한다.

### 4-4. hosting.kr 네임서버 변경

1. [hosting.kr](https://hosting.kr) 로그인 → **마이페이지 / 도메인 관리** → `hskim.me`
2. **네임서버 변경(설정)** 메뉴
3. 기존 `ns1~ns4.hostingkr.net` 을 지우고 Cloudflare 가 알려준 **2개**를 입력
   (`xxxx.ns.cloudflare.com`, `yyyy.ns.cloudflare.com` 형태 — 4-1 화면에 표시된다)
4. 저장

반영까지 보통 수십 분, 최대 24~48시간. Cloudflare 대시보드에서 해당 도메인이 **Active** 로 바뀌면 완료다.

### 4-5. 메일 동작 확인 — Pages 연결보다 먼저

Active 가 된 뒤 **메일부터 확인한다.**

```bash
node infra/check-dns.mjs      # MX·TXT 가 그대로인지
```

외부 계정에서 `mail@hskim.me` 로 한 통 보내 수신되는지 확인한다.
여기서 문제가 있으면 4-2 로 돌아간다. 아래 단계는 메일이 정상인 뒤에 한다.

### 4-6. Pages 에 도메인 연결

```bash
npx wrangler pages deployment list --project-name=hskim-me   # 배포본 확인
```

대시보드에서 진행한다.

1. Workers & Pages → `hskim-me` → **Custom domains** → **Set up a custom domain**
2. `hskim.me` 추가 → Cloudflare 가 필요한 DNS 레코드를 자동 생성
3. 같은 방식으로 `www.hskim.me` 도 추가
4. HTTPS 인증서는 자동 발급 (보통 수 분)

`https://hskim.me` 에서 임시 페이지가 보이면 4단계 완료다.

---

## 5단계 — 공개 전 잠금

정식 공개(P7) 전까지 외부에 노출되면 안 된다. 두 겹으로 막는다.

- **Cloudflare Access** — Zero Trust → Access → Applications 에서 `hskim.me` 를 본인 이메일만 통과하도록 설정
- **robots.txt** — 임시 사이트는 `Disallow: /` 와 `noindex` 를 이미 포함한다 (P7에서 해제)

---

## 6단계 — 동작 확인

1. Obsidian에서 아무 노트나 수정하고 커밋·푸시
2. `hskim-vault` → Actions 에서 `notify site` 성공 확인
3. `hskim-me` → Actions 에서 `build & deploy` 성공 확인
4. `hskim.me` 에서 **공개 문서 수가 바뀌었는지** 확인

푸시부터 반영까지 5분 이내가 목표다.

---

## Obsidian Git 플러그인

Obsidian → 설정 → 커뮤니티 플러그인 → `Obsidian Git` 설치.

**자동 커밋 주기는 끈다(`0`).** "커밋 = 게시 의사 표시"가 원칙이다(D-03).
자동으로 두면 작성 중인 초안이 그대로 공개된다. 게시할 준비가 되면 직접 커밋한다.

---

## 알아둘 것

- **빌드는 안전장치를 통과해야 성공한다.** 콘텐츠 가드(금칙 패턴)나 유출 검증에 걸리면 배포되지 않고 실패한다. 의도한 동작이다.
- **회사 케이스는 Vault 저장소에는 들어가고, 사이트에는 나가지 않는다.** 저장소는 private 이고, 공개 여부는 `publish: true` 옵트인으로 정한다(D-08). 나중에 검수를 통과한 케이스를 공개하려면 원본이 저장소에 있어야 하므로 이 구조가 필요하다.
- **Vault 저장소는 백업이 아니다.** `01`, `02`, `03` 만 올라간다. `00 Inbox`, `04 Operations`, `Relay`, `.obsidian` 설정은 이 저장소에 없으므로 **별도로 백업해야 한다.** 이력·롤백도 되지 않는다.
- **첨부 폴더는 저장소에 포함돼 있지만, 파이프라인은 아직 이미지를 다루지 않는다.** `05 Attachments` 를 허용 목록에 미리 넣어 두었으므로 이미지를 추가하면 저장소에는 올라간다. 다만 사이트에 표시하려면 P3 에서 이미지 경로 변환·최적화 작업이 필요하다. 실제로 이미지를 붙이기 시작하면 알려달라 (기획 문서 열린 항목 #4).
