
# Sogon.zip

소곤.zip은 가까운 사람과 취향, 마음, 작은 비밀을 안전하게 저장하고 정해둔 시점에 열어보는 관계 기반 아카이브 앱입니다.

프로젝트 방향, 현재 상태, 다음 개발 우선순위는 [`SOGONZIP.md`](./SOGONZIP.md)를 먼저 읽어주세요.

## Running the Code

### Web prototype

```bash
yarn install
yarn dev
```

### Free beta deployment

친구들에게 무료 베타 링크로 공유하는 절차는 [`BETA_DEPLOY.md`](./BETA_DEPLOY.md)를 참고하세요.

### Mobile app

```bash
yarn workspace sogonzip-mobile start
```

## Current Development State

- Vite + React 기반 모바일 앱 프로토타입입니다.
- Expo React Native 기반 실제 앱 골격을 `apps/mobile`에 추가했습니다.
- 소곤방 닉네임과 생성한 소곤파일은 브라우저 `localStorage`에 저장됩니다.
- `yarn build`로 프로덕션 빌드가 성공하는 상태입니다.
