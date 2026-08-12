# Sogon.zip Free Beta Deployment

Last updated: 2026-08-11

목표: 돈 한 푼 들이지 않고 친구 3명에게 현재 Sogon.zip 웹 프로토타입을 베타 링크로 공유한다.

## 결론

지금 단계에서는 iOS 앱 설치 배포보다 Cloudflare Pages 웹 베타가 가장 적합하다.

- 비용: 무료
- 친구 입장: 링크만 열면 테스트 가능
- 내 입장: 코드 push 후 자동 재배포 가능
- 현재 코드 상태: Vite 웹 프로토타입이 이미 `yarn build` 통과

TestFlight는 정식 iOS 베타 배포에는 좋지만 Apple Developer Program 비용이 필요하다. Expo Go 공유는 빠르게 보여주기에는 괜찮지만, 현재 완성도가 높은 화면은 `FE/ProtoWeb/`의 웹 프로토타입이라 베타 테스트용으로는 웹 배포가 더 안정적이다.

## 배포 전 로컬 확인

```bash
yarn install
yarn verify   # typecheck + P0 회귀 테스트 + build
```

빌드 결과물은 `dist/` 폴더에 생성된다.

## D1 마이그레이션 (배포 전 필수)

wrangler는 프로젝트 devDependency다. **전역 설치하지 않는다.** `yarn install`을 했으면
이미 있고, `yarn wrangler`로 실행한다. 버전이 `package.json`에 고정돼 있어야
사람과 에이전트가 같은 명령을 써도 같은 결과가 나온다.

```bash
yarn install                 # wrangler 포함
yarn wrangler login          # 최초 1회. 브라우저가 열린다
```

그 다음 D1 데이터베이스에 아래 순서로 한 번씩 실행한다.

```bash
yarn wrangler d1 execute sogonzip-db --remote --file=BE/migrations/0001_beta_schema.sql
yarn wrangler d1 execute sogonzip-db --remote --file=BE/migrations/0002_security_and_scheduling.sql
yarn wrangler d1 execute sogonzip-db --remote --file=BE/migrations/0003_recommendation.sql
yarn wrangler d1 execute sogonzip-db --remote --file=BE/migrations/0004_date_plans.sql
yarn wrangler d1 execute sogonzip-db --remote --file=BE/migrations/0005_date_plan_window.sql
yarn wrangler d1 execute sogonzip-db --remote --file=BE/migrations/0006_core_preference_answers.sql
yarn wrangler d1 execute sogonzip-db --remote --file=BE/migrations/0007_date_plan_course_pattern.sql
```

`--remote`를 빼면 로컬 임시 DB에 적용된다. 프로덕션에 반영하려면 반드시 붙인다.

`0005`는 2026-08-11에 프로덕션에 적용했다. 앞으로 컬럼을 추가하는 마이그레이션은
**항상 코드보다 먼저** 넣는다. 순서를 바꾸면 새 컬럼을 SELECT/INSERT하는 API가
통째로 500이 난다.

`0006`은 홈의 핵심 취향 20문항 답변을 저장한다. 핵심 취향 API와 실제 코스 코드를
배포하기 전에 반드시 먼저 적용한다. 2026-08-12 프로덕션에 적용했다.

`0007`은 사용자가 새 약속에서 직접 고른 데이트 흐름 순서를 저장한다. 해당 UI와 API를
배포하기 전에 먼저 적용한다.

`0003`의 `preference_signals`는 오늘의 질문 답을 저장할 때 사용한다. 따라서 `0004`와
날짜 API를 배포하기 전에 반드시 먼저 적용돼 있어야 한다. 추천 로그 테이블을 쓰는
추천 생성 API는 아직 없다. 설계 배경은
`docs/reference/recommendation/date-recommendation-v2-ai.md` 참고.

`0002`·`0004`·`0005`·`0007`은 `ALTER TABLE ... ADD COLUMN`을 쓰기 때문에 **두 번 실행하면 실패한다.** 한 번만 실행한다.

`0002` 적용 후 기존 로그인 세션은 모두 무효가 된다. 이미 가입한 친구가 있다면
다시 로그인해달라고 알려준다. 비밀번호는 그대로 쓸 수 있고, 로그인하는 순간
서버가 자동으로 최신 해싱으로 옮긴다.

## 만료 장소 Cron Worker

Pages 배포와 별도로, 끝난 장소를 매일 닫는 Worker를 배포한다. 설정의 Cron은 UTC 기준이며
`5 18 * * *`는 한국 시간 03:05다.

```bash
yarn wrangler deploy --config workers/close-expired/wrangler.jsonc
```

Worker 이름은 `sogonzip-close-expired`이고 프로덕션 `sogonzip-db`만 바인딩한다.
배포 후 Cloudflare 대시보드의 Cron Events와 Workers Logs에서
`close_expired_completed` / `close_expired_failed`를 확인한다. 실시간 로그가 필요하면:

```bash
yarn wrangler tail sogonzip-close-expired --format json
```

Cron 장애 때만 아래 수동 명령을 복구 수단으로 쓴다. 같은 조건의 `active` 행만 닫으므로
Worker와 겹쳐 실행돼도 결과는 멱등적이다.

```bash
yarn node scripts/ingest/closeExpired.mjs --apply
```

## Cloudflare Pages 설정값

Cloudflare Pages에서 GitHub 저장소를 연결할 때 아래처럼 넣는다.

```text
Framework preset: None 또는 Vite
Build command: corepack enable && yarn install --immutable && yarn build
Build output directory: dist
Root directory: /
```

`FE/ProtoWeb/public/_redirects` 파일이 있어서 `/home` 같은 내부 페이지 주소로 직접 들어가거나 새로고침해도 `index.html`로 돌아간다.

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

12. ⚠️ **도메인이 정해진 직후 딱 한 번** 루트 `index.html`의 링크 미리보기 주소를
    절대 URL로 바꾼다. 상대 경로(`/og-image.png`)도 카카오톡에서는 대체로 동작하지만,
    크롤러에 따라 썸네일이 안 뜬다. 카톡으로 퍼뜨릴 서비스라면 여기서 확실히 해두는 게 낫다.

```html
<!-- index.html - 프로젝트이름 자리를 실제 주소로 -->
<meta property="og:url" content="https://프로젝트이름.pages.dev/" />
<meta property="og:image" content="https://프로젝트이름.pages.dev/og-image.png" />
<meta name="twitter:image" content="https://프로젝트이름.pages.dev/og-image.png" />
```

    바꾼 뒤 카카오 [디버거](https://developers.kakao.com/tool/debugger/sharing)에서
    `초기화`를 눌러야 캐시된 옛 미리보기가 갱신된다.

13. 친구들에게 아래 정보를 보낸다.

```text
Sogon.zip 베타 테스트 링크:
https://프로젝트이름.pages.dev

테스트해볼 것:
1. 회원가입 (비밀번호 8자 이상)
2. 내 계정 코드 확인하기
3. 상대의 계정 코드로 내 사람 찾기
4. 연결 요청 보내기 -> 상대가 수락하기
5. 내 소곤.zip 만들기 ('직접 날짜 선택'으로 날짜도 골라보기)
6. 열릴 날짜가 지난 파일이 '열 준비됨' 탭으로 올라오는지
7. 기록 달력
8. 소곤.zip 지우기
9. MY 화면에서 로그아웃 / 연결 해제 / 회원 탈퇴
```

## 연결 동작 확인 (중요)

친구 3명으로 아래를 꼭 확인한다.

- A가 B에게 요청 -> B가 수락해야만 연결된다. B가 수락하기 전에는 서로의 소곤파일이 보이지 않는다.
- A와 B가 연결된 뒤, C가 A의 계정 코드로 요청하면 "이미 다른 사람과 연결되어 있어요"로 막혀야 한다.
- A가 아직 열지 않은 소곤파일은 B의 화면 어디에도 나타나지 않아야 한다.

## 친구들에게 같이 물어볼 피드백

- 처음 봤을 때 연애/관계 앱처럼 보이는지
- `소곤.zip`, `압축해제`, `데이트 코스 추천.zip` 테마가 이해되는지
- 어디를 눌러야 할지 헷갈리는 화면이 있는지
- 직접 쓰고 싶은 기능이 있는지
- 유료 기능이 생긴다면 어떤 부분이어야 납득되는지

## 지금 베타의 한계

- 이메일 인증과 비밀번호 재설정이 없다. 비밀번호를 잊으면 복구할 방법이 없다.
- 연결 해제와 탈퇴는 즉시 삭제라 되돌릴 수 없고, 내보내기 기능도 아직 없다.
- 세션은 30일이면 만료된다(쓰는 동안에는 자동 연장).
- 실제 장소 코스는 두 사람이 핵심 취향 20문항을 모두 마친 뒤 열린다. 알레르기·가격은
  판정 데이터가 없어 아직 추천 필터에 포함하지 않는다.
- 알림이 없어서, 소곤파일이 열릴 날이 와도 앱을 직접 열어야 알 수 있다.

## 배포 후 꼭 확인할 것

`/api/*`가 실제로 Functions로 라우팅되는지 먼저 확인한다.

```bash
curl -i https://프로젝트이름.pages.dev/api/auth/me
```

`content-type: application/json`과 401이 나와야 정상이다. `text/html`이 나오면
Functions가 붙지 않았다는 뜻이고(SPA fallback이 index.html을 돌려준 것), 루트
`functions/` 어댑터나 D1 바인딩을 다시 확인해야 한다.

## 다음 단계

1. 베타 피드백 수집
2. 규칙 기반 추천 v1
4. Expo 앱에 웹 프로토타입 핵심 화면 이식
5. Apple Developer Program 가입 후 TestFlight 또는 App Store 배포
