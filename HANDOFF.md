# 인수인계 — 2026-08-11

> 이 파일은 **한 시점의 스냅샷**이다. 방향·우선순위의 단일 소스는 여전히
> [`docs/direction/`](./docs/direction/)이고, 충돌하면 그쪽이 이긴다.
> 작업을 진행하면서 이 파일을 갱신하지 말고, `02-roadmap.md`를 갱신한다.
> 다음 작업자가 이 파일을 다 읽었으면 지워도 된다.

## 0. 30초 요약

**하루 코스의 시간 골격은 완성됐고, 슬롯에 넣을 장소가 없다.**
"12:00~21:00"을 넣으면 시간표가 나온다. 그 칸에 실제 가게를 넣으려면
**영업시간**이 필요한데 1,365건 전부 NULL이다. 그게 지금 유일한 진짜 블로커다.

바로 할 일은 딱 두 개다.

1. **PR #3 머지 + 프로덕션 확인** — 코드는 다 됐고 배포만 남았다
2. **영업시간 수집** — `--sample 5`로 응답 키를 눈으로 보는 것부터

---

## 1. 지금 어디까지 됐나

### 프로덕션 D1 (`sogonzip-db`) 실측

| 항목 | 값 |
|---|---|
| 마이그레이션 | `0001`~`0005` 전부 적용 완료 |
| 장소 | **1,365건** (TourAPI 961 + 서울 문화행사 403 + 수동 1) |
| └ kind | 음식점 458 · 활동 543 · 전시 223 · 카페 108 · **공원 33** |
| └ 분류 패싯 | 1,339건 (98%) |
| └ **영업시간** | **0건** — 1,365건 전부 NULL ⚠️ |
| └ 가격 | 364건. 음식점 0/458 · 카페 1/108 · 활동 268/543 · 전시 95/223 |
| 약속 | 1건 |
| 취향 신호 | 1건 |
| 추천 요청 | 0건 |
| 계정 | 3 (`sozonzipadmin` · `test-dasom` · `test-wonwoo`) |

**실사용 커플은 0쌍이다.** L0의 졸업 조건은 추천 품질이 아니라
`recommendation_impressions`가 쌓이는 것인데, 아직 파이프라인 자체가 없다.

### 코드

