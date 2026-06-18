# Sogon.zip Project Context

Last updated: 2026-06-05

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

## Key User Flow

1. Intro
   사용자는 Sogon.zip의 정체성을 본다.

2. Relationship selection
   연인 또는 친구와 시작할 관계 유형을 고른다.

3. Create or join room
   닉네임을 입력하고 소곤방을 만들거나 초대코드로 들어간다.

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
  roomCode?: string;
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
  package.json
  src/
    app/
      App.tsx
      components/
      lib/sogonStore.ts
    styles/
  apps/
    mobile/
      app.json
      package.json
      index.ts
      src/App.tsx
```

## Current Technical State

There are two app surfaces right now.

### 1. Web Prototype

Location:

```text
src/
```

Stack:

- Vite
- React
- React Router
- Tailwind CSS style classes
- shadcn/Radix-style UI files from Figma export

Purpose:

- Existing Figma-derived prototype
- Useful as visual and flow reference
- Some local state is connected through `localStorage`

Important files:

- `src/app/App.tsx`: web routes
- `src/app/components/CreateSogonFile.tsx`: web file creation screen
- `src/app/components/MySogonFolder.tsx`: web folder/list screen
- `src/app/components/HomeScreen.tsx`: web home screen
- `src/app/lib/sogonStore.ts`: web localStorage helper

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
- npm audit was previously clean after updating `react-router`; use `yarn npm audit --environment production` for Yarn-based audit checks.

### 2. Mobile App

Location:

```text
apps/mobile/
```

Stack:

- Expo SDK 56
- React Native 0.85.3
- React 19.2.3
- TypeScript
- `@expo/vector-icons`

Purpose:

- This is the real app direction.
- New development should generally happen here first.
- The web prototype can remain as reference unless explicitly asked to remove it.

Important files:

- `apps/mobile/src/App.tsx`: current native MVP in one file
- `apps/mobile/app.json`: Expo app config
- `apps/mobile/package.json`: mobile scripts and dependencies

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
- Real invite code joining
- Backend
- Push notifications
- Calendar storage
- Edit file
- Open/unzip confirmation state transition
- Reaction flow
- Recommendation engine

## Recommended Development Direction

The project should move toward a real mobile app, not a web-only product.

Recommended near-term direction:

1. Keep web prototype as reference.
2. Continue native development in `apps/mobile`.
3. Split `apps/mobile/src/App.tsx` into screens, components, and domain modules once the next feature lands.
4. Add persistent local storage with `@react-native-async-storage/async-storage`.
5. Add proper navigation with Expo Router or React Navigation.
6. Add a backend only after the local product loop feels correct.

## Next Development Priorities

### Priority 1: Native App Foundation

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

### Priority 3: Relationship Room

- Make invite code join flow real enough for local testing.
- Define room model:

```ts
type SogonRoom = {
  id: string;
  inviteCode: string;
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

Only after native local loop is solid.

Possible backend choices:

- Supabase: fastest for auth, database, realtime
- Firebase: good mobile fit and notifications
- Custom backend: later, if product complexity requires it

Do not prematurely build backend before the core UX is validated.

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

- Prefer editing `apps/mobile` for new app work.
- Do not delete the web prototype unless the user explicitly asks.
- Use `rg` or `rg --files` for search.
- Use `apply_patch` for manual edits.
- Do not run forced audit fixes blindly. They may downgrade Expo or create breaking changes.
- Expo SDK 56 requires Node `>=20.19.4`; if local start behaves strangely, check Node first.
- Avoid introducing backend or auth before the local product loop is complete.
- Keep UI copy Korean unless asked otherwise.
- Keep visual tone soft, private, and file-archive inspired.

## Verification Commands

Web:

```bash
yarn build
yarn npm audit --environment production
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
- Should the first backend be Supabase or Firebase?
- Should the app support both couples and friends at launch, or focus on couples first?

## Short Agent Brief

Build Sogon.zip as a real Expo React Native mobile app. It is a Korean relationship archive app where close people save private preference files, let those files influence recommendations without revealing content, and only open files after explicit owner confirmation. Preserve the soft file/folder/zip metaphor. Continue development in `apps/mobile`; keep the web prototype as reference.
