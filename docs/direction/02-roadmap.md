# 로드맵 — 지금 어디, 다음 무엇

> **우선순위의 단일 소스다.** `SOGONZIP.md`의 Priority 절과 어긋나면 이 파일이 이긴다.
> 작업을 끝낸 사람이 그 자리에서 갱신한다. 최종 갱신: 2026-08-09

## 지금 상태

| 영역 | 상태 |
|---|---|
| 웹 베타 (ProtoWeb) | 배포 중. 로그인·연결·소곤파일·취향 입력 동작 |
| D1 백엔드 | auth / people / files / preferences 동작 |
| 마이그레이션 | 0001, 0002, 0003 모두 적용됨 (프로덕션 · 프리뷰 양쪽) |
| D1 | 프로덕션 `sogonzip-db`만 쓴다. **프리뷰 환경은 당분간 안 쓴다** (`03-decisions.md` #12)<br>→ 프리뷰 배포에서 API가 500인 건 정상이다. 검증은 프로덕션에서 한다 |
| 계정 | `sozonzipadmin`(admin) + `test-dasom` / `test-wonwoo`(커플 테스트용 한 쌍). **진웅 개인 계정 없음**<br>프리뷰 DB에는 `sozonzipadmin`만 있다 |
| 네이티브 앱 | 골격만. `src/App.tsx` 한 파일 |
| 장소 데이터 | **403건** (서울 문화행사, `area_code` 9개 상권). 맛집·카페 0건 |
| 추천 | 설계 완료, UI 껍데기만. 실제 추천 로직 없음 |
| 테스트 | `yarn test` 60개 통과 |

## 현재 트랙: 추천 L0 (규칙 기반)

**이 단계의 목표는 추천 품질이 아니라 학습 데이터를 모으기 시작하는 것이다.**
지금 학습 데이터가 0개라서, 로그 파이프라인이 먼저 돌아야 나중에 모델을 만들 수 있다.

### 완료

- [x] `0003_recommendation.sql` — places / place_sources / place_merge_reviews /
      preference_signals + 로그 3종
- [x] `shared/placeNormalize.ts` — 상호 정규화, 지오해시(이웃 9셀), 하버사인, 정보 신뢰도
- [x] `POST|GET /api/admin/places`, `GET|PATCH|DELETE /api/admin/places/:id` — 운영자 큐레이션
- [x] `GET /api/admin/merge-reviews`, `POST /api/admin/merge-reviews/:id` — 중복 검토
- [x] 회귀 테스트 (병합 키, 격자 경계, 신뢰도, 로그 보존, 프라이버시 경계)
- [x] `0003` 프로덕션 D1 적용 (22 쿼리 = 테이블 7 + 인덱스 15)
- [x] 운영자 계정 `sozonzipadmin` 생성. 베타 계정 정리(다솜·원우만 남김)
- [x] `feat/recommendation-foundation` 브랜치 커밋 · 푸시 · PR #1
- [x] 프리뷰 배포에서 `/api/admin/*`가 404가 아니라 401 — `functions/` 어댑터 라우팅 확인됨
- [x] 프리뷰용 D1을 만들어뒀지만 **연결하지 않기로 함** (`03-decisions.md` #12)

- [x] PR #1 머지 + 프로덕션 검증 — 로그인 200 / 등록 201 / 중복 409 / 삭제 후 `closed`
- [x] 데이터 전략 확정 — Q1·Q4 닫음 (`03-decisions.md` #13)

### 다음 (순서대로)

**지금 하는 것: 데이터 수집.** 장소가 0건이면 그 뒤 작업이 전부 허공이다.

- [x] 서울 열린데이터광장 키 발급 (`.dev.vars`) + `scripts/ingest/` 수집기
- [x] **서울 문화행사 403건 프로덕션 적재.** 두 번 돌려도 404 그대로(멱등성 확인)

1. **TourAPI 키 발급 + 수집기** — 공공데이터포털. 반영에 1시간쯤 걸리니 먼저 신청한다.
   서울 문화행사는 **공연·전시 위주라 코스의 앵커밖에 안 된다.** 사이를 채울
   맛집·카페가 없으면 코스가 안 만들어진다.
2. **카카오 로컬 수집기** — 맛집·카페. 상권 9곳 × 카테고리로 훑는다.
   여기가 실제로 건수가 나오는 소스다.
3. **끝난 행사 정리** — 매일 돌릴 것. `ends_at < now`면 `status='closed'`.
   지금은 수집 때 안 들어올 뿐, 이미 들어온 게 끝나면 그대로 남는다.
2. **운영자 큐레이션 화면** — 지금은 API만 있어서 curl로만 넣을 수 있다.
   팝업 50건을 손으로 넣으려면 화면이 필요하다. ProtoWeb에 `/admin/places` 최소 폼.
3. **취향 구조화** — `preferences`(자유 텍스트) → `preference_signals`(axis × tag × weight).
   규칙 기반 키워드 추출 먼저. 애매한 문장만 LLM 태그 제안.
4. **`POST /api/recommendations/generate`** — 하드 필터 → 후보 생성 → 규칙 점수 → 코스 조합
   → **impression 로깅**. 로깅이 이 엔드포인트의 절반이다.
5. **`POST /api/recommendations/:id/feedback`** — 개인 단위. 저장/건너뛰기/방문/만족도.
6. **추천 화면 연결** — `RecommendationZip.tsx`가 실제 API를 부르게 한다.
7. **배치 수집 워커** — TourAPI + 서울 문화행사부터. 공공데이터라 약관이 가장 명확하다.

### L0 졸업 조건

추천이 잘 되는 게 아니라, **`recommendation_impressions`와 `recommendation_feedback`이
실제로 쌓이고 있는 것.** 세션 100개가 모이면 L1(오프라인 평가)로 넘어간다.

## 병행 트랙: 웹 베타 안정화

추천과 무관하게 계속 굴러야 하는 것들.

- [ ] 선택 파일 열기 플로우 마무리
- [ ] 빈 상태 화면 개선
- [ ] 친구 한 명과 실제 2인 연결 테스트

## 나중에 (지금 하지 않는다)

- 네이티브 앱 본격 개발 — 웹 베타 피드백으로 플로우를 확정한 뒤
- `FE/App/mobile/src/App.tsx` 분리 — 다음 네이티브 기능이 실제로 들어올 때
- L2 학습 랭커 — 피드백 1,000건 이후
- 커플별 개인화(L3) — 커플당 30건 이후
- 백엔드를 큰 서버로 확장 — Pages Functions로 버틸 때까지 버틴다

**"나중에" 항목을 앞당기고 싶으면 먼저 `05-open-questions.md`에 이유를 적고 진웅에게 묻는다.**
