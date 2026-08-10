
# Sogon.zip

소곤.zip은 가까운 사람과 취향, 마음, 작은 비밀을 안전하게 저장하고 정해둔 시점에 열어보는 관계 기반 아카이브 앱입니다.

프로젝트 방향과 다음 개발 우선순위는 [`docs/direction/`](./docs/direction/)이 기준입니다.
짧은 저장소 안내는 [`SOGONZIP.md`](./SOGONZIP.md)를 참고하세요.
전체 문서 분류는 [`docs/README.md`](./docs/README.md)에 정리돼 있습니다.

## Running the Code

### FE / ProtoWeb

```bash
yarn install
yarn dev
```

현재 Cloudflare Pages에 배포하는 웹 베타입니다. 소스는 `FE/ProtoWeb/`에 있습니다.

### FE / App

```bash
yarn workspace sogonzip-mobile start
```

Expo React Native 기반 실제 모바일 앱 방향입니다. 소스는 `FE/App/mobile/`에 있습니다.

### BE / Beta API

Cloudflare Pages Functions + D1 기반 베타 백엔드입니다.

```text
BE/functions/api/
BE/migrations/
functions/api/       # Pages 라우트용 re-export
```

D1 바인딩 이름은 Cloudflare Pages 프로젝트에서 `DB`로 설정합니다. Cloudflare Pages 감지를 위해 루트 `functions/`에는 `BE/functions/`를 re-export하는 얇은 어댑터가 있습니다.

### Free beta deployment

친구들에게 무료 베타 링크로 공유하는 절차는 [`BETA_DEPLOY.md`](./BETA_DEPLOY.md)를 참고하세요.

## Current Development State

- `FE/ProtoWeb/`는 Vite + React 기반 ProtoWeb 베타입니다.
- `FE/App/mobile/`은 Expo React Native 기반 실제 앱 골격입니다.
- `BE/functions/api/`는 Cloudflare Pages Functions 기반 베타 API입니다.
- `BE/migrations/`는 Cloudflare D1 DB 스키마입니다.
- ProtoWeb은 localStorage fallback을 유지하면서, 로그인 후 D1 API와 동기화합니다.
- 약속 등록과 D-7 오늘의 질문까지 구현됐습니다.
- `yarn verify`로 타입체크, 회귀 테스트, 프로덕션 빌드를 한 번에 검증합니다.
