# 데이트 코스 추천 v2 — 데이터 수집과 학습 설계

초기 [`date-recommendation-v1.md`](../../archive/recommendation/date-recommendation-v1.md)는
"무엇을 추천할지"의 규칙을 정의했다.
이 문서는 그 위에 "장소 데이터를 어디서 어떻게 모으고, 점수를 어떻게 학습시킬지"를 정의한다.

전제: 백엔드는 Cloudflare Pages Functions + D1이다. 워커 런타임 안에서 모델을 학습하거나
무거운 추론을 돌릴 수 없다. **학습은 오프라인에서, 서빙은 가벼운 선형 연산으로** 한다.

---

## 1. 아키텍처: 수집과 서빙을 분리한다

요청이 들어올 때마다 여러 외부 API를 호출하는 구조는 쓰지 않는다. 이유:

- **지연**: 5개 API × 300~800ms + 조합 계산 → 3초 이상. 추천 UX가 무너진다.
- **쿼터**: 무료 티어는 일 단위 호출 한도가 있고, 사용자 수에 비례해 바로 터진다.
- **약관**: 국내 지도/검색 API는 결과의 저장·재배포에 제한 조항이 있는 경우가 많다.
  실제 연동 전 각 API 이용약관에서 캐싱 허용 범위를 반드시 확인해야 한다.
- **정보 부족**: 점수에 정말 필요한 값(가격대, 분위기, 혼잡도, 팝업 종료일)은
  대부분의 지도 API 응답에 없다. 별도 보강이 필요하다.

따라서 두 층으로 나눈다.

```text
[Ingest 층 — 배치, 하루 1~2회]
  외부 소스 → 정규화 → 중복 병합 → places 테이블 저장

[Serve 층 — 요청 시, 200ms 목표]
  D1 로컬 조회만 → 하드 필터 → 후보 생성 → 랭킹 → 코스 조합 → 이유 생성
```

Ingest는 Cloudflare Cron Trigger가 붙은 별도 Worker로 둔다.
`BE/functions/api/`는 사용자 요청만 처리하게 유지한다.

### 소스별 역할

| 소스 | 얻는 것 | 주기 | 난이도 |
|---|---|---|---|
| 카카오맵 로컬 API | 좌표, 카테고리, 주소, 고유 place id | 주 1회 (지역×카테고리 그리드) | 낮음 |
| 네이버 지역/블로그 검색 | 상호 매칭, 최근 언급량(인기·신선도 신호) | 주 1회 | 낮음 |
| 한국관광공사 TourAPI | 전시·축제·행사, 기간, 좌표 | 일 1회 | 낮음 |
| 서울 열린데이터광장 문화행사 | 전시·공연 상세 | 일 1회 | 낮음 |
| 지자체 문화포털 | 지역 이벤트 | 주 1회 | 중간 |
| 기상청 단기예보 | 실내/실외 판단 | 요청 시, 1시간 캐시 | 낮음 |
| **팝업스토어** | 최신 팝업, 기간, 위치 | 주 2~3회 | **높음 — 공개 API 없음** |

**팝업스토어가 제일 어렵고 동시에 제일 중요한 차별점이다.**
공개 API가 없어서 초기에는 운영자가 주당 20~50건을 직접 큐레이션하는 게 현실적이다.
비효율처럼 보이지만, 남들이 API 한 번으로 못 가져가는 데이터라서 그대로 해자가 된다.
크롤링을 붙일 경우 대상 사이트의 robots.txt와 이용약관을 먼저 확인하고,
SNS는 공식 API 밖의 스크래핑을 하지 않는다.

### 중복 병합

같은 장소가 카카오·네이버·TourAPI에 각각 다른 이름으로 들어온다.
`정규화 상호명 + 좌표 50m 이내`를 1차 키로 병합하고, 애매한 건 `merge_review` 큐에 쌓아
운영자가 확인한다. 처음부터 자동 병합을 100% 신뢰하면 중복 추천으로 신뢰를 잃는다.

