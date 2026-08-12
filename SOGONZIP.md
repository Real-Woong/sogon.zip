# Sogon.zip Project Context

> 이 파일은 저장소의 짧은 안내판이다. 제품 방향과 우선순위의 원문은
> [`docs/direction/`](./docs/direction/)에 있다. 충돌하면 `docs/direction/`이 이긴다.

## 제품 한 줄

소곤.zip은 가까운 한 사람과 취향·마음·작은 비밀을 안전하게 저장하고,
정해둔 시점에 명시적으로 열어보는 관계 기반 아카이브다.

## 작업 전 읽을 것

0. [`HANDOFF.md`](./HANDOFF.md) — 2026-08-11 시점 스냅샷과 다음 작업 (있는 동안만)
1. [`docs/direction/00-product.md`](./docs/direction/00-product.md) — 제품 정체성과 절대 규칙
2. [`docs/direction/02-roadmap.md`](./docs/direction/02-roadmap.md) — 현재 상태와 다음 작업
3. [`docs/direction/04-working-agreement.md`](./docs/direction/04-working-agreement.md) — 검증·작업 규칙

설계를 바꿀 때는 [`03-decisions.md`](./docs/direction/03-decisions.md), 막힌 질문은
[`05-open-questions.md`](./docs/direction/05-open-questions.md)를 확인한다.

## 현재 개발 트랙

데이트 추천 L0 단계다. **하루짜리 코스**를 만드는 쪽으로 방향이 잡혔다
(`03-decisions.md` #27) — "12:00~21:00"을 받아 시간표를 짠다.

```text
날짜 계획·오늘의 질문 (완료)
  → 하루 코스 시간 골격 (완료, 장소는 아직 안 채움)
  → 영업시간 수집  ← 지금 최대 블로커. 1,364건 전부 NULL이다
  → 슬롯 채우기 + 노출 로깅
  → 개인별 피드백
  → 두 사람 공유 반응
```

정확한 진행 상태는 항상 [`02-roadmap.md`](./docs/direction/02-roadmap.md)가 기준이다.

## 저장소 구조

```text
FE/ProtoWeb/       현재 Cloudflare Pages에 배포하는 Vite + React 웹 베타
FE/App/mobile/     보류 중인 Expo 앱 골격
BE/functions/      Pages Functions 실제 구현
BE/migrations/     D1 append-only 마이그레이션
functions/         BE 엔드포인트의 얇은 Pages re-export 어댑터
shared/            FE·BE 공용 순수 도메인 규칙
scripts/           회귀 테스트와 장소 수집 스크립트
workers/           Pages 요청 경로와 분리한 Cron/배치 Worker
docs/direction/        현재 방향·우선순위·결정의 단일 소스
docs/reference/        현재 구현의 상세 참고 설계
docs/development-log/  완료한 기능별 상세 작업 기록
docs/archive/          현재 작업에 쓰지 않는 과거 자료
```

## 필수 검증

```bash
yarn verify
```

`typecheck → test → build`를 모두 실행한다. 끝났다고 말하기 전에 반드시 통과해야 한다.

## D1 마이그레이션

프로덕션에는 번호 순서대로 한 번씩 적용한다.

```text
BE/migrations/0001_beta_schema.sql
BE/migrations/0002_security_and_scheduling.sql
BE/migrations/0003_recommendation.sql
BE/migrations/0004_date_plans.sql
BE/migrations/0005_date_plan_window.sql
BE/migrations/0006_core_preference_answers.sql
BE/migrations/0007_date_plan_course_pattern.sql
```

실행 명령과 주의 사항은 [`BETA_DEPLOY.md`](./BETA_DEPLOY.md)를 따른다.
마이그레이션은 append-only이며 이미 실행한 파일을 수정하지 않는다.

## 구현 규칙 요약

- UI 문구는 한국어다.
- 소곤파일 본문은 추천 입력이나 LLM 프롬프트에 넣지 않는다.
- 날짜가 되어도 자동 공개하지 않는다. `ready`만 되고 작성자가 명시적으로 연다.
- 소곤폴더 정원은 2명이고 상대 동의 없이 합류할 수 없다.
- 알레르기·영업시간·예산·이동시간은 점수가 아니라 규칙 기반 필터다.
- 운영자도 다른 사람의 소곤파일 본문을 볼 수 없다.
- BE 엔드포인트를 추가하면 같은 경로의 `functions/` 어댑터를 반드시 추가한다.
- CLI 도구는 전역 설치나 `npx` 대신 `yarn <도구>`로 실행한다.
- 끝난 장소는 `sogonzip-close-expired` Cron Worker가 매일 자동으로 닫는다.

## 상세 참고 문서

- [`docs/reference/recommendation/date-recommendation-v2-ai.md`](./docs/reference/recommendation/date-recommendation-v2-ai.md) — 추천·로깅 상세 설계
- [`docs/reference/data/date-course-data-strategy.md`](./docs/reference/data/date-course-data-strategy.md) — 장소 데이터 전략
- [`BETA_DEPLOY.md`](./BETA_DEPLOY.md) — 배포와 운영 확인 절차
- [`docs/development-log/`](./docs/development-log/) — 기능별 개발 기록

2026-07 이전의 긴 제품 컨텍스트와 초안은
[`docs/archive/product/`](./docs/archive/product/)에 보존했다.
