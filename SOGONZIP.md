# Sogon.zip Project Context

Last updated: 2026-07-09

이 문서는 사람과 agent가 Sogon.zip 프로젝트의 방향을 바로 이해하기 위한 기준 문서다. 새 작업을 시작하기 전에 먼저 이 파일을 읽고, 제품 방향과 현재 기술 상태를 벗어나지 않게 진행한다.

## One-Line Summary

Sogon.zip은 연인이나 가까운 친구가 취향, 마음, 작은 비밀을 private file처럼 저장하고, 정해진 순간에 owner confirmation을 거쳐 열어보는 관계 기반 아카이브 앱이다.

## Product Identity

앱 이름은 `Sogon.zip`, 한국어 표기는 `소곤.zip`, 읽기는 `소곤집`이다.

이름에는 두 가지 의미가 있다.

1. 조용히 나누는 속삭임을 압축한 `.zip` 파일
2. 가까운 사람과 취향과 추억을 보관하는 작은 private home, 즉 `집`

이 앱은 일반적인 데이팅 앱이 아니다. 관계를 매칭하거나 과시하는 앱이 아니라, 이미 가까운 두 사람이 서로의 취향을 더 안전하고 다정하게 알아가는 앱이다.

## Core Promise

조용히 저장한 취향이, 우리의 시간이 되는 곳.

취향은 추천으로 풀리고, 마음은 정해둔 날에 열린다.

## Target Users

- 한국 10대, 20대 사용자
- 연인 또는 아주 가까운 친구
- `성수맛집.zip`, `여행코스.zip`, `우리추억.zip`, `생일선물.zip` 같은 아카이브형 표현에 익숙한 사용자
- 데이트, 약속, 여행, 선물, 음식 취향을 맞추는 데 피로를 느끼는 사용자
- 감성적이지만 실제로 쓸모 있는 관계 앱을 원하는 사용자

## Product Principles

1. Nothing opens automatically.
   파일은 정해둔 날이 되어도 자동 공개되지 않는다. 반드시 작성자가 마지막으로 확인하고 열어야 한다.

2. Private can still be useful.
   공개 전의 private file도 추천에는 조심스럽게 반영될 수 있다. 단, 원문 내용은 상대에게 보이지 않는다.

3. Owner control comes first.
   민감한 정보, 알레르기, 마음, 비밀은 작성자가 언제든 닫아두거나 미룰 수 있어야 한다.

4. Emotional but practical.
   감성적인 표현을 쓰되 기능은 명확해야 한다. 사용자가 "그래서 지금 뭘 하면 되는지" 바로 알아야 한다.

5. File archive metaphor.
   폴더, 파일, `.zip`, 잠금, 열기, 기록 캘린더의 은유를 유지한다.

## Visual Direction

Mood:

- Trendy
- Soft
- Warm
- Private
- Trustworthy
- Slightly retro
- File archive style
- Minimal but charming

Core colors:

- Cream white background
- Soft lavender
- Pale yellow
- Warm pink
- Muted mint
- Soft gray
- Dark navy or charcoal text

UI objects:

- Folder cards
- File cards
- `.zip` badges
- Locked files
- Unzip/open buttons
- File explorer style tabs
- Record calendar
- Small message/reaction bubbles

Avoid:

- Corporate SaaS 느낌
- 너무 유치한 캐릭터 중심 디자인
- 지나친 하트 장식
- 단조로운 보라색 일변도
- 자동 공개처럼 느껴지는 압박감 있는 UX

### Brand Mark

이름의 뜻이 곧 심볼이다. **소곤소곤 나눈 둘만의 비밀스러운 취향과 정보가 하나로 합쳐진 `.zip` 파일.**

- **말풍선** = 말
- **작은 점 ⋯ 두 세트** = 소곤소곤 — 작은 소리가 서로 오간다
- **맞물린 사각 톱니(지퍼)** = `.zip` — 둘의 것이 맞물려 하나로 합쳐지고, 닫혀 있다(비밀)
- **coral `#F58AA3` / lavender `#A996E8` 두 색** = 두 사람