---

## 2. 점수: "매긴다"를 두 단계로 쪼갠다

아이디어에서 "점수를 매긴다"고 한 부분은 실제로 두 개의 다른 문제다.

**(a) 후보 생성 (Recall)** — 수만 개 중 200~500개로 줄이기. 정확할 필요 없고 빨라야 한다.
지오해시 + 카테고리 + 영업 상태 + 신선도 인덱스만 쓴다. D1 인덱스 조회로 끝낸다.

**(b) 랭킹 (Ranking)** — 200~500개를 정밀 점수로 줄세우기. 여기에만 학습을 붙인다.

그 앞에 **하드 필터**가 있다. 알레르기, 영업시간, 휴관일, 종료된 이벤트, 예산 초과,
최대 이동시간 초과, 접근성 제약. 이건 절대 학습 대상이 아니고 절대 점수로 상쇄되지 않는다.
v1 문서의 원칙(LLM은 필수 조건 판정을 맡지 않는다)을 그대로 유지한다.

### 랭킹 피처

학습을 하든 안 하든, 아래 피처를 **지금부터 계산해서 로그에 남겨야** 나중에 학습이 가능하다.

```text
개인 적합도
  tag_cosine_a, tag_cosine_b        취향 태그 벡터와 장소 태그 벡터의 코사인 유사도
  category_pref_a, category_pref_b  과거 저장/방문 이력 기반 카테고리 선호
  price_fit_a, price_fit_b          가격대가 예산 안에 드는 정도
  novelty_a, novelty_b              이미 가본 곳/비슷한 곳과의 거리

커플 결합
  min_fit = min(fit_a, fit_b)
  avg_fit = (fit_a + fit_b) / 2
  fit_gap = |fit_a - fit_b|          한쪽 희생 감지용

장소 자체
  freshness       오픈일/행사 시작일로부터 경과 일수 (팝업은 이게 지배적)
  popularity      log(리뷰 수), log(최근 언급량)
  info_confidence 영업시간·가격·좌표가 얼마나 채워졌는지
  is_indoor

컨텍스트
  weekday, time_slot, weather_code, temp, season
  crowd_estimate   요일×시간대 기준 예상 혼잡도

코스 단위
  total_travel_min, category_diversity, route_efficiency
```

---

## 3. 학습 단계 — 4단계로 간다

핵심 제약: **지금 학습 데이터가 0개다.** 모델부터 만들면 학습시킬 게 없다.
그래서 L0의 진짜 목적은 "추천을 잘 하는 것"이 아니라 **"학습 데이터를 만들기 시작하는 것"**이다.

### L0 — 규칙 기반 (지금 ~ 약 1개월)

v1 문서의 가중 합산 공식을 그대로 손으로 구현한다. 가중치는 사람이 정한다.
운영자가 검수한 장소 200~500개 + 이벤트/팝업 50건으로 시작한다.

이 단계의 완료 조건은 추천 품질이 아니라 **로그 파이프라인이 돌아가는 것**이다.
(§4의 `recommendation_impressions` / `recommendation_feedback`이 채워지고 있어야 한다.)

### L1 — 오프라인 평가 파이프라인 (세션 100~1,000)

아직 학습하지 않는다. 대신:

- 지난 추천 로그를 그대로 재생(replay)해서 가중치를 바꿨을 때 순위가 어떻게 변하는지 본다.
- NDCG@5, 저장률, 제약 위반률을 계산하는 스크립트를 만든다 (`scripts/`).
- 가중치는 여전히 사람이 튜닝하되, **감이 아니라 숫자를 보고** 바꾼다.

이 단계를 건너뛰고 L2로 가면, 모델이 좋아졌는지 나빠졌는지 판단할 방법이 없다.

### L2 — 학습된 랭커 (피드백 1,000건 이상)

**로지스틱 회귀 또는 pairwise LTR을 오프라인에서 학습하고, 계수만 배포한다.**

