
# Sogon.zip

소곤.zip은 가까운 사람과 취향, 마음, 작은 비밀을 안전하게 저장하고 정해둔 시점에 열어보는 관계 기반 아카이브 앱입니다.

프로젝트 방향, 현재 상태, 다음 개발 우선순위는 [`SOGONZIP.md`](./SOGONZIP.md)를 먼저 읽어주세요.

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
BE/migrations/0001_beta_schema.sql
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
- `yarn build`로 프로덕션 빌드가 성공하는 상태입니다.
