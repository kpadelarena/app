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

| 명령             | 설명                                                                                                                      |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------- |
| `pnpm db:reset`  | 로컬 DB를 비우고 마이그레이션과 시드를 다시 적용                                                                          |
| `pnpm db:types`  | DB 스키마에서 `src/lib/database.types.ts`를 다시 생성                                                                     |
| `pnpm db:stop`   | 로컬 Supabase 중지                                                                                                        |
| `pnpm test`      | 단위 테스트 (Vitest)                                                                                                      |
| `pnpm test:db`   | 데이터베이스 규칙 테스트 (pgTAP, `supabase/tests/`). 로컬 Supabase가 떠 있어야 함                                         |
| `pnpm test:e2e`  | E2E 스모크 테스트 (Playwright). 로컬 Supabase가 떠 있어야 하며, 처음 한 번은 `pnpm exec playwright install chromium` 필요 |
| `pnpm typecheck` | 타입 검사                                                                                                                 |
| `pnpm lint`      | ESLint                                                                                                                    |
| `pnpm format`    | Prettier로 코드 정리                                                                                                      |

로컬 Supabase Studio(테이블 보기·SQL 실행)는 http://127.0.0.1:54323 입니다.

### 스키마 변경

스키마는 `supabase/migrations/`의 SQL 파일(Supabase CLI 마이그레이션)로만
관리합니다. 테이블뿐 아니라 RLS 정책, 트리거, 함수도 모두 여기에 있습니다.

1. `pnpm supabase migration new <이름>` 으로 새 파일을 만들고 SQL을 작성합니다.
   (Studio에서 바꾼 뒤 `pnpm supabase db diff -f <이름>` 으로 생성해도 됩니다.)
2. `pnpm db:reset` 으로 로컬 DB에 처음부터 다시 적용해 확인하고, 규칙이 바뀌었으면
   `supabase/tests/`의 테스트도 고칩니다 (`pnpm test:db`).
3. `pnpm db:types` 로 타입을 다시 생성해 함께 커밋합니다.

아직 배포된 DB가 없으므로 지금은 기존 파일을 직접 고칩니다. 첫 배포 이후에는
이미 적용된 파일은 절대 수정하지 말고 새 파일을 추가해야 합니다.

## 배포

운영 Supabase 프로젝트: `flfnqurjjjhynizkkpet`
(https://flfnqurjjjhynizkkpet.supabase.co, 서울 리전, K-Padel Arena 조직).
프론트엔드는 Vercel에 배포합니다.

### 1. 마이그레이션은 GitHub Actions가 적용합니다

`.github/workflows/supabase.yml`:

- PR에서 `supabase/`가 바뀌면 로컬 DB를 띄워 `supabase/tests/`의 테스트를 실행합니다.
- `main`에 머지되면 `supabase db push`로 운영 프로젝트에 새 마이그레이션을 적용합니다.
  시드 데이터는 적용되지 않습니다. 지점과 코트는 첫 관리자가 앱에서 등록합니다
  (코트 예약 탭 → 지점 설정).

저장소 Secrets(Settings → Secrets and variables → Actions)에 세 값이 필요합니다:

| Secret                  | 값                                                        |
| ----------------------- | --------------------------------------------------------- |
| `SUPABASE_ACCESS_TOKEN` | supabase.com/dashboard/account/tokens 에서 만든 개인 토큰 |
| `SUPABASE_DB_PASSWORD`  | 프로젝트 생성 때 정한 데이터베이스 비밀번호               |
| `SUPABASE_PROJECT_ID`   | 프로젝트 ref (`flfnqurjjjhynizkkpet`)                     |

토큰은 프로젝트 범위(Project → app-prod)로 만들고 권한은 읽기 세 가지만 줍니다:
Project Settings, API Keys, API Key Secrets (모두 Read). 마이그레이션은
`SUPABASE_DB_PASSWORD`로 DB에 직접 연결해 적용되므로 쓰기 권한은 필요 없습니다.

수동으로 적용하려면: `pnpm supabase login` → `pnpm supabase link --project-ref <ref>`
→ `pnpm supabase db push`.

### 2. 첫 관리자

운영 DB에서는 **가장 먼저 가입한 계정이 owner**가 됩니다. 배포 직후 바로 가입하세요.
이후 가입자는 member이며, owner가 역할을 바꿉니다.

### 3. 이메일 인증

회원가입은 실제 이메일 주소로 하므로 **Authentication → Providers → Email**의
"Confirm email"은 켜 둡니다(기본값). 앱이 "확인 메일을 보냈어요" 안내를 띄웁니다.
Supabase 기본 메일 발송은 시간당 몇 통으로 제한되므로, 가입이 많아지면
Resend 같은 SMTP를 **Project Settings → Auth → SMTP**에 연결하세요.

앱은 비밀번호를 8자 이상, 영문과 숫자 포함으로 검사합니다. 서버도 같은 기준을
쓰도록 Authentication → Providers → Email에서 Minimum password length 8,
Password requirements "Letters and digits"로 맞춰 둡니다(로컬 config.toml과 동일).

### 3-1. Google 로그인

Supabase Dashboard → Authentication → Providers → Google에 Google Cloud에서 만든
OAuth 클라이언트의 Client ID와 Secret을 넣으면 앱의 "Google로 계속하기" 버튼이
동작합니다. Google 쪽 Authorized redirect URI는
`https://<project-ref>.supabase.co/auth/v1/callback` 입니다. 코드에는 아무것도
들어가지 않습니다. 로컬 스택에는 Google이 설정돼 있지 않아 로컬에서는 이
버튼이 오류 페이지로 이동합니다.

### 4. Vercel 환경변수

Vercel 프로젝트(Production, Preview 모두)에 두 값을 넣습니다. 빌드할 때 앱에
포함되는 값이라, 없으면 빌드가 실패합니다.

| Key                             | Value                                          |
| ------------------------------- | ---------------------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`      | `https://flfnqurjjjhynizkkpet.supabase.co`     |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Project Settings → API의 anon(publishable) key |

### 5. Auth URL 설정

Supabase **Authentication → URL Configuration**: Site URL은 Vercel 운영 주소,
Redirect URLs에 `https://kpadelarena.vercel.app/**`(운영, 비밀번호 재설정
페이지 등 하위 경로용), `https://*-kpadelarena.vercel.app/**`(프리뷰),
`http://localhost:3000/**`(로컬)을 추가합니다.

(anon key는 브라우저에 노출돼도 안전합니다 — 실제 접근 제어는 RLS 정책이
담당합니다.)

## 알려진 제한사항