⚠️ **점을 굵은 막대로 바꾸지 말 것.** 소곤소곤은 ① 작고 ② 조용하고 ③ 반복되는 소리다.
말풍선만으로는 "말한다"이지 "소곤거린다"가 아니다. 점의 **작음**이 소곤을 만들고,
**두 세트**가 반복(소곤+소곤)과 두 사람을 동시에 만든다. 막대로 바꾸는 순간 큰 소리가 되어
소곤이 사라진다. 점 2개(`..`)로 줄여도 웅얼거림으로 안 읽히니 **한쪽에 3개**를 유지한다.

⚠️ **집(house)을 쓰지 않는다.** `.zip`을 "둘만의 집"으로 읽은 초기 시안이 있었는데 뜻이 틀렸다.
`.zip`은 압축 파일이지 집이 아니다.

⚠️ **하트를 쓰지 않는다.** Avoid의 "지나친 하트 장식". 하트를 넣는 순간 데이팅 앱 아이콘
수백 개와 구분이 안 된다.

⚠️ **지퍼 이빨은 반드시 사각 톱니다.** V자 지그재그로 그리면 지퍼가 아니라 **찢어진 종이**로
읽힌다 (관계 앱에 최악의 함의). 96/48/24/16px를 크림·네이비·화이트 배경에 얹어
헤드리스 Chrome으로 실제 렌더해 확인한 결과다 — 눈으로 보기 전에는 판단하지 말 것.

에셋 위치 — **패스를 고칠 때는 아래를 전부 같이 고쳐야 한다**:

| 파일 | 용도 |
| --- | --- |
| `FE/ProtoWeb/public/logo.svg` | 마스터 마크. 파비콘도 이 파일을 쓴다 (별도 변형 없음) |
| `FE/ProtoWeb/public/apple-touch-icon.png` | 180x180, 크림 배경 |
| `FE/ProtoWeb/public/og-image.png` | 1200x630, 카톡/슬랙 링크 미리보기 |
| `FE/ProtoWeb/src/app/components/SogonMark.tsx` | 앱 안에서 쓰는 React 버전 |

`SogonMark`는 clipPath id를 `useId()`로 네임스페이스한다. 하드코딩하면 한 화면에
마크가 두 개 이상 놓일 때 클립이 서로 충돌한다.
`seam` prop은 지퍼 이음선과 소곤 점의 색이며 **놓이는 배경색과 같아야** 자연스럽다.

⚠️ OG 이미지 주소는 아직 상대 경로다. 도메인이 정해지면 `index.html`에서 절대 URL로
바꿔야 한다 (`BETA_DEPLOY.md` 12번 참고).

### 한글 줄바꿈

한글은 기본적으로 단어 중간에서 잘린다. 큰 제목에는 `break-keep`
(`word-break: keep-all`)을 붙여야 마지막 한 글자가 혼자 다음 줄로 떨어지지 않는다.

## Key User Flow

1. Intro
   사용자는 Sogon.zip의 정체성을 본다.

2. Relationship selection
   연인 또는 친구와 시작할 관계 유형을 고른다.

3. Sign up and find my person
   아이디/비밀번호로 가입하고, 상대의 계정 코드로 내 사람을 찾아 연결 요청을 보낸다.
   상대가 수락해야 연결이 완료된다. 수락 전까지는 서로의 소곤파일이 보이지 않는다.

4. Home
   오늘의 추천, 다가오는 소곤파일, 최근 기록을 본다.

5. Create Sogon File
   태그, 내용, 민감도, 열리는 시점, 추천 반영 여부를 설정한다.

6. My Sogon Folder
   열릴 예정, 열 준비됨, 열림, 닫아둠 탭에서 파일을 관리한다.

7. Unzip confirmation
   작성자가 공개 전 마지막으로 확인한다.

8. Received file
   상대가 열린 파일을 보고 반응을 남긴다.

9. Record calendar
   열린 순간과 반응이 관계 기록으로 남는다.

## Data Model Draft

### Profile

```ts
type SogonProfile = {
  nickname: string;
  relationshipType?: 'lover' | 'friend';
  accountCode?: string;
  partnerNickname?: string;
  partnerAccountCode?: string;
  isConnected?: boolean;
  createdAt: string;
};
```

