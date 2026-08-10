# 날짜 계획과 오늘의 질문 구현

- 작업일: 2026-08-10
- 브랜치: `feat/data-ingest`
- 커밋: `b555ec8 feat: 날짜 계획과 오늘의 질문 추가`
- 변경 규모: 17개 파일, 1,019줄 추가, 13줄 삭제
- 기준 문서: `docs/archive/reviews/2026-08-10-direction-review-prompt.md`, `docs/direction/02-roadmap.md`,
  `docs/direction/03-decisions.md` #20~#22

## 1. 작업 목적

기존 소곤.zip에는 두 가지 구조 문제가 있었다.

1. 소곤파일은 개봉일까지 기다리는 동안 다시 들어올 이유가 부족했다.
2. 소곤파일과 데이트 추천이 서로 분리된 기능처럼 동작했다.
3. 추천에 사용할 구조화 취향 데이터인 `preference_signals`가 비어 있었다.

이를 해결하기 위해 로드맵의 다음 세 단계를 구현했다.

1. 날짜를 `date_plans`라는 1급 객체로 만든다.
2. 두 사람이 같은 데이트 약속을 등록하고 확인한다.
3. 약속 D-7부터 매일 오늘의 질문에 답하고, 답을 추천용 취향 신호로 저장한다.

소곤파일 본문은 날짜 계획이나 추천 신호에 연결하지 않았다. 따라서
`sogon_files.content`를 추천 입력으로 사용하지 않는 절대 규칙 2를 유지한다.

## 2. 전체 동작 흐름

```text
한 사람이 데이트 약속 등록
  → date_plans 저장
  → 같은 room_id의 상대에게도 같은 약속 노출
  → 약속 D-7~D-1에 오늘의 질문 1개 노출
  → 각자 선택지에 답변
  → preferences에 사람이 읽을 수 있는 답변 저장
  → preference_signals에 결정론적 (axis, tag, weight) 저장
  → date_question_answers에 당시 매핑을 학습 원본으로 보존
  → 이후 추천 요청이 date_plans를 plan_id로 참조
```

## 3. DB 변경

추가 파일: `BE/migrations/0004_date_plans.sql`

### 3.1 `date_plans`

데이트 약속 자체를 저장하는 테이블을 추가했다.

| 필드 | 용도 |
|---|---|
| `id` | 약속 ID |
| `room_id` | 약속을 공유하는 소곤폴더 |
| `created_by` | 약속을 만든 멤버. 계정 삭제 시 `NULL` 처리 |
| `title` | 약속 이름 |
| `scheduled_date` | 한국 시간 기준 `YYYY-MM-DD` |
| `start_time` | 선택 입력인 `HH:mm` 시간 |
| `status` | `planned`, `cancelled`, `completed` |
| `created_at`, `updated_at` | 생성·수정 시각 |

주요 제약:

- 방이 삭제되면 약속도 `ON DELETE CASCADE`로 정리된다.
- 날짜와 시간 형식을 DB `CHECK`로도 검증한다.
- 예정 약속 조회를 위해 `(room_id, status, scheduled_date)` 인덱스를 추가했다.

### 3.2 `recommendation_requests.plan_id`

기존 추천 요청 테이블에 선택적 `plan_id` 외래키를 추가했다.

- 추천 결과가 어떤 약속을 준비하기 위해 생성됐는지 추적할 수 있다.
- 약속이 삭제되어도 과거 추천 로그는 남도록 `ON DELETE SET NULL`을 사용했다.
- `plan_id` 조회 인덱스를 추가했다.

### 3.3 `date_question_answers`

오늘의 질문 답변 원본을 개인 단위로 저장한다.

| 필드 | 용도 |
|---|---|
| `plan_id` | 답변이 속한 약속 |
| `member_id` | 답한 사람 |
| `question_id`, `option_id` | 코드에 정의된 문항과 선택지 |
| `axis`, `tag`, `weight` | 답변 당시 취향 신호 스냅샷 |
| `preference_id` | 함께 만든 `preferences` 행 |
| `answered_on` | 한국 날짜 기준 답변일 |

`UNIQUE(plan_id, member_id, question_id)`로 같은 사람이 같은 약속의 같은 문항에
두 번 답하지 못하게 했다.

문항 정의가 나중에 바뀌더라도 과거 학습 데이터의 의미가 달라지지 않도록
`axis`, `tag`, `weight`를 답변 시점에 별도로 보존한다.

## 4. 오늘의 질문 도메인 규칙

추가 파일: `shared/dateQuestions.ts`

### 4.1 날짜 규칙

- 날짜 계산 기준 시간대는 `Asia/Seoul`이다.
- 질문은 D-7부터 D-1까지 총 7개다.
- D-8 이전에는 질문이 나오지 않는다.
- 약속 당일에는 새 질문을 만들지 않는다.
- 7일 안에 약속이 여러 개면 가장 가까운 약속 하나를 우선한다.
- 약속 등록의 최대 미래 기간은 아직 제한하지 않았다.
  Q15가 미결이므로 먼 약속은 저장만 하고 D-7부터 질문을 시작한다.

