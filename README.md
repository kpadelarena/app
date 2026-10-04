# K-Padel Arena Manager

코트 예약, 리그 운영(아메리카노·멕시카노·라운드로빈), 순위, 회원가입을
지원하는 Next.js 앱입니다. 데이터는 Supabase(Postgres + Auth + Storage)에
저장되어 모든 방문자가 같은 데이터를 봅니다.

## 로컬 개발

Node 24, [pnpm](https://pnpm.io)(`corepack enable`), Docker가 필요합니다.

```
pnpm install
pnpm db:start                      # 로컬 Supabase 실행 + 마이그레이션·시드 적용
cp .env.local.example .env.local   # 로컬 Supabase 주소와 키가 들어 있음
pnpm dev
```

http://localhost:3000 에서 확인. 개발용 로그인 계정은
[`supabase/seed.sql`](./supabase/seed.sql) 맨 위에 적혀 있습니다.

| 명령             | 설명                                                  |
| ---------------- | ----------------------------------------------------- |
| `pnpm db:reset`  | 로컬 DB를 비우고 마이그레이션과 시드를 다시 적용      |
| `pnpm db:types`  | DB 스키마에서 `src/lib/database.types.ts`를 다시 생성 |
| `pnpm db:stop`   | 로컬 Supabase 중지                                    |
| `pnpm typecheck` | 타입 검사                                             |
| `pnpm lint`      | ESLint                                                |
| `pnpm format`    | Prettier로 코드 정리                                  |

로컬 Supabase Studio(테이블 보기·SQL 실행)는 http://127.0.0.1:54323 입니다.

### 스키마 변경

1. `pnpm supabase migration new <이름>` 으로 `supabase/migrations/`에 새 파일을
   만들고 SQL을 작성합니다.
2. `pnpm db:reset` 으로 로컬 DB에 처음부터 다시 적용해 확인합니다.
3. `pnpm db:types` 로 타입을 다시 생성해 함께 커밋합니다.

## 배포 설정

### 1. Supabase 프로젝트 만들기

[supabase.com](https://supabase.com) → **New project** → 이름, 비밀번호,
리전(서울 `ap-northeast-2` 추천) 설정.

### 2. 마이그레이션 적용

```
pnpm supabase login
pnpm supabase link --project-ref <프로젝트 ref>
pnpm supabase db push
```

`supabase/migrations/`의 SQL(테이블, 보안 정책(RLS), 사진 저장용 Storage
버킷)이 순서대로 적용됩니다. 시드 데이터는 적용되지 않습니다.

### 3. 이메일 인증 끄기

로그인은 아이디+비밀번호 방식이고, 내부적으로는
`아이디@padelconnect.invalid`라는 존재하지 않는 이메일 주소로 Supabase
Auth에 가입됩니다. 실제 이메일이 아니므로 이메일 인증을 꺼야 합니다.

**Authentication → Providers → Email → "Confirm email" OFF** → Save.

(켜둔 채로 두면 모든 회원가입이 "이메일을 확인해 주세요" 상태에서
멈춥니다.)

### 4. 환경변수 설정

**Project Settings → API**에서 두 값을 복사합니다.

| Key                             | Value           |
| ------------------------------- | --------------- |
| `NEXT_PUBLIC_SUPABASE_URL`      | Project URL     |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | anon public key |

호스팅 서비스의 환경변수 설정에 두 값을 추가한 뒤 배포하세요. 빌드할 때
앱에 포함되는 값이라, 없으면 빌드가 실패합니다.

(anon key는 브라우저에 노출돼도 안전합니다 — 실제 접근 제어는 RLS 정책이
담당합니다.)

## 알려진 제한사항

- **라운드로빈(팀전)**: 팀 편성과 대진표가 아직 Supabase에 저장되지
  않습니다. 세션 중에만 동작하고 새로고침하면 사라집니다.
  아메리카노·멕시카노(개인전)는 저장됩니다.
- **비밀번호 찾기**: 이메일 기반 자동 복구가 없습니다. 관리자가 Supabase
  Dashboard → Authentication → Users에서 해당 사용자의 비밀번호를 직접
  새로 설정해 알려줘야 합니다.
