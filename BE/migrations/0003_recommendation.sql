-- 0003: 데이트 코스 추천 기반 스키마
--
-- 설계 배경은 docs/date-recommendation-v2-ai.md 를 참고한다.
--
-- 1) places / place_sources : 배치로 수집·병합한 추천 대상
-- 2) preference_signals     : 자유 입력 취향을 구조화한 학습용 신호
-- 3) recommendation_*       : 요청 / 노출 / 피드백 로그 = 학습 데이터 전부
--
-- 이 파일은 한 번만 실행한다.
--   yarn wrangler d1 execute sogonzip-db --remote --file=BE/migrations/0003_recommendation.sql

-- 1) 추천 대상 --------------------------------------------------------------
-- 맛집·카페·전시·팝업·액티비티를 한 테이블에 담는다.
-- 상시 장소와 기간 한정 이벤트를 나누지 않는 이유는, 노출·피드백 로그가
-- 단일 place_id로 참조할 수 있어야 하기 때문이다. 기간 한정은 starts_at/ends_at으로
-- 구분하고, 상시 장소는 두 값이 NULL이다.
CREATE TABLE IF NOT EXISTS places (
  id TEXT PRIMARY KEY,
  kind TEXT NOT NULL,                  -- restaurant | cafe | exhibition | popup | activity | park
  name TEXT NOT NULL,
  -- 공백·괄호·지점명을 제거한 상호. 좌표와 함께 중복 병합 1차 키로 쓴다.
  name_normalized TEXT NOT NULL,
  address TEXT,
  lat REAL NOT NULL,
  lng REAL NOT NULL,
  -- 후보 생성(recall)용 격자. 5자리는 약 5km 셀이며 ingest 워커에서 계산해 넣는다.
  geohash5 TEXT NOT NULL,
  area_code TEXT,                      -- 성수, 연남 같은 상권 코드
  price_level INTEGER,                 -- 1~4. NULL이면 미상이며 예산 하드 필터에서 제외하지 않는다.
  is_indoor INTEGER,                   -- 1 | 0 | NULL(미상). 날씨 대응에 쓴다.
  tags_json TEXT NOT NULL DEFAULT '[]',
  opening_hours_json TEXT,             -- NULL이면 영업시간 하드 필터를 적용할 수 없다.
  starts_at TEXT,                      -- 기간 한정만 채운다. NULL이면 상시.
  ends_at TEXT,
  opened_at TEXT,                      -- 신선도(freshness) 계산 기준일
  popularity REAL,                     -- log 스케일로 정규화한 리뷰 수·언급량
  -- 좌표·영업시간·가격·태그가 얼마나 채워졌는지를 0~1로 요약한 값.
  -- 점수식의 "장소 정보 신뢰도" 항에 그대로 들어간다.
  info_confidence REAL NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active', -- active | closed | hidden | pending_review
  curated_by TEXT,                     -- 운영자가 직접 넣은 경우 members.id
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (curated_by) REFERENCES members(id) ON DELETE SET NULL
);

-- 후보 생성 경로: 지역 격자 + 종류로 좁힌 뒤 랭킹으로 넘긴다.
CREATE INDEX IF NOT EXISTS idx_places_recall
  ON places(status, geohash5, kind);

-- 기간이 끝난 팝업·전시를 배치로 닫기 위한 인덱스.
CREATE INDEX IF NOT EXISTS idx_places_ends_at
  ON places(status, ends_at)
  WHERE ends_at IS NOT NULL;

-- 중복 병합 후보를 찾을 때 쓴다(정규화 상호 + 같은 격자).
CREATE INDEX IF NOT EXISTS idx_places_dedupe
  ON places(name_normalized, geohash5);

