# 소곤.zip 다음 작업 지시

> 2026-08-10에 전달된 작업 인계 프롬프트를 다음 세션에서도 확인할 수 있도록 보존한다.
> 현재 우선순위와 상태는 항상 `docs/direction/`이 기준이며, 이 파일은 당시 입력 기록이다.

## 먼저 읽을 것

- `docs/direction/00-product.md` — 절대 규칙 6개
- `docs/direction/02-roadmap.md` — 우선순위 단일 소스
- `docs/direction/03-decisions.md` #18·#20·#21·#22 — 현재 방향의 근거
- `docs/direction/05-open-questions.md` Q14 — 추천 생성의 전제

## 당시 상태

- 장소 1,364건. 사람 쪽 데이터 0(취향 1건, 신호 0건, 추천 요청 0건)
- 날짜 약속 + 오늘의 질문 코드 완료(`b555ec8`), BE/`functions/` 어댑터 일치
- `0004_date_plans.sql`은 프로덕션 D1에 미적용
- 실사용 커플 0쌍, `yarn test` 86개 통과
- `feat/data-ingest`는 origin과 동기화, 저장소 정리 변경만 미커밋

## 작업 1 — 프로덕션에 0004 반영(진웅 직접)

```bash
yarn wrangler d1 execute sogonzip-db --remote --file=BE/migrations/0004_date_plans.sql
```

`ALTER TABLE ADD COLUMN`을 쓰므로 한 번만 실행한다. 적용 후 `test-dasom` / `test-wonwoo`로
약속 등록 → 상대 홈 노출 → D-7 질문 노출을 확인하고, 로드맵의 “0004 미적용”을 지운다.

## 작업 2 — closeExpired를 Cron Worker로(Codex)

`scripts/ingest/closeExpired.mjs` 수동 실행을 하루 1회 Cloudflare Cron Trigger로 옮긴다.
30일 안에 224건이 만료되므로 누락 시 죽은 장소가 조용히 추천에 남는다.

- 로드맵 9번을 앞당긴 이유를 ADR로 남긴다
- Workers 무료 플랜 CPU 10ms이므로 무거운 루프를 요청 경로에 넣지 않는다
- 성공/실패 건수를 로그로 남긴다

## 작업 3 — `POST /api/recommendations/generate`(Codex)

**Q14에 대한 진웅의 답 전에는 하드 필터를 구현하지 않는다.** `opening_hours`는 전부 비고,
음식점·카페 `price_level`도 전부 NULL이라 현재 NULL 통과 방식은 실제 필터가 아니다.
알레르기는 안전 문제이므로 답 없이 진행하지 않는다.

답 이후 구현 범위는 하드 필터 → 후보 생성 → 규칙 점수 → 코스 조합 → impression 로깅이다.
`plan_id`에 연결하고, 카카오 없이 종류 × 실내외 × 장르 × 무료 × 지역 × 기간을 쓴다.

- `excluded_reason`은 운영 집계용이며 하드 제약 탈락을 학습 부정 라벨로 쓰지 않는다
- 학습용 부정 라벨은 “보여줬는데 무시함”과 “근소 탈락”뿐이다
- `rank`·`course_slot`·`ranker_version`·`features_json`은 생성 시점에 기록한다
- 미리 뽑은 코스는 후보로 두고 가까워지면 하드 필터를 다시 실행한다
- `features_json`은 생성 시점 인과를 보존하기 위해 덮어쓰지 않는다
- 후보 생성은 지오해시 이웃 9칸을 조회한다

## 절대 지킬 것

- `sogon_files.content`는 추천 입력·LLM 프롬프트에 넣지 않는다
- 알레르기·영업시간·예산은 상쇄 불가능한 규칙 필터이며 LLM이 판정하지 않는다
- BE 엔드포인트를 추가하면 `functions/` re-export 어댑터도 추가한다
- 마이그레이션은 append-only이며 새 파일이면 `BETA_DEPLOY.md`와 `SOGONZIP.md`도 갱신한다
- CLI는 `yarn <도구>`로 실행한다
- 완료 전 `yarn verify`, 완료 후 로드맵·ADR·미결 질문을 갱신한다

## 진웅의 답이 필요한 것

1. Q14 — (1) 안 묻기, (2) 카테고리 수준 필터, (3) 입력받고 “확인 못 함” 표시
2. Q9 — 베타 계정을 직접 만들게 할지 미리 만들지
3. `00-product.md`의 “데이트 코스 앱이 아니다”와 ADR #20의 긴장 정리

## 사람이 먼저 붙어야 한다

ADR #18의 베타 오픈 조건은 작업 1로 충족된다. 추천 엔진을 기다리지 말고 2~3커플에게
먼저 연다. L0 졸업 조건은 추천 품질이 아니라 실제 impression·feedback 축적이다.
