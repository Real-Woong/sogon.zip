# 구조 — 어디에 무슨 코드를 넣는가

## 디렉터리

```text
shared/                       FE·BE가 함께 쓰는 순수 도메인 로직 (외부 의존 없음)
  sogonOpening.ts               열림 시점 규칙
  placeNormalize.ts             장소 정규화·지오해시·거리·정보 신뢰도

BE/functions/api/             Cloudflare Pages Functions (실제 구현)
  _shared.ts                    인증·세션·비밀번호·공용 헬퍼
  auth/ people/ files/ preferences/
  admin/places/                 운영자 장소 큐레이션
  admin/merge-reviews/          중복 병합 검토

functions/api/                BE/를 re-export하는 얇은 어댑터 (Pages 라우트 감지용)

BE/migrations/                D1 스키마. 번호 순서대로 한 번씩 실행한다.

FE/ProtoWeb/                  Vite + React 웹 베타 (현재 배포 대상)
FE/App/mobile/                Expo React Native (다음 단계)

scripts/test.mjs              P0 회귀 테스트. 프레임워크 없이 node로 돈다.
docs/direction/               지금 읽고 있는 이 폴더
```

## 규칙

### `shared/`에는 순수 함수만

`fetch`, D1, `localStorage`, React를 import하지 않는다. Workers 런타임과 node 테스트
양쪽에서 그대로 돌아야 한다. `scripts/test.mjs`가 esbuild로 번들해서 직접 부른다.

여기 두는 기준: **FE와 BE가 다르게 구현하면 조용히 깨지는 규칙.**
열림 시점 라벨(`sogonOpening.ts`)이 그랬고, 장소 병합 키(`placeNormalize.ts`)가 그렇다.

### `functions/`는 절대 로직을 갖지 않는다

한 줄 re-export만 있다. Cloudflare Pages가 `functions/` 아래 파일 경로로 라우트를
잡기 때문에 존재하는 어댑터다. **BE에 새 엔드포인트를 만들면 여기에도 반드시 추가한다.**
빠뜨리면 로컬 타입체크는 통과하고 배포 후 404가 난다.

```ts
// functions/api/admin/places/index.ts
export { onRequestGet, onRequestPost } from '../../../../BE/functions/api/admin/places/index';
```

### CLI 도구는 devDependency로 고정하고 `yarn <도구>`로 부른다

`wrangler`는 `package.json`에 있다. **전역 설치나 `npx` / `yarn dlx`를 안내하지 않는다.**

전역 설치는 사람마다 버전이 다르고, `dlx`는 실행할 때마다 최신을 받아와서
"어제 되던 명령이 오늘 안 되는" 상황이 생긴다. 문서에 적힌 명령이 그대로 동작하지 않으면
사람과 에이전트가 매번 환경을 디버깅하게 된다.

```bash
yarn wrangler d1 execute sogonzip-db --remote --file=BE/migrations/0003_recommendation.sql
```

**문서에 명령을 적을 때는 그 도구가 `package.json`에 있는지 먼저 확인한다.**
(실제로 `BETA_DEPLOY.md`가 설치되지도 않은 `wrangler`를 안내하고 있었다. `03-decisions.md` #11)

### 마이그레이션은 append-only

- 이미 실행한 파일을 고치지 않는다. 새 번호를 만든다.
- `ALTER TABLE ADD COLUMN`이 든 파일은 재실행하면 실패한다. 파일 상단에 그렇게 적어둔다.
- 새 마이그레이션을 만들면 `BETA_DEPLOY.md`와 `SOGONZIP.md`의 실행 목록에도 추가한다.

### 삭제는 기본적으로 소프트 삭제

`places`는 `status='closed'`로만 닫는다. `recommendation_impressions`가 참조하고 있고
그게 학습 데이터라서, 물리 삭제하면 과거 추천 기록의 참조가 깨진다.

`members.room_id`에 `ON DELETE CASCADE`가 걸려 있다는 점을 기억한다. **방을 먼저 지우면
그 방의 계정이 함께 삭제된다.** 방 해체는 멤버를 먼저 떼어낸 뒤에 한다 (`dissolveRoom` 순서).

## 백엔드 제약

Cloudflare Workers 무료 플랜은 **요청당 CPU 10ms**다. 이게 여러 설계를 결정했다.

- PBKDF2를 100k가 아니라 50k로 잡았다. 반복 횟수를 `password_algo`에 저장해서 나중에 올릴 수 있다.
- 추천 랭킹에 무거운 모델을 못 쓴다. 학습은 오프라인, 서빙은 선형 결합이다.
- 요청 중에 외부 API를 여러 개 호출하지 않는다. 수집은 배치로 분리한다.

## 추천 시스템 구조

상세는 [`../reference/recommendation/date-recommendation-v2-ai.md`](../reference/recommendation/date-recommendation-v2-ai.md). 핵심만:

```text
[수집 — 배치, 하루 1~2회]  외부 API → 정규화 → 중복 병합 → places
[서빙 — 요청 시, 200ms]    D1만 조회 → 하드 필터 → 후보 생성 → 랭킹 → 코스 → 이유
```

**둘을 섞지 않는다.** 요청 경로에서 외부 API를 부르면 지연·쿼터·약관 문제가 한꺼번에 온다.

## 데이터 흐름 한 장

```text
사용자 취향 입력
  → preferences (자유 텍스트, 기존)
  → preference_signals (구조화, axis × tag × weight)   ← 추천이 읽는 건 이쪽뿐

소곤파일 본문 ──✕──> 추천                (절대 규칙 2)

외부 API + 운영자 큐레이션
  → places / place_sources
  → (중복 의심) place_merge_reviews → 사람이 판단

추천 요청
  → recommendation_requests   (상황 + ranker_version + 날씨 스냅샷)
  → recommendation_impressions (보여준 후보 전부 + 그 시점 features_json)
  → recommendation_feedback    (개인 단위. member_id 필수)
       ↑ 이 셋이 학습 데이터의 전부다
```
