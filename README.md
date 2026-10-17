# K-Padel Arena Manager

코트 예약, 리그 운영(아메리카노·멕시카노·라운드로빈), 순위, 회원가입을
지원하는 Next.js 앱입니다. 데이터는 Supabase(Postgres + Auth + Storage)에
저장되어 모든 방문자가 같은 데이터를 봅니다.

## 설정

### 1. Supabase 프로젝트 만들기

[supabase.com](https://supabase.com) → **New project** → 이름, 비밀번호,
리전(서울 `ap-northeast-2` 추천) 설정.

### 2. SQL 파일 3개를 순서대로 실행

**SQL Editor**에서 각 파일의 전체 내용을 붙여넣고 **Run**. 반드시 이
순서로 실행하세요. 여러 번 실행해도 안전합니다.

1. `supabase/001_schema.sql` — 테이블 생성
2. `supabase/002_rls_policies.sql` — 보안 정책(RLS)
3. `supabase/003_storage_buckets.sql` — 사진 저장용 Storage 버킷 4개

### 3. 이메일 인증 끄기

로그인은 아이디+비밀번호 방식이고, 내부적으로는
`아이디@padelconnect.invalid`라는 존재하지 않는 이메일 주소로 Supabase
Auth에 가입됩니다. 실제 이메일이 아니므로 이메일 인증을 꺼야 합니다.

**Authentication → Providers → Email → "Confirm email" OFF** → Save.

(켜둔 채로 두면 모든 회원가입이 "이메일을 확인해 주세요" 상태에서
멈춥니다.)

### 4. 환경변수 설정

**Project Settings → API**에서 두 값을 복사합니다.

| Key | Value |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | anon public key |

호스팅 서비스의 환경변수 설정에 두 값을 추가한 뒤 배포하세요. 빌드할 때
앱에 포함되는 값이라, 없으면 빌드가 실패합니다.

(anon key는 브라우저에 노출돼도 안전합니다 — 실제 접근 제어는 2단계의
RLS 정책이 담당합니다.)

## 로컬 개발

Node 24와 [pnpm](https://pnpm.io)이 필요합니다 (`corepack enable`로 pnpm을
켤 수 있습니다).

```
pnpm install
cp .env.local.example .env.local   # Supabase URL/anon key 입력
pnpm dev
```

http://localhost:3000 에서 확인.

## 알려진 제한사항

- **라운드로빈(팀전)**: 팀 편성과 대진표가 아직 Supabase에 저장되지
  않습니다. 세션 중에만 동작하고 새로고침하면 사라집니다.
  아메리카노·멕시카노(개인전)는 저장됩니다.
- **비밀번호 찾기**: 이메일 기반 자동 복구가 없습니다. 관리자가 Supabase
  Dashboard → Authentication → Users에서 해당 사용자의 비밀번호를 직접
  새로 설정해 알려줘야 합니다.