-- 어느 외부 소스에서 왔는지. 같은 장소가 카카오·네이버·TourAPI에 각각 들어오므로
-- places 1건에 place_sources N건이 붙는다.
CREATE TABLE IF NOT EXISTS place_sources (
  id TEXT PRIMARY KEY,
  place_id TEXT NOT NULL,
  source TEXT NOT NULL,                -- kakao | naver | tourapi | seoul_culture | manual
  external_id TEXT NOT NULL,
  raw_json TEXT,                       -- 원본 응답. 파싱 규칙을 고쳤을 때 재처리에 쓴다.
  fetched_at TEXT NOT NULL,
  FOREIGN KEY (place_id) REFERENCES places(id) ON DELETE CASCADE
);

-- ingest 재실행이 중복 행을 만들지 않게 하는 멱등 키.
CREATE UNIQUE INDEX IF NOT EXISTS idx_place_sources_external
  ON place_sources(source, external_id);

CREATE INDEX IF NOT EXISTS idx_place_sources_place
  ON place_sources(place_id);

-- 자동 병합을 확신할 수 없는 쌍은 큐에 쌓고 운영자가 판단한다.
-- 처음부터 자동 병합을 100% 신뢰하면 중복 추천으로 신뢰를 잃는다.
CREATE TABLE IF NOT EXISTS place_merge_reviews (
  id TEXT PRIMARY KEY,
  place_id TEXT NOT NULL,
  candidate_place_id TEXT NOT NULL,
  similarity REAL NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending', -- pending | merged | rejected
  created_at TEXT NOT NULL,
  resolved_at TEXT,
  FOREIGN KEY (place_id) REFERENCES places(id) ON DELETE CASCADE,
  FOREIGN KEY (candidate_place_id) REFERENCES places(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_place_merge_reviews_pending
  ON place_merge_reviews(status, created_at);

-- 2) 구조화된 취향 ----------------------------------------------------------
-- preferences(자유 입력)는 그대로 두고, 규칙 기반 추출과 LLM 태그 제안 결과를
-- 여기에 쌓는다.
--
-- 프라이버시 경계: sogon_files.content 는 어떤 경로로도 이 테이블에 들어오지 않는다.
-- 사용자가 동의한 취향 입력에서만 생성한다.
CREATE TABLE IF NOT EXISTS preference_signals (
  id TEXT PRIMARY KEY,
  room_id TEXT NOT NULL,
  member_id TEXT NOT NULL,
  axis TEXT NOT NULL,                  -- food | activity | mood | budget | travel | time | gift
  tag TEXT NOT NULL,
  weight REAL NOT NULL DEFAULT 1,      -- -1 ~ 1. 음수는 비선호.
  -- 1이면 알레르기·절대 비선호처럼 점수로 상쇄할 수 없는 조건이다.
  -- 랭킹이 아니라 하드 필터 단계에서만 쓴다.
  is_hard_constraint INTEGER NOT NULL DEFAULT 0,
  source TEXT NOT NULL,                -- manual | extracted | onboarding | feedback
  source_preference_id TEXT,           -- preferences.id
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE,
  FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE CASCADE,
  FOREIGN KEY (source_preference_id) REFERENCES preferences(id) ON DELETE SET NULL
);

-- 같은 사람의 같은 축·태그는 한 행으로 유지하고 weight만 갱신한다.
CREATE UNIQUE INDEX IF NOT EXISTS idx_preference_signals_unique
  ON preference_signals(member_id, axis, tag);

CREATE INDEX IF NOT EXISTS idx_preference_signals_room
  ON preference_signals(room_id);

-- 하드 필터는 매 요청마다 먼저 조회되므로 별도 인덱스를 둔다.
CREATE INDEX IF NOT EXISTS idx_preference_signals_hard
  ON preference_signals(room_id, is_hard_constraint)
  WHERE is_hard_constraint = 1;

-- 3) 추천 로그 --------------------------------------------------------------
-- 아래 세 테이블이 학습 데이터의 전부다. L0(규칙 기반) 단계부터 채워야
-- 나중에 랭커를 학습할 수 있다.

