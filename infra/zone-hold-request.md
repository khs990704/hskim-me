# Cloudflare Zone Hold 해제 요청

`hskim.me` 를 Cloudflare 계정에 추가하려 할 때 아래 오류가 발생한다.

> The zone name provided is subject to a hold which disallows the creation of this zone.
> Please contact the owner of the Cloudflare account that manages this domain to have the hold removed.

## 핵심 단서 — zone hold 는 Enterprise 전용

Cloudflare 지원 화면의 안내로 확인된 사실이다.

1. Zone hold 는 **Enterprise 전용 기능**이다.
2. Free · Pro · Business 플랜은 zone hold 를 걸 수 **없다**.
3. **Enterprise zone 은 기본으로 hold 가 켜져 있다.**

따라서 개인 계정에서 실수로 생긴 상태가 아니다. **Enterprise 계약을 쓰는 사업자 계정에 `hskim.me` zone 이 등록돼 있다**는 뜻이다.

가장 유력한 보유자는 **hosting.kr** 이다. 국내 호스팅사가 Cloudflare 파트너 프로그램으로 CDN 을 제공하면서 자사 Enterprise 계정에 고객 도메인 zone 을 만들어 두는 구조가 흔하다. 도메인 구매 시 기본 제공되는 부가서비스로 자동 생성됐을 수 있다.

→ **문의 순서: hosting.kr 이 1순위, Cloudflare 는 2순위.**

---

## 1순위 — hosting.kr 문의 (두 건을 한 번에)

zone hold 해제와 apex 포워딩 문제를 한 문의로 묶는다.
zone hold 가 풀리면 포워딩은 애초에 필요 없어지므로, 그쪽이 본질이다.

hosting.kr 고객센터 · 1:1 문의로 보낸다.

```
안녕하세요. hskim.me 도메인 소유자입니다. 두 가지 문의드립니다.

[1] Cloudflare zone hold 해제 요청

이 도메인을 제 개인 Cloudflare 계정에 추가하려는데 아래 오류로 막힙니다.

  "The zone name provided is subject to a hold which disallows the creation of this zone."

Cloudflare 문서상 zone hold 는 Enterprise 플랜에서만 설정할 수 있고,
Enterprise zone 에는 기본으로 적용된다고 되어 있습니다.
저는 Enterprise 계약을 한 적이 없으므로, 사업자 계정에 이 도메인의 zone 이
등록되어 있는 것으로 보입니다.

귀사에서 Cloudflare 파트너 서비스(CDN 등)로 이 도메인의 zone 을 관리하고
계신지 확인 부탁드립니다. 등록되어 있다면 zone hold 해제(release)와
zone 삭제를 요청드립니다.

[2] 루트 도메인 URL 포워딩 문의

위 [1]이 해결되기 전까지의 임시 방편으로, hskim.me 를 www.hskim.me 로
301 포워딩하려고 했습니다. 그런데 포워딩 설정 시 아래 메시지가 나옵니다.

  "현재 DNS 레코드를 이용중입니다. DNS 레코드 제거 후 다시 시도해주시기 바랍니다."

루트 도메인(@)의 A 레코드를 삭제한 뒤 다시 시도해도 동일하다면,
포워딩 기능이 DNS 레코드 관리와 함께 사용할 수 없는 구조인지 알고 싶습니다.

중요: 이 도메인은 Google Workspace 메일(mail@hskim.me)을 사용 중입니다.
MX 와 SPF(TXT) 레코드는 반드시 유지되어야 합니다.
포워딩을 쓰려면 DNS 레코드 관리 전체를 해제해야 하는 구조라면,
메일이 중단되므로 사용하지 않겠습니다. 이 점 확인 부탁드립니다.

도메인: hskim.me
현재 네임서버: ns1~ns4.hostingkr.net
현재 www: CNAME → hskim-me.pages.dev (정상 동작 중)

감사합니다.
```

---

## 2순위 — Cloudflare 지원

hosting.kr 에서 "우리 계정에 없다" 는 답을 받은 뒤에 진행한다.

### 대시보드 티켓

1. [dash.cloudflare.com](https://dash.cloudflare.com) 에 **도메인을 추가하려는 계정으로** 로그인
2. 화면 우측 상단의 **`?` (Help)** 또는 좌측 하단 **Support** → **Contact Support**
   (바로가기: `https://dash.cloudflare.com/?to=/:account/support`)
3. 분류는 **Account / Other** 계열을 선택
4. 아래 본문을 붙여 넣는다

### 커뮤니티 포럼 (티켓이 막힐 때)

Free 플랜은 기술 티켓이 제한될 수 있다. 티켓 접수가 막히면 포럼을 쓴다.
Cloudflare 직원이 zone hold 해제를 처리해 주는 통로가 여기다.

1. [community.cloudflare.com](https://community.cloudflare.com) 에 같은 계정으로 로그인
2. **New Topic** → 카테고리 `Getting Started` 또는 `DNS & Network`
3. 제목에 **zone hold** 를 명시한다

---

## 제목

```
Request to remove zone hold for hskim.me
```

## 본문 (영문 — 그대로 복사)

```
Domain: hskim.me

I am trying to add hskim.me to my Cloudflare account, but I receive the following error:

  "The zone name provided is subject to a hold which disallows the creation of this zone.
   Please contact the owner of the Cloudflare account that manages this domain to have the
   hold removed."

I am the registrant and owner of this domain. It is registered at hosting.kr and currently
uses the registrar's nameservers (ns1-ns4.hostingkr.net), so it is not actively served by
Cloudflare.

I understand that zone holds can only be set on Enterprise plans and are enabled by default
for Enterprise zones. I have never had an Enterprise account, so this zone must belong to a
third party — most likely a hosting or CDN provider that manages domains on my registrar's
behalf. I have already contacted my registrar (hosting.kr) about this.

If you are able to identify the account holding this zone, could you please contact them on
my behalf, or advise me on how to proceed?

Could you please remove the zone hold so that I can add the domain to my own account?
I am happy to prove ownership — for example by adding a DNS TXT record at the registrar,
or by providing registrar documentation.

Thank you.
```

---

## 예상 후속

소유 증명을 요구하면 보통 **특정 TXT 레코드를 추가하라**고 한다.
hosting.kr → 도메인 관리 → DNS 설정에서 추가하고, 반영은 아래로 확인한다.

```bash
node infra/check-dns.mjs
```

해제되면 4단계(도메인 연결)를 이어서 진행한다.

## 이 건이 막아도 되는 일 / 아닌 일

| | |
|---|---|
| **막히는 것** | `hskim.me` 도메인 연결, Cloudflare Access 기반 공개 전 잠금 |
| **막히지 않는 것** | GitHub Actions 연동, 자동 배포, 전체 동작 확인 — 전부 `hskim-me.pages.dev` 로 진행 가능 |

도메인 연결은 마지막에 붙이는 5분짜리 작업이므로 전체 일정을 막지 않는다.