### Sogon File

```ts
type SogonFileStatus = 'scheduled' | 'ready' | 'opened' | 'closed';

type SogonFile = {
  id: string;
  tags: string[];
  content: string;
  sensitivity: string;
  openingTime: string;
  recommendationOn: boolean;
  status: SogonFileStatus;
  createdAt: string;
};
```

Status meaning:

- `scheduled`: 나중에 열릴 예정
- `ready`: 지금 열 수 있음
- `opened`: 열림 완료
- `closed`: 닫아둠 또는 공개하지 않음

## Current Repository Structure

```text
SogonZip/
  README.md
  SOGONZIP.md
  SogonZip_archive.md
  BETA_DEPLOY.md
  package.json

  FE/
    # FE: ProtoWeb, currently deployed to Cloudflare Pages
    ProtoWeb/
      public/
      src/
        main.tsx
        app/
          App.tsx
          components/
          lib/sogonStore.ts
        styles/

    # FE: Native app direction, Expo React Native
    App/
      mobile/
        app.json
        package.json
        index.ts
        src/App.tsx

  BE/
    # BE: Cloudflare Pages Functions source
    functions/
      api/
        _shared.ts
        auth/
        rooms/
        files/
        preferences/

    # BE: Cloudflare D1 schema migrations
    migrations/
      0001_beta_schema.sql

  # Cloudflare Pages adapter. Keep this at repo root.
  functions/
    api/
      ...

  # Legacy / reference DB draft
  DB-DEMO/
```

## Current Technical State

There are now three technical areas:

1. FE / ProtoWeb
2. FE / App
3. BE / Beta API + D1

### FE / ProtoWeb

```text
FE/ProtoWeb/
```

Stack:

- Vite
- React
- React Router
- Tailwind CSS style classes
- shadcn/Radix-style UI files from Figma export

Purpose:

- This is the current Cloudflare Pages beta surface.
- It is a web prototype shaped like a mobile app.
- Friends can open it through a `pages.dev` link without installing anything.
- It still keeps a localStorage fallback so the UI does not break before D1 is connected.
- When a beta user is logged in, it attempts to sync profile, files, and preferences through `/api/*`.

Important files:

- `FE/ProtoWeb/src/main.tsx`: React entry point.
- `FE/ProtoWeb/src/app/App.tsx`: ProtoWeb routes. 공개 / 로그인 전용 / 보호 라우트를 나눠둔다.
- `FE/ProtoWeb/src/app/lib/session.tsx`: 세션 컨텍스트와 라우트 가드(`RequireAuth`, `RedirectIfAuthed`).
- `FE/ProtoWeb/src/app/components/LoginScreen.tsx`: beta login screen. Existing users sign in with their id/password.
- `FE/ProtoWeb/src/app/components/CreateJoinRoom.tsx`: signup and "find my person" screen. Users create an account, receive their own account code, then connect to a partner by entering that partner's account code.
- `FE/ProtoWeb/src/app/components/HomeScreen.tsx`: beta home. Syncs remote files/preferences after login.
- `FE/ProtoWeb/src/app/components/CreateSogonFile.tsx`: create a Sogon file.
- `FE/ProtoWeb/src/app/components/MySogonFolder.tsx`: list and edit Sogon files. Syncs remote files after login.
- `FE/ProtoWeb/src/app/components/PlusPlanModal.tsx`: currently used as MY/preference DB input surface.
- `FE/ProtoWeb/src/app/lib/sogonStore.ts`: ProtoWeb data boundary. It wraps localStorage and Cloudflare API calls.
- `FE/ProtoWeb/public/_redirects`: Cloudflare Pages SPA redirect rule.

Run:

```bash
yarn install
yarn dev
```

Build:

```bash
yarn build
```

Known status:

- `yarn build` passes.
- Cloudflare Pages build command: `corepack enable && yarn install --immutable && yarn build`
- Cloudflare Pages output directory: `dist`
- Cloudflare framework preset can be `None` or `Custom` if `Vite` is not shown. Do not choose `VitePress`.