CREATE TABLE IF NOT EXISTS recommendation_requests (
  id TEXT PRIMARY KEY,
  room_id TEXT NOT NULL,
  requested_by TEXT NOT NULL,
  target_date TEXT NOT NULL,
  start_time TEXT,
  origin_area TEXT,
  origin_lat REAL,
  origin_lng REAL,
  transport TEXT,                      -- walk | transit | car
  budget_max INTEGER,
  duration_min INTEGER,
  indoor_pref TEXT,                    -- indoor | outdoor | any
  -- 요청 시점 예보 스냅샷. 나중에 다시 조회하면 그날 날씨를 재현할 수 없으므로
  -- 오프라인 재생·평가를 위해 그대로 저장한다.
  weather_snapshot TEXT,
  -- 어떤 가중치로 만든 결과인지. 랭커를 바꾼 뒤 성능 비교의 기준이 된다.
  ranker_version TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE,
  FOREIGN KEY (requested_by) REFERENCES members(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_recommendation_requests_room
  ON recommendation_requests(room_id, created_at);

-- 선택된 코스만이 아니라 사용자에게 보여준 후보 전체를 남긴다.
-- 노출 로그가 없으면 "보여줬는데 무시했다"는 부정 라벨을 만들 수 없다.
CREATE TABLE IF NOT EXISTS recommendation_impressions (
  id TEXT PRIMARY KEY,
  request_id TEXT NOT NULL,
  place_id TEXT NOT NULL,
  rank INTEGER NOT NULL,
  course_slot INTEGER,                 -- 코스 내 순번. NULL이면 코스에 들지 못한 후보.
  score REAL NOT NULL,
  -- 추천 당시의 피처 값 전체. 팝업이 끝나거나 가격이 바뀐 뒤 재계산하면
  -- 인과가 깨지므로 반드시 이 시점 값을 그대로 저장한다.
  features_json TEXT NOT NULL,
  excluded_reason TEXT,                -- 하드 필터에 걸린 경우 그 사유
  created_at TEXT NOT NULL,
  FOREIGN KEY (request_id) REFERENCES recommendation_requests(id) ON DELETE CASCADE,
  -- places는 소프트 삭제(status='closed')만 하므로 CASCADE를 걸지 않는다.
  -- 장소가 사라졌다고 학습 데이터가 같이 지워지면 안 된다.
  FOREIGN KEY (place_id) REFERENCES places(id)
);

CREATE INDEX IF NOT EXISTS idx_recommendation_impressions_request
  ON recommendation_impressions(request_id, rank);

CREATE INDEX IF NOT EXISTS idx_recommendation_impressions_place
  ON recommendation_impressions(place_id, created_at);

-- 피드백은 커플 단위가 아니라 개인 단위로 받는다.
-- 점수식의 min(A 만족도, B 만족도) 항은 누가 만족했는지 모르면 학습할 수 없다.
CREATE TABLE IF NOT EXISTS recommendation_feedback (
  id TEXT PRIMARY KEY,
  request_id TEXT NOT NULL,
  place_id TEXT NOT NULL,
  member_id TEXT NOT NULL,
  action TEXT NOT NULL,                -- saved | skipped | visited | blocked
  rating INTEGER,                      -- 1~5
  created_at TEXT NOT NULL,
  FOREIGN KEY (request_id) REFERENCES recommendation_requests(id) ON DELETE CASCADE,
  FOREIGN KEY (place_id) REFERENCES places(id),
  FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE CASCADE
);

-- 같은 사람이 같은 추천의 같은 장소에 같은 행동을 두 번 남기지 않게 한다.
CREATE UNIQUE INDEX IF NOT EXISTS idx_recommendation_feedback_unique
  ON recommendation_feedback(request_id, place_id, member_id, action);

CREATE INDEX IF NOT EXISTS idx_recommendation_feedback_request
  ON recommendation_feedback(request_id);

-- "다시 추천하지 않기"는 이후 모든 요청의 하드 필터에서 조회되므로
-- blocked만 따로 인덱싱한다.
CREATE INDEX IF NOT EXISTS idx_recommendation_feedback_blocked
  ON recommendation_feedback(member_id, place_id)
  WHERE action = 'blocked';
