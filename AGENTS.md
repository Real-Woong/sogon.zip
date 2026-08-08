# 에이전트 안내 (Codex · Claude 공통)

**작업을 시작하기 전에 [`docs/direction/`](./docs/direction/)을 읽는다.**
방향성·우선순위·작업 규칙은 전부 거기에 있고, 이 파일은 입구일 뿐이다.

## 최소한 이것만은

| 항목 | 내용 |
|---|---|
| 무엇을 만드나 | 소곤.zip — 가까운 사람과 취향·비밀을 저장하고 정해둔 시점에 여는 관계 아카이브 |
| 지금 트랙 | 데이트 추천 L0 (규칙 기반 + 학습 데이터 수집). [`02-roadmap.md`](./docs/direction/02-roadmap.md) |
| 검증 | `yarn verify` (typecheck + test + build). 끝났다고 말하기 전에 반드시 |
| UI 언어 | 한국어 |

## 절대 규칙 (요약 — 전문은 [`00-product.md`](./docs/direction/00-product.md))

1. 열지 않은 소곤파일 본문은 상대에게 절대 보이지 않는다
2. `sogon_files.content`는 추천 입력·LLM 프롬프트에 들어가지 않는다
3. 열림은 항상 명시적이다. 날짜가 됐다고 자동 공개되지 않는다
4. 소곤폴더 정원은 2명. 상대 동의 없이 합류 불가
5. 알레르기·영업시간·예산은 **필터**다. 점수로 상쇄되지 않고 LLM이 판정하지 않는다
6. 운영자도 남의 소곤파일 본문은 못 본다

**이 규칙을 건드리는 변경은 테스트를 고치는 게 아니라, 멈추고 물어본다.**

## 자주 놓치는 것

- BE에 엔드포인트를 추가하면 `functions/`에 re-export 어댑터도 추가한다.
  빠뜨리면 타입체크는 통과하고 배포 후 404가 난다.
- CLI 도구는 `yarn <도구>`로 부른다 (`yarn wrangler d1 execute ...`).
  전역 설치나 `npx` / `yarn dlx`를 안내하지 않는다. 문서에 명령을 적기 전에
  그 도구가 `package.json`에 있는지 확인한다.
- 마이그레이션은 append-only. 실행된 파일을 고치지 말고 새 번호를 만든다.
  만들었으면 `BETA_DEPLOY.md`와 `SOGONZIP.md`의 목록도 갱신한다.
- `members.room_id`에 `ON DELETE CASCADE`가 있다. 방을 먼저 지우면 계정이 함께 사라진다.
- 후보 생성은 지오해시 이웃 9칸을 조회한다. 한 칸만 보면 경계 건너편이 통째로 빠진다.
- Workers 무료 플랜은 요청당 CPU 10ms다. 무거운 연산을 요청 경로에 넣지 않는다.

## 작업이 끝나면

- [`02-roadmap.md`](./docs/direction/02-roadmap.md) 상태 갱신
- 설계 판단을 했으면 [`03-decisions.md`](./docs/direction/03-decisions.md)에 결정·이유·포기한 것 추가
- 막힌 질문은 [`05-open-questions.md`](./docs/direction/05-open-questions.md)에 추가

**대화에만 남은 결정은 없는 것과 같다.** 다른 에이전트는 그 대화를 볼 수 없다.
