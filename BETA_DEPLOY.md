# Sogon.zip Free Beta Deployment

Last updated: 2026-06-18

목표: 돈 한 푼 들이지 않고 친구 3명에게 현재 Sogon.zip 웹 프로토타입을 베타 링크로 공유한다.

## 결론

지금 단계에서는 iOS 앱 설치 배포보다 Cloudflare Pages 웹 베타가 가장 적합하다.

- 비용: 무료
- 친구 입장: 링크만 열면 테스트 가능
- 내 입장: 코드 push 후 자동 재배포 가능
- 현재 코드 상태: Vite 웹 프로토타입이 이미 `yarn build` 통과

TestFlight는 정식 iOS 베타 배포에는 좋지만 Apple Developer Program 비용이 필요하다. Expo Go 공유는 빠르게 보여주기에는 괜찮지만, 현재 완성도가 높은 화면은 `src/`의 웹 프로토타입이라 베타 테스트용으로는 웹 배포가 더 안정적이다.

## 배포 전 로컬 확인

```bash
yarn install
yarn mock:receive
yarn build
```

빌드 결과물은 `dist/` 폴더에 생성된다.

## Cloudflare Pages 설정값

Cloudflare Pages에서 GitHub 저장소를 연결할 때 아래처럼 넣는다.

```text
Framework preset: None 또는 Vite
Build command: corepack enable && yarn install --immutable && yarn build
Build output directory: dist
Root directory: /
```

`public/_redirects` 파일이 있어서 `/home` 같은 내부 페이지 주소로 직접 들어가거나 새로고침해도 `index.html`로 돌아간다.

## Step By Step

1. GitHub에 SogonZip 저장소를 만든다.

2. 로컬 프로젝트를 GitHub에 올린다.

```bash
git init
git add .
git commit -m "Prepare Sogon.zip beta"
git branch -M main
git remote add origin <GitHub 저장소 주소>
git push -u origin main
```

이미 git 저장소라면 `git init`, `remote add`는 생략하고 commit/push만 하면 된다.

3. Cloudflare에 로그인한다.

4. `Workers & Pages`로 이동한다.

5. `Create application`을 누른다.

6. `Pages`를 선택한다.

7. `Import from an existing Git repository`를 선택한다.

8. GitHub 저장소 `SogonZip`을 선택한다.

9. 빌드 설정에 아래 값을 넣는다.

```text
Build command: corepack enable && yarn install --immutable && yarn build
Build output directory: dist
```

10. `Save and Deploy`를 누른다.

11. 배포가 끝나면 `https://프로젝트이름.pages.dev` 주소가 생긴다.

12. 친구들에게 아래 정보를 보낸다.

```text
Sogon.zip 베타 테스트 링크:
https://프로젝트이름.pages.dev

테스트 계정:
ID: 김진웅
비밀번호: 1234

테스트해볼 것:
1. 로그인
2. 홈에서 소곤.zip 압축해제 흐름
3. 내 소곤.zip 만들기
4. 오늘의 추천 압축해제
5. 기록 달력
```

## 친구들에게 같이 물어볼 피드백

- 처음 봤을 때 연애/관계 앱처럼 보이는지
- `소곤.zip`, `압축해제`, `데이트 코스 추천.zip` 테마가 이해되는지
- 어디를 눌러야 할지 헷갈리는 화면이 있는지
- 직접 쓰고 싶은 기능이 있는지
- 유료 기능이 생긴다면 어떤 부분이어야 납득되는지

## 지금 베타의 한계

- 데이터는 각 친구의 브라우저 `localStorage`에만 저장된다.
- 아직 실제 회원가입, 서버 로그인, 친구 간 실시간 공유 DB는 없다.
- 친구 3명이 같은 데이터를 같이 보는 구조는 아직 아니다.
- `DB-DEMO/`는 나중에 서버 DB로 옮기기 위한 시연용 SQL이다.

## 다음 단계

1. 베타 피드백 수집
2. Supabase, Cloudflare D1, Firebase 중 하나로 원격 DB 연결
3. 실제 회원가입/로그인 추가
4. Expo 앱에 웹 프로토타입 핵심 화면 이식
5. Apple Developer Program 가입 후 TestFlight 또는 App Store 배포