### FE / App

```text
FE/App/mobile/
```

Stack:

- Expo SDK 56
- React Native 0.85.3
- React 19.2.3
- TypeScript
- `@expo/vector-icons`

Purpose:

- This is the real app direction.
- It is the future native mobile app.
- It is not the current deployed beta surface.
- The ProtoWeb app remains the fastest way to test with friends.

Important files:

- `FE/App/mobile/src/App.tsx`: current native MVP in one file
- `FE/App/mobile/app.json`: Expo app config
- `FE/App/mobile/package.json`: mobile scripts and dependencies

Run:

```bash
yarn workspace sogonzip-mobile start
```

iOS simulator:

```bash
yarn workspace sogonzip-mobile ios
```

Android emulator:

```bash
yarn workspace sogonzip-mobile android
```

Type check:

```bash
yarn workspace sogonzip-mobile typecheck
```

Known status:

- `yarn workspace sogonzip-mobile typecheck` passes.
- npm audit previously passed; use `yarn npm audit --environment production` for Yarn-based audit checks.
- Expo Metro Bundler has been verified to start.
- Current local Node was `v20.12.2`, but Expo SDK 56 expects `>=20.19.4`. Upgrade Node before serious mobile development.

### BE / Beta API

```text
BE/functions/api/
```

Stack:

- Cloudflare Pages Functions
- TypeScript
- Cloudflare D1
- Session tokens stored in a `sessions` table (the token itself is never stored, only its SHA-256 hash)

Purpose:

- Give each friend their own beta account.
- Let each friend create their own account code.
- Let a friend find and connect to another account by code.
- Store Sogon files and preference DB entries by room, not by each browser.
- Keep the backend small enough to stay free and easy to replace later.

Important files:

- `shared/sogonOpening.ts`: **열림 시점 도메인 규칙의 단일 소스.** FE와 BE가 함께 import한다. 옵션 라벨을 여기 말고 다른 곳에 정의하지 않는다.
- `BE/functions/api/_shared.ts`: shared API helpers, `handle()` error wrapper, PBKDF2 password hashing, session create/verify, login throttle, room capacity, lazy open-time promotion.
- `BE/functions/api/auth/signup.ts`: beta account signup and account-code generation.
- `BE/functions/api/auth/login.ts`: beta account login. Verifies PBKDF2, transparently upgrades legacy hashes.
- `BE/functions/api/auth/logout.ts`: revoke the current session.
- `BE/functions/api/auth/me.ts`: current member/profile lookup (GET), 회원 탈퇴 (DELETE).
- `BE/functions/api/people/disconnect.ts`: 연결 해제. 방을 해체하고 공유 기록을 지운다.
- `BE/functions/api/people/_link.ts`: connection guards (`assertCanConnect`) and the actual room join (`linkMembers`).
- `BE/functions/api/people/find.ts`: find a potential partner by account code.
- `BE/functions/api/people/connect.ts`: **연결 요청을 보낸다.** 바로 연결하지 않는다.
- `BE/functions/api/people/requests.ts`: list pending requests, and accept / decline / cancel.
- `BE/functions/api/files/index.ts`: list and create Sogon files. 조회는 내 파일 + 열린 파일만 내려준다.
- `BE/functions/api/files/[id].ts`: update (PATCH) / delete (DELETE) a Sogon file. 작성자 본인만 가능하고, 열린 파일은 수정 불가(삭제는 가능).
- `BE/functions/api/preferences/index.ts`: list and create preference DB entries for the current room.
- `functions/api/*`: Cloudflare Pages root adapter that re-exports from `BE/functions/api/*`. Do not put business logic here. 새 라우트를 추가하면 여기에도 어댑터를 만들어야 한다.

Cloudflare requirement:

- Create a D1 database, for example `sogonzip-db`.
- Run the migrations in order in that D1 database:
  - `BE/migrations/0001_beta_schema.sql`
  - `BE/migrations/0002_security_and_scheduling.sql` (한 번만 실행. `ALTER TABLE ADD COLUMN`은 재실행하면 실패한다.)
  - `BE/migrations/0003_recommendation.sql` (추천용 테이블. 아직 쓰는 API가 없어 기존 동작에는 영향이 없다.)