### 4.2 신호 매핑 방식

각 문항의 두 선택지는 같은 `(axis, tag)`를 사용하고 가중치만 `+1`, `-1`로
반대로 둔다.

예시:

```text
질문: 어느 쪽이 더 끌려요?
실내에서 편안하게 → (activity, indoor, +1)
밖에서 바람 쐬기 → (activity, indoor, -1)
```

서로 반대인 선택을 별도 양수 태그로 계속 쌓지 않고, 같은 신호 행의 최신값을
갱신하기 위한 구조다. 이전 약속에서 실내를 골랐다가 이번 약속에서 야외를 고르면
`preference_signals`의 `indoor` 가중치가 `-1`로 바뀐다.

구현한 7개 축:

1. 활동적으로 움직이기 / 천천히 둘러보기
2. 실내 / 야외
3. 전시 / 체험
4. 공연 / 대화 중심
5. 무료 선호 / 유료 특별 경험
6. 서울 동쪽 상권 / 서쪽 상권
7. 여유로운 일정 / 여러 곳을 도는 일정

알레르기와 예산 상한 같은 하드 제약은 질문에 넣지 않았다. 하드 제약은 점수로
상쇄되면 안 되고 장소 데이터로 검증할 근거도 아직 부족하기 때문이다.

## 5. 백엔드 API

### 5.1 `GET /api/date-plans`

현재 로그인한 멤버의 `room_id`에 속한 예정 약속을 조회한다.

- 오늘 이후의 `planned` 약속만 반환한다.
- 날짜, 시간, 생성일 순으로 정렬한다.
- 만든 사람의 닉네임과 `createdByMe` 여부를 함께 반환한다.
- 같은 방의 두 사람은 동일한 약속 목록을 받는다.

### 5.2 `POST /api/date-plans`

새 약속을 등록한다.

- 연결되지 않은 계정은 `409`로 거절한다.
- 제목은 필수이며 최대 40자다.
- 한국 날짜 기준 과거 날짜는 거절한다.
- 시간은 입력한 경우 `00:00~23:59` 형식만 허용한다.
- 상태는 클라이언트가 정하지 않고 서버가 `planned`로 저장한다.

### 5.3 `GET /api/date-plans/questions/today`

가장 가까운 예정 약속에 대해 오늘 답할 질문을 반환한다.

- 서버에서 한국 날짜와 D-day를 계산한다.
- 내 답변 선택지는 반환하지만 상대가 고른 선택지는 공개하지 않는다.
- 두 사람 중 몇 명이 답했는지는 `answeredCount`로 반환한다.
- 질문 기간이 아니면 `todayQuestion: null`을 반환한다.

### 5.4 `POST /api/date-plans/questions/today`

오늘의 질문 답을 저장한다.

서버가 다음 항목을 다시 검증한다.

- 요청한 계획이 현재 방의 가장 가까운 질문 대상인지
- 요청한 문항이 오늘 날짜에 해당하는 문항인지
- 선택지가 코드에 실제로 정의돼 있는지
- 이미 답한 문항인지

검증 후 D1 `batch` 하나에서 다음 세 쓰기를 함께 처리한다.

1. `preferences`에 읽을 수 있는 질문·답 문장 저장
2. `preference_signals`에 `(axis, tag, weight)` upsert
3. `date_question_answers`에 답변 스냅샷 저장

세 쓰기 중 하나만 성공하는 중간 상태가 생기지 않도록 원자적 배치로 묶었다.

### 5.5 Pages Functions 어댑터

Cloudflare Pages가 새 API 경로를 감지하도록 다음 re-export 파일도 추가했다.

- `functions/api/date-plans/index.ts`
- `functions/api/date-plans/questions/today.ts`

이 어댑터가 없으면 로컬 타입 검사는 통과해도 배포 후 API가 404가 될 수 있다.

## 6. 프론트엔드 변경

### 6.1 `DatePlansScreen.tsx`

새 `/date-plans` 화면을 추가했다.

화면 기능:

- 약속 이름, 날짜, 선택 시간을 입력해 새 약속 등록
- 다가오는 공유 약속 목록 표시
- 약속을 누가 만들었는지 표시
- 오늘의 질문과 두 개 선택지 표시
- 답변 완료 후 선택한 답과 답변 인원 표시
- 로딩, 빈 상태, API 오류, 저장 중 상태 처리

UI 문구는 모두 한국어로 작성했다.

### 6.2 홈 화면

연결된 사용자에게 `DATE PLAN` 카드를 추가했다.

- 오늘 답하지 않은 질문이 있으면 `오늘의 질문이 도착했어요` 표시
- 질문이 없으면 가장 가까운 약속 제목과 날짜·시간 표시
- 다가오는 전체 약속 개수 표시
- 카드 선택 시 `/date-plans`로 이동