| | 상태 |
|---|---|
| 브랜치 | `feat/day-course-and-place-facets` (`87703fe`), 푸시됨 |
| PR | [#3](https://github.com/Real-Woong/sogon.zip/pull/3) → `main`, **머지 전** |
| 테스트 | `yarn verify` 165개 통과 |
| `main` | PR #3의 내용이 아직 없다 |

**스키마가 코드보다 앞서 있다.** `0005`는 이미 적용됐으므로 머지해도 안전하다.
반대 순서였으면 `/api/date-plans`가 통째로 500이었다.

---

## 2. 먼저 읽을 것

작업 시작 전에 이 순서로 읽는다. 전부 한국어다.

1. [`CLAUDE.md`](./CLAUDE.md) — 절대 규칙 6개와 자주 놓치는 함정
2. [`docs/direction/00-product.md`](./docs/direction/00-product.md) — 제품 정체성
   (**이 파일은 진웅만 고친다.** 에이전트는 읽기만)
3. [`docs/direction/02-roadmap.md`](./docs/direction/02-roadmap.md) — 우선순위의 단일 소스
4. [`docs/direction/03-decisions.md`](./docs/direction/03-decisions.md) — 특히 **#26·#27·#28**
5. [`docs/direction/05-open-questions.md`](./docs/direction/05-open-questions.md) — 막힌 질문

오늘 한 일의 상세는 개발 로그 두 편에 있다.

- [`2026-08-11-day-course-skeleton.md`](./docs/development-log/2026-08-11-day-course-skeleton.md)
- [`2026-08-11-place-facets.md`](./docs/development-log/2026-08-11-place-facets.md)

### 특히 조심할 것 (실제로 당한 것들)

- **BE에 엔드포인트를 추가하면 `functions/`에 re-export 어댑터도 만든다.**
  빠뜨리면 타입체크는 통과하고 배포 후 404가 난다
- **마이그레이션은 append-only.** `ALTER TABLE ... ADD COLUMN`은 두 번 돌리면
  반드시 실패한다. 실행한 파일을 고치지 말고 새 번호를 만든다
- **`members.room_id`에 `ON DELETE CASCADE`가 있다.** 방을 먼저 지우면
  계정이 함께 사라진다
- **CLI는 `yarn <도구>`로 부른다.** `npx` / `yarn dlx` / 전역 설치를 쓰지 않는다
- **`.dev.vars`의 키 값을 터미널이나 대화에 절대 찍지 않는다.**
  `scripts/ingest/env.mjs`를 거치면 안전하다
- **Workers 무료 플랜은 요청당 CPU 10ms다.** 무거운 연산은 Cron Worker로 뺀다
- **후보 생성은 지오해시 이웃 9칸을 본다.** 한 칸만 보면 경계 건너편이 통째로 빠진다

---

## 3. 다음 작업 — 순서대로

### ① PR #3 머지하고 프로덕션에서 확인 (30분)

코드는 다 됐다. 머지 후 **프로덕션에서** 확인한다 —
프리뷰는 D1이 안 붙어 있어서 API가 500이 나는 게 정상이다 (`03-decisions.md` #12).

```bash
curl -i https://<도메인>/api/date-plans     # 401이어야 정상. text/html이면 어댑터 문제
```

화면에서 볼 것:

1. 약속 화면에 12:00~21:00을 넣으면 **저장 전에** 시간표 미리보기가 뜨는가
2. 저장한 약속 카드의 `<details>`를 펼치면 시간표가 남아 있는가
3. 동네·1인 예산 입력이 보이는가

---

### ② 영업시간 수집 — **여기가 최대 블로커** (이틀)

**1,365건 전부 NULL이다.** "12시에 밥"을 정하려면 12시에 문 연 곳을 알아야 한다.
이게 없으면 슬롯을 채우는 순간 문 닫은 가게로 사람을 보낸다.

수집기(`scripts/ingest/tourApiDetail.mjs`)는 만들어져 있고 **한 번도 안 돌렸다**
(`place_sources`에 `source='tourapi_detail'` 행이 0개다).

#### 첫 스텝 — 반드시 이것부터

```bash
yarn node scripts/ingest/tourApiDetail.mjs --sample 5
```

5건만 부르고 **실제 응답 키를 그대로 찍는다.** 문서보다 실제 응답이 정확하고,
detailIntro2는 **콘텐츠 타입마다 필드 이름이 다르다**
(`usetime`, `opentimefood`, `usetimeculture` …). 그래서 수집기가 이름을
하드코딩하지 않고 패턴으로 훑는다:

```js
const HOUR_KEY   = /^(usetime|opentime|playtime)/i;
const CLOSED_KEY = /^(restdate|restday)/i;
```

샘플 결과를 보고 이 두 정규식을 실제 필드명에 맞춘 뒤 본 수집을 돌린다.

#### 본 수집

```bash
yarn node scripts/ingest/tourApiDetail.mjs              # 분석만
yarn node scripts/ingest/tourApiDetail.mjs --apply      # 실제 저장 (기본 900건)
```

- **개발계정은 하루 1000건**이라 이틀에 나눠 돌린다
- **재개는 자동이다.** detail 행이 이미 있으면 건너뛴다
- **원본 응답을 통째로 저장한다.** 파싱을 고쳐도 API를 다시 안 부른다

#### 파싱 규칙 — 건드리기 전에 읽을 것

`shared/openingHours.ts`의 `isOpenDuring`은 `'open' | 'closed' | **'unknown'**`
셋을 돌려준다. **모름을 열림으로 접으면 안 된다.** 접으면 문 닫은 가게로 사람을
보내고, 닫힘으로 접으면 후보가 0개가 된다. 둘 다 틀렸다.

같은 이유로 `"평일 09:00~18:00, 주말 10:00~17:00"`은 **읽지 않고** 원문만 남긴다.
평일 시간을 주말에 적용하면 일요일에 닫힌 가게를 열려 있다고 말하게 된다.
**이 3상태를 2상태로 접는 변경은 하지 말고 진웅에게 물어본다.**

#### 커버리지가 나쁘면

TourAPI가 영업시간을 얼마나 채워주는지 **먼저 재고** 판단한다.
대안은 카카오 로컬인데 유료라 보류 중이다 (`03-decisions.md` #22).
수치를 들고 진웅에게 물어보는 게 순서다.

---

### ③ 슬롯 채우기 (로드맵 8번)

골격의 빈 칸에 후보를 넣는다. **②가 끝나기 전에는 시작하지 않는다.**

```
하드 필터 → 점수 → 빔서치
```

- **하드 필터는 점수로 상쇄되지 않는다** (절대 규칙 5).
  영업시간·알레르기·예산은 필터이고 LLM이 판정하지 않는다
- **요청 경로가 아니라 Cron Worker에서 돌린다.** Workers 무료 플랜은 요청당
  CPU 10ms다. 그리고 아침에 코스가 도착해 있는 쪽이 스피너보다 낫다
- **예산 필터는 반쪽이다.** 음식점 `price_level`이 0/458이라 식사는 못 거른다.
  활동(268/543)·전시(95/223)만 거를 수 있다. **못 거르는 슬롯에서 거르는 척을
  하지 않는다** — 거른 것처럼 보이면 사용자가 예산을 믿어버린다
- **패싯으로 다양성을 준다.** `genre:`가 같은 슬롯을 연속으로 넣지 않는다.
  하루에 박물관 두 곳은 코스가 아니다
- **`audience:kids`는 감점 신호다.** 어린이 문화행사는 두 사람의 하루가 아니다

#### 로깅이 이 작업의 절반이다

`rank` · `course_slot` · `ranker_version` · `features_json`은 **생성 시점에만
알 수 있다.** 나중에 소급이 안 되므로 처음부터 정직하게 남긴다.

`excluded_reason` 행은 **운영용 집계로만** 남긴다. 하드 제약은 학습 대상이
아니라서 탈락 행을 다 적으면 로그가 학습에 못 쓰는 행으로 덮인다.
학습에 쓰는 부정 라벨은 "보여줬는데 무시함"과 "근소 탈락"이다.

---

### ④ 그다음

`02-roadmap.md`의 9~13번을 따른다. 9번(`/api/recommendations/generate`)은
**Q14 답변 대기 중**이라 답 없이 하드 필터를 구현하지 않는다.

---

## 4. 진웅이 결정해야 하는 것

이게 안 풀리면 막히는 것들이다. **에이전트가 대신 정하지 않는다.**

| | 무엇 | 왜 막히나 |
|---|---|---|
| **Q14** | 알레르기를 "거르기"에서 "결정 순간까지 들고 가는 경고"로 다시 잡을지 | 답 없이는 로드맵 9번을 시작하지 않는다. 하루 코스가 되면서 무게가 커졌다 |
| **Q18** | 영화 API. 상영시간표는 공개 API가 없다는 게 결론 | 박스오피스로 "새로 나온 영화" 목록만 붙일지 판단 필요 |
| **Q19** | 팝업스토어 데이터가 **0건**이다 | 캐릭터/IP 매칭에 대상이 없다. 손으로 넣을지 |
| **Q20** | 서비스 시간대 08:00~23:00이 **임시 가정**이다 | 영업시간이 채워지면 하드 필터가 대신한다 |
| — | **날씨 API 선정** | `HourlyWeather`(시각·강수확률·기온) 형태로만 맞춰주면 골격은 이미 붙을 준비가 됐다 |
| — | **`00-product.md` 문구 수정** | "데이트 코스 앱이 아니다" 절이 #20·#27과 긴장이 있다. 제안 초안이 로드맵에 있다. **그 파일은 진웅만 고친다** |

---

## 5. 어디에 무엇이 있나

```text
shared/                  FE·BE 공용 순수 도메인 규칙 — 여기 있으면 테스트가 부른다
  dateCourseSkeleton.ts    시간 창 → 슬롯. 장소는 안 채운다
  openingHours.ts          isOpenDuring: open/closed/unknown 3상태
  placeFacets.ts           분류 → 통제된 어휘. kindFromTourApi도 여기 있다
  areas.ts                 서울 9개 상권 (코드·라벨만. 좌표는 ingest 쪽)
  placeNormalize.ts        상호 정규화, 지오해시, 하버사인

BE/functions/api/        Pages Functions 실제 구현
functions/               얇은 re-export 어댑터 — 빠뜨리면 배포 후 404
BE/migrations/           append-only. 0001~0005 전부 적용됨

scripts/
  test.mjs                 회귀 테스트 165개. 프레임워크 없음
  ingest/
    tourApi.mjs              TourAPI 장소 목록 (961건)
    tourApiDetail.mjs        영업시간 ← 아직 안 돌림
    tourCategoryCodes.mjs    분류 코드표 받기
    tourCategories.json      받아둔 코드표 140종 (커밋됨)
    backfillCategories.mjs   패싯 백필 (API 0회, 멱등)
    seoulCulture.mjs         서울 문화행사 (403건) — 주 1회
    renormalize.mjs          병합 키 재계산
    closeExpired.mjs         Cron 장애 시 수동 복구용
    env.mjs                  .dev.vars 읽기. 키를 절대 안 찍는다

workers/close-expired/   끝난 장소를 매일 03:05(KST)에 닫는 Cron Worker
FE/ProtoWeb/             배포 중인 Vite + React 웹 베타
FE/App/mobile/           보류 중인 Expo 골격
```

### API 소스

| 소스 | 키 | 엔드포인트 |
|---|---|---|
| 한국관광공사 (공공데이터포털) | `DATA_GO_KR_KEY` | `apis.data.go.kr/B551011/KorService2` |
| 서울 열린데이터광장 | `SEOUL_OPEN_API_KEY` | `openapi.seoul.go.kr:8088` |
| 카카오 로컬 | `KAKAO_REST_KEY` | **보류** (유료, #22) |

TourAPI 함정 두 개. 둘 다 증상이 403/400이라 원인이 안 보인다.

1. **KorService1은 폐지됐다.** KorService2를 쓴다
2. **포털이 주는 키는 이미 URL 인코딩된 상태다.** 그대로 넣으면 이중 인코딩돼서
   403이 난다. `decodeURIComponent`를 한 번 거쳐야 한다

---

## 6. 정기 작업

| 언제 | 명령 |
|---|---|
| 주 1회 | `yarn node scripts/ingest/seoulCulture.mjs --apply` |
| `normalizePlaceName`을 고칠 때마다 | `yarn node scripts/ingest/renormalize.mjs --apply` |
| `placeFacets.ts` 매핑을 고칠 때마다 | `yarn node scripts/ingest/backfillCategories.mjs --apply` |
| 새 `cat3` 코드가 나타나면 | `yarn node scripts/ingest/tourCategoryCodes.mjs --apply` |
| Cron 장애 시에만 | `yarn node scripts/ingest/closeExpired.mjs --apply` |

**수집기를 고칠 때 반드시 확인할 것:** 두 수집기 모두 `ON CONFLICT`로
`tags_json`과 `kind`를 통째로 덮어쓴다. `seoulCulture.mjs`는 주 1회 도는
정기 작업이라, 수집기가 패싯을 안 만들면 **다음 주에 백필이 통째로 날아간다.**
회귀 테스트가 이걸 잡는다 (`[패싯] 수집기를 다시 돌려도 패싯이 날아가지 않는다`).

---

## 7. 오늘 배운 것 — 다음 사람에게

**전수 검사가 아니면 시간표 버그를 못 잡는다.**
손으로 확인한 6개 케이스는 전부 멀쩡했는데, 모든 시간 창을 훑으니
2,046개 중 **481개**가 깨져 있었다. 원인이 셋이나 달랐다.

**순수 로직을 수집기 안에 두면 회귀 테스트가 못 잡는다.**
공원 26곳이 `kind='activity'`로 들어가 있던 버그가 오래 산 이유가 정확히 이거다.
수집 스크립트는 네트워크와 키가 있어야 돌지만 `shared/`는 테스트가 그냥 부른다.
**판단 로직은 `shared/`에 둔다.**

**백필을 만들 때 수집기도 같이 본다.**
백필만 하면 다음 수집 때 되돌아간다.

**모름을 아무 쪽으로도 접지 않는다.**
영업시간의 `unknown`, 요금의 "빈 값", 분류의 "매핑 없음" 전부 같은 규칙이다.
접으면 그 자리에서는 편한데, 사용자에게 거짓말을 하게 된다.

**대화에만 남은 결정은 없는 것과 같다.**
다른 에이전트는 그 대화를 볼 수 없다. 설계 판단을 했으면
`03-decisions.md`에 결정·이유·**포기한 것**을 적는다.