이 스택에서 이게 최선인 이유:
- 워커에서의 추론이 `sum(w[i] * x[i])` 몇 줄이면 끝난다. 지연 무시 가능.
- 모델 배포가 JSON 파일 하나 교체다. 롤백도 쉽다.
- 피처가 20~40개 수준이라 딥러닝을 쓸 데이터가 애초에 안 모인다.

```text
학습:   Python (로컬/Colab) — scikit-learn LogisticRegression 또는 XGBoost Ranker
산출물: shared/ranker-weights.json  { "version": "2026-09-01", "weights": {...}, "bias": ... }
서빙:   BE/functions/api/recommendations/generate.ts 가 JSON을 읽어 선형 결합
```

라벨 정의:
- 긍정: 저장, 방문 표시, 만족도 4점 이상
- 부정: 노출됐지만 무시, 건너뛰기, "다시 추천하지 않기"
- 노출 로그가 없으면 부정 라벨을 만들 수 없다. 그래서 L0의 impression 로깅이 필수다.

### L3 — 개인화와 탐색 (커플당 피드백 30건 이상)

- 전역 계수 위에 커플별 보정치를 얹는다 (베이지안 업데이트 또는 커플 임베딩).
- **탐색(exploration)을 반드시 넣는다.** 매번 최고 점수만 보여주면 로그가 편향되어
  모델이 자기가 이미 아는 것만 강화한다. 상위 결과 중 1개는 불확실성이 높은 후보로
  채운다 (ε-greedy 또는 Thompson sampling).

---

## 4. 로깅 스키마 — 이게 학습 데이터 전부다

**지금 당장 만들어야 하는 것은 모델이 아니라 이 테이블들이다.**
L0에서 이걸 안 만들면 L2 시점에 학습할 데이터가 없어서 처음부터 다시 시작해야 한다.

```sql
-- 요청 상황
CREATE TABLE recommendation_requests (
  id TEXT PRIMARY KEY,
  room_id TEXT NOT NULL,
  requested_by TEXT NOT NULL,
  target_date TEXT NOT NULL,
  start_time TEXT,
  origin_area TEXT,
  transport TEXT,              -- walk | transit | car
  budget_max INTEGER,
  duration_min INTEGER,
  indoor_pref TEXT,            -- indoor | outdoor | any
  weather_snapshot TEXT,       -- 그 시점 예보 JSON. 사후 재현에 필요
  ranker_version TEXT NOT NULL,
  created_at TEXT NOT NULL
);

-- 노출된 후보 전체 (선택된 것만이 아니라 보여준 것 전부)
CREATE TABLE recommendation_impressions (
  id TEXT PRIMARY KEY,
  request_id TEXT NOT NULL,
  place_id TEXT NOT NULL,
  rank INTEGER NOT NULL,
  course_slot INTEGER,         -- 코스 내 순번. NULL이면 코스 미포함 후보
  score REAL NOT NULL,
  features_json TEXT NOT NULL, -- 그 시점 피처 값 전체. 학습의 핵심
  excluded_reason TEXT,        -- 하드 필터에 걸렸으면 그 이유
  created_at TEXT NOT NULL
);

-- 개인별 피드백 (커플 단위가 아니라 개인 단위여야 한다)
CREATE TABLE recommendation_feedback (
  id TEXT PRIMARY KEY,
  request_id TEXT NOT NULL,
  place_id TEXT NOT NULL,
  member_id TEXT NOT NULL,     -- 누가 만족했는지 알아야 min(A,B)를 학습할 수 있다
  action TEXT NOT NULL,        -- saved | skipped | visited | blocked
  rating INTEGER,              -- 1~5
  created_at TEXT NOT NULL
);
```

`features_json`을 남기는 이유: 나중에 장소 정보가 바뀌어도(팝업이 끝나도, 가격이 변해도)
**추천 당시의 피처로 학습해야** 인과가 맞는다. 재계산하면 데이터가 오염된다.