- Bind the database to the Pages project with variable name `DB`.
- Redeploy after adding the binding.

### Security model (updated)

- 비밀번호: 유저별 16바이트 salt + PBKDF2-SHA256. 반복 횟수는 `password_algo`에
  `pbkdf2-sha256-50000` 형태로 함께 저장한다. Cloudflare 무료 플랜 CPU 한도(요청당 10ms)
  때문에 50k로 잡았다. 유료 플랜으로 올리면 `_shared.ts`의 `PBKDF2_ITERATIONS`만 올리면
  되고, 기존 계정은 다음 로그인 성공 시 자동으로 재해싱된다.
- 0001 스키마로 만든 기존 계정은 `sha256-legacy`로 남아 있다가 로그인 성공 시 자동 전환된다.
- 세션: 32바이트 랜덤 토큰. DB에는 SHA-256 해시만 저장하고 30일 만료 + 슬라이딩 연장.
  로그아웃은 해당 행을 삭제한다.
- 로그인 시도 제한: 15분에 10회 실패하면 15분 잠금 (`auth_attempts`).
- 연결: 계정 코드를 아는 것만으로 연결되지 않는다. 상대가 `people/requests`에서
  수락해야 한다. 한 방의 정원은 `ROOM_CAPACITY = 2`로 고정.
- 소곤파일: 상대에게는 `status = 'opened'`인 파일만 내려간다. 수정/삭제/개봉은 작성자 본인만.

### 삭제 모델

- **소곤파일 삭제**: 작성자 본인만. 이미 열린 파일도 지울 수 있다(작성자에게 마지막 권한이 있어야 한다).
  열린 파일을 지우면 상대의 기록에서도 사라지므로 UI에서 그 사실을 알린다.
- **연결 해제**: 방을 해체하고 그 방의 소곤파일·취향 기록을 모두 지운다. 되돌릴 수 없다.
  소곤폴더는 두 사람의 공유 아카이브라, 한쪽만 빠지면 남은 쪽이 상대 없는 방에 갇히기 때문이다.
- **회원 탈퇴**: 계정, 세션, 내가 쓴 소곤파일과 취향 기록을 지운다. 연결 상태였다면 방도 함께 해체된다.

> ⚠️ **`rooms`를 직접 DELETE하지 말 것.**
> `members.room_id`에 `REFERENCES rooms(id) ON DELETE CASCADE`가 걸려 있어서,
> 방을 먼저 지우면 그 방에 속한 **계정까지 함께 삭제된다.**
> 방 해체는 반드시 `_shared.ts`의 `dissolveRoom()`을 쓴다.
> (멤버를 먼저 `room_id = NULL`로 떼어낸 뒤 방을 지운다.)
> 이 동작은 `scripts/test.mjs`에서 회귀 테스트로 고정돼 있다.

### 라우트 가드

`FE/ProtoWeb/src/app/lib/session.tsx`

- 앱 시작 시 토큰이 있으면 `/api/auth/me`로 세션이 살아있는지 확인한 뒤에 보호 화면을 그린다.
  확인이 끝나기 전에는 로딩 화면을 보여주고, 절대 통과시키지 않는다.
- 공개: `/`, `/intro`, `/relationship`, `/create-room`(가입 화면이라 비로그인도 필요)
- 로그인 상태면 진입 불가: `/login` → `/home`
- 보호: `/home`, `/create-file`, `/my-folder`, `/unzip`, `/received`, `/recommendation`, `/record`, `/plus`
- 가드에 막히면 원래 가려던 경로를 들고 `/login`으로 가고, 로그인 후 그곳으로 돌아간다.
- 화면을 보는 도중 세션이 만료되면(어떤 API든 401) `onSessionExpired`로 가드가 즉시 반응한다.