따라서 한 사람이 만든 약속이 상대의 홈에도 바로 보인다.

### 6.3 프론트 데이터 계층

`sogonStore.ts`에 다음 타입과 API 함수를 추가했다.

- `DatePlan`
- `TodayDateQuestion`
- `getDatePlans()`
- `createDatePlan()`
- `getTodayDateQuestion()`
- `answerTodayDateQuestion()`

질문 답변 후 서버가 반환한 `preference`를 로컬 취향 목록에도 반영해 다음 원격
동기화 전부터 홈의 취향 개수가 맞게 보이도록 했다.

## 7. 문서 변경

### `docs/direction/02-roadmap.md`

- 로드맵 1~3번을 구현 완료로 표시했다.
- 테스트 수를 71개에서 86개로 갱신했다.
- 다음 작업을 `POST /api/recommendations/generate`로 명시했다.
- `0004`는 코드 완료지만 프로덕션 미적용 상태라고 구분했다.

### `docs/direction/03-decisions.md`

ADR #23을 추가했다.

- 답변을 최신 이진 취향 신호로 저장하는 이유
- 과거 답변 매핑을 스냅샷으로 남기는 이유
- 한 문항의 답 수정을 허용하지 않은 이유
- Q15의 최대 등록 기간을 아직 강제하지 않은 이유
- 약속이 겹치면 가장 가까운 하나만 질문하는 이유

### `docs/direction/05-open-questions.md`

Q15에 현재 구현 상태를 추가했다. 질문 기간은 확정했지만 약속 등록 최대 4주 제한은
아직 결정하지 않았으므로 질문 자체는 닫지 않았다.

### 배포 문서

- `BETA_DEPLOY.md`에 `0004` 적용 명령과 1회 실행 주의를 추가했다.
- `SOGONZIP.md`의 마이그레이션 목록을 `0001~0004`로 갱신했다.
- `0003.preference_signals`가 오늘의 질문 API에서 사용된다는 점을 반영했다.

## 8. 테스트와 검증

`scripts/test.mjs`에 15개 회귀 테스트를 추가해 전체 테스트가 71개에서 86개로 늘었다.

추가한 주요 검증:

- D-7과 D-1의 문항 매핑
- D-8과 약속 당일에는 질문이 없는지
- 윤년 날짜 차이
- 잘못된 날짜 거절
- UTC와 한국 날짜 경계
- 두 선택지가 같은 axis/tag와 반대 부호를 쓰는지
- 방의 두 사람에게 같은 약속이 조회되는지
- 같은 사람이 같은 문항에 중복 답변할 수 없는지
- 두 사람 답변이 개인 단위로 남는지
- 추천 요청이 `plan_id`를 참조하는지
- 질문 답 테이블에 소곤파일 본문 경로가 없는지

최종 실행 결과:

```text
yarn verify
  typecheck: 통과
  test: 86 passed, 0 failed
  production build: 통과
```

브라우저에서는 비로그인 상태로 `/date-plans`에 직접 접근했을 때 `/login`으로 이동하는
인증 가드와 콘솔 오류가 없음을 확인했다. 로컬 D1 로그인 데이터가 없어서 실제 계정으로
새 화면 내부를 끝까지 조작하는 브라우저 검증은 진행하지 않았다.

## 9. 배포 전 남은 작업

이번 작업에서는 프로덕션 D1 마이그레이션과 배포를 실행하지 않았다.

프로덕션 배포 전 다음 명령을 한 번 실행해야 한다.

```bash
yarn wrangler d1 execute sogonzip-db --remote --file=BE/migrations/0004_date_plans.sql
```

주의 사항:

- `0004`는 `ALTER TABLE recommendation_requests ADD COLUMN`을 포함하므로 두 번 실행하면
  실패한다.
- 현재 프리뷰 D1은 사용하지 않는다는 ADR #12에 따라 `0004`를 적용하지 않는다.
- 나중에 프리뷰 환경을 다시 켤 때 누락된 `0004`부터 적용해야 한다.
- 마이그레이션 적용 후 실제 테스트 커플 두 계정으로 약속 공유와 각자 질문 답변을
  확인하는 것이 다음 운영 검증이다.

## 10. 다음 개발 순서

로드맵상 다음 작업은 `POST /api/recommendations/generate`다.

필수 흐름:

1. `plan_id`가 현재 방의 약속인지 검증
2. 알레르기·예산·영업시간·이동시간 하드 필터
3. 지오해시 이웃 9칸 후보 조회
4. 두 사람의 `preference_signals`로 규칙 점수 계산
5. 코스 조합
6. `recommendation_requests`와 `recommendation_impressions` 로깅
7. 미리 만든 코스의 장소 상태를 약속일 가까이에 다시 검증

Q14에 따라 검증할 데이터가 없는 알레르기·영업시간·예산을 필터링되는 것처럼
표현해서는 안 된다.