`member_id`가 피드백에 있어야 하는 이유: v1의 점수식은 `min(A 만족도, B 만족도)`를 쓴다.
커플 단위로만 피드백을 받으면 누가 만족했는지 알 수 없어서 이 항을 영원히 학습할 수 없다.

---

## 5. 소곤.zip 고유의 어려운 문제 두 가지

### (a) 프라이버시 경계

v1과 `SOGONZIP.md`의 원칙: 소곤 파일 본문은 추천 입력으로 쓰지 않는다.
학습 파이프라인에서도 동일하다. **`sogon_files.content`는 어떤 피처에도 들어가지 않는다.**
`recommendation_on = 1`이고 사용자가 동의한 태그만 `preference_signals`로 복사해 쓴다.
학습 데이터를 외부로 내보내(Colab 등) 학습할 때는 room_id/member_id를 해시로 치환한다.

### (b) 콜드 스타트

현재 `preferences`는 자유 입력이고, `RecommendationZip.tsx`는 취향 5개를 100%로 본다.
5개 미만이면 랭킹이 사실상 무작위다. 해결:

- 온보딩에 이미지 2지선다 10문항("이 카페 vs 저 카페")을 넣어 초기 태그 벡터를 확보한다.
  소곤.zip의 "취향을 모은다"는 컨셉과도 어울린다.
- 취향이 부족하면 개인화 항의 가중치를 낮추고 `freshness`, `popularity` 쪽으로 기울인다.
  (신뢰도 기반 가중치 감쇠)

---

## 6. LLM을 쓰는 곳과 안 쓰는 곳

| 쓴다 | 안 쓴다 |
|---|---|
| 자유 입력 취향 문장 → 태그 정규화 | 하드 필터 판정 (알레르기·영업시간·예산) |
| 크롤링한 팝업 설명문 → 구조화 (기간, 위치, 카테고리) | 최종 순위 결정 |
| 추천 이유 문장 생성 | 거리·시간 계산 |

태그 정규화와 구조화는 배치에서 Haiku로 돌리면 비용이 거의 안 든다.
이유 문장은 템플릿으로 시작하고, 어색할 때만 LLM으로 다듬는다.

---

## 7. 평가 지표

**오프라인** — NDCG@5, 저장률 예측 AUC
**온라인** — 코스 저장률, 실제 방문 표시율, **양쪽 모두 4점 이상 비율**(핵심 지표)
**가드레일** — 하드 필터 위반 0건, 같은 카테고리 반복률, p95 응답시간 500ms 이하

양쪽 만족률을 핵심 지표로 두는 이유: 평균 만족도만 보면 한 사람을 계속 희생시키는
추천이 좋아 보인다. 이 제품이 풀려는 문제가 정확히 그거다.

---

## 8. 다음에 할 일 (순서대로)

1. ~~`BE/migrations/0003_recommendation.sql`~~ — 작성 완료.
   `places` / `place_sources` / `place_merge_reviews` / `preference_signals` + §4의 로그 3종.
   상시 장소와 기간 한정 이벤트를 별도 테이블로 나누지 않고 `places` 하나로 합쳤다.
   노출·피드백 로그가 단일 `place_id`로 참조할 수 있어야 하기 때문이다
   (SQLite에는 다형 외래키가 없다). 기간 한정은 `starts_at` / `ends_at`으로 구분한다.
2. Ingest 워커 골격 — TourAPI + 서울 문화행사부터 (공공데이터라 약관이 가장 명확하다)
3. 운영자 큐레이션 화면 — 팝업 50건을 손으로 넣을 수 있는 최소 admin
4. `POST /api/recommendations/generate` — 하드 필터 + 규칙 점수 + impression 로깅
5. `POST /api/recommendations/:id/feedback` — 개인별 피드백
6. `scripts/eval-recommendations.mjs` — 오프라인 재생·평가
7. 데이터가 쌓이면 L2

`functions/` 아래에도 얇은 re-export 어댑터를 추가해야 Cloudflare Pages가 라우트를 인식한다.
(`functions/api/preferences/index.ts` 패턴 참고)