> ⚠️ **`/api/*` 응답은 반드시 JSON인지 확인할 것.**
> `public/_redirects`의 `/* /index.html 200` 때문에, 라우팅되지 않은 `/api/*`는
> 404가 아니라 **index.html을 200으로** 돌려준다. 이걸 성공으로 받으면
> 로그인하지 않은 사용자가 통과한다. `apiFetch`가 `content-type`을 확인하고,
> `fetchCurrentProfile`은 프로필 모양까지 검증한다. 이 두 검사를 제거하지 말 것.
> (실제로 헤드리스 브라우저로 앱을 돌려보다가 발견한 버그다.)

Still missing before public release:

- 이메일 인증, 비밀번호 재설정
- 삭제 전 데이터 내보내기 (지금은 탈퇴하면 바로 사라진다)

### BE / D1 Data Model

```text
BE/migrations/0001_beta_schema.sql
```

Tables:

- `rooms`: one shared couple/friend archive room, created when two accounts connect.
- `members`: beta login accounts. Each member has an `account_code`; `room_id` is empty until connected.
- `sogon_files`: private files saved inside a room. `opening_at`(ISO)이 실제 개봉 시각이고,
  `opening_time`은 사용자에게 보여주는 라벨이다. `opening_at`이 NULL이면 자동 개봉되지 않는다.
- `preferences`: recommendation preference DB entries saved inside a room.
- `sessions`: 로그인 세션. 토큰 원문은 저장하지 않고 SHA-256 해시만 저장한다.
- `connection_requests`: 연결 요청과 그 응답 상태.
- `auth_attempts`: 로그인 실패 횟수와 잠금 시각.

## Mobile MVP Implemented So Far

The native app currently includes:

- Intro screen
- Relationship selection screen
- Create room screen
- Invite code state
- Home screen
- Create Sogon File screen
- My Sogon Folder screen
- Simple in-memory navigation
- Simple in-memory Sogon File state
- Bottom navigation for Home, Folder, Create

The native app does not yet include:

- Persistent storage
- Real authentication
- Real account-code connection
- Backend
- Push notifications
- Calendar storage
- Edit file
- Open/unzip confirmation state transition
- Reaction flow
- Recommendation engine

## Recommended Development Direction

The project should move toward a real mobile app, but the current friend beta should run through ProtoWeb + Cloudflare BE.

Recommended near-term direction:

1. Stabilize ProtoWeb beta with D1-backed accounts, account-code connection, and room data.
2. Fix core flow gaps in ProtoWeb: selected-file unzip, opened status transition, better empty states.
3. Use beta feedback to decide the exact native app flow.
4. Continue native development in `FE/App/mobile`.
5. Split `FE/App/mobile/src/App.tsx` into screens, components, and domain modules once the next native feature lands.
6. Reuse the BE contract from `BE/functions/api` when the native app starts talking to a real backend.

## Next Development Priorities

### Priority 1: Native App Foundation

Current priority before returning to native foundation:

- Finish D1 setup on Cloudflare.
- Redeploy Pages with the `DB` binding.
- Test account creation with one real friend.
- Confirm two connected accounts can see the same room data.

- Add persistent storage for profile and files.
- Split mobile app into:
  - `src/screens`
  - `src/components`
  - `src/domain`
  - `src/storage`
  - `src/theme`
- Replace one-file screen state with proper navigation.
- Add app-safe spacing for iOS and Android.

### Priority 2: Core Product Loop

- Create Sogon File.
- Save it persistently.
- Show it in My Folder.
- Mark ready files as "openable".
- Add Unzip Confirmation.
- On confirmation, transition file to `opened`.
- Show opened file in record view.

### Priority 3: Relationship Connection

- Make account-code connection real enough for local testing.
- Define connection-backed room model:

```ts
type SogonRoom = {
  id: string;
  members: SogonProfile[];
  relationshipType: 'lover' | 'friend';
  createdAt: string;
};
```

### Priority 4: Recommendation

Start simple. Do not build AI first.

Initial recommendation rules can use:

- Food tag
- Allergy tag
- Cafe/date preference tag
- Recommendation toggle
- Sensitivity level

Recommendation output should never expose private file content directly before open.

### Priority 5: Backend

Backend has started as a small Cloudflare Pages Functions + D1 beta backend.

Do not expand it into a large custom server yet. Keep it focused on:

- Beta account login
- Account-code signup and person connection
- Room-scoped Sogon files
- Room-scoped preference DB
- Minimal future admin visibility for beta data

## UX Rules For Future Work

- Never make a screen that suggests private content is automatically revealed.
- "Open timing" and "recommendation reflection" must stay visually separate.
- Use Korean UI text by default.
- Buttons should be clear and action-oriented.
- Sensitive actions need safe secondary options:
  - 수정하고 열기
  - 다음 기념일로 미루기
  - 아직 닫아두기
- Empty states should feel warm, not like an error.
- Avoid huge marketing-style hero sections inside the app.

## Important Product Copy

Intro:

```text
소곤.zip

조용히 저장한 취향이,
우리의 시간이 되는 곳.

취향은 추천으로 풀리고,
마음은 정해둔 날에 열려요.
```

Relationship:

```text
누구와 소곤.zip을 시작할까요?

연인과 시작하기
데이트와 기념일을 더 편하게 기록해요.

친구와 시작하기
약속, 여행, 취향을 더 쉽게 맞춰요.
```

Create file:

```text
새 소곤파일 만들기

언젠가 알려주고 싶은 취향이나 마음을
조용히 저장해보세요.
```

Recommendation toggle:

```text
추천에 반영하기
상대에게 열리기 전에도, 추천에는 조심스럽게 반영돼요.
```

Unzip confirmation:

```text
오늘 열 수 있는 소곤파일이에요
상대에게 보여주기 전에 마지막으로 확인해주세요.
```

## Technical Notes For Agents

- Explain every code change by FE/ProtoWeb, FE/App, or BE.
- For current ProtoWeb work, edit `FE/ProtoWeb/`.
- For current BE work, edit `BE/functions/` and `BE/migrations/`.
- Keep root `functions/` as Cloudflare adapter files only.
- For native app work, edit `FE/App/mobile/`.
- Do not delete ProtoWeb unless the user explicitly asks.
- Use `rg` or `rg --files` for search.
- Use `apply_patch` for manual edits.
- Do not run forced audit fixes blindly. They may downgrade Expo or create breaking changes.
- Expo SDK 56 requires Node `>=20.19.4`; if local start behaves strangely, check Node first.
- Keep the BE small. Do not add paid services or heavy auth unless explicitly requested.
- Keep UI copy Korean unless asked otherwise.
- Keep visual tone soft, private, and file-archive inspired.

## Verification Commands

Web + BE (한 번에):

```bash
yarn verify   # typecheck -> P0 회귀 테스트 -> build
```

개별 실행:

```bash
yarn typecheck   # tsc --noEmit. shared/, FE/ProtoWeb/, BE/functions/를 모두 검사한다.
yarn test        # scripts/test.mjs. 파일 가시성 / 방 정원 / 열림 시점 / 비밀번호 회귀 테스트
yarn build
yarn npm audit --environment production
```

Backend:

```bash
yarn build
```

Cloudflare setup:

```text
Pages project > Settings > Bindings > Add > D1 database
Variable name: DB
Database: sogonzip-db
```

Mobile:

```bash
yarn workspace sogonzip-mobile typecheck
yarn npm audit --environment production
```

Expo start:

```bash
yarn workspace sogonzip-mobile start
```

## Current Open Questions

- Should relationship type be required before room creation?
- Should Sogon File support multiple tags or one primary tag plus secondary tags?
- Should open timing be calendar-date based or relationship-day based first?
- Should "추천에 반영하기" be disabled for highest sensitivity by default?
- How much admin visibility should the beta owner have over friends' couple rooms?
- Should beta accounts be created only by friends inside the app, or should the owner pre-create accounts?
- Should the app support both couples and friends at launch, or focus on couples first?

## Short Agent Brief

Build Sogon.zip as a Korean relationship archive app where close people save private preference files, let those files influence recommendations without revealing content, and only open files after explicit owner confirmation. Preserve the soft file/folder/zip metaphor. Current beta work is split into FE/ProtoWeb in `FE/ProtoWeb/`, FE/App in `FE/App/mobile/`, and BE in `BE/functions/` + `BE/migrations/`. For every future code change, explain which area changed and why.
