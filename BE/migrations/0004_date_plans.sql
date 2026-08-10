-- 0004: 날짜 계획 + 오늘의 질문
--
-- 날짜를 소곤파일과 추천 사이의 1급 객체로 둔다. 소곤파일 본문은 이 스키마와
-- 연결하지 않는다. 오늘의 질문 답은 사용자가 명시적으로 고른 취향만 저장한다.
--
-- ALTER TABLE ... ADD COLUMN은 SQLite에서 IF NOT EXISTS를 지원하지 않는다.
-- 이 파일은 한 번만 실행한다.
--   yarn wrangler d1 execute sogonzip-db --remote --file=BE/migrations/0004_date_plans.sql

CREATE TABLE date_plans (
  id TEXT PRIMARY KEY,
  room_id TEXT NOT NULL,
  created_by TEXT,
  title TEXT NOT NULL,
  scheduled_date TEXT NOT NULL,         -- Asia/Seoul 기준 YYYY-MM-DD
  start_time TEXT,                      -- HH:mm. 정하지 않았으면 NULL
  status TEXT NOT NULL DEFAULT 'planned', -- planned | cancelled | completed
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE,
  FOREIGN KEY (created_by) REFERENCES members(id) ON DELETE SET NULL,
  CHECK (scheduled_date GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'),
  CHECK (
    start_time IS NULL OR (
      start_time GLOB '[0-2][0-9]:[0-5][0-9]' AND substr(start_time, 1, 2) BETWEEN '00' AND '23'
    )
  ),
  CHECK (status IN ('planned', 'cancelled', 'completed'))
);

CREATE INDEX idx_date_plans_room_upcoming
  ON date_plans(room_id, status, scheduled_date);

-- 추천은 독립 객체가 아니라 어떤 약속을 준비한 결과인지 추적한다.
ALTER TABLE recommendation_requests ADD COLUMN plan_id TEXT
  REFERENCES date_plans(id) ON DELETE SET NULL;

CREATE INDEX idx_recommendation_requests_plan
  ON recommendation_requests(plan_id);

-- 문항 문구는 코드에서 제공하지만 답할 당시 의미는 DB에도 스냅샷으로 남긴다.
-- 코드 문항을 고친 뒤 과거 preference_signals의 뜻이 바뀌면 학습 데이터가 깨진다.
CREATE TABLE date_question_answers (
  id TEXT PRIMARY KEY,
  plan_id TEXT NOT NULL,
  room_id TEXT NOT NULL,
  member_id TEXT NOT NULL,
  question_id TEXT NOT NULL,
  option_id TEXT NOT NULL,
  axis TEXT NOT NULL,
  tag TEXT NOT NULL,
  weight REAL NOT NULL,
  preference_id TEXT,
  answered_on TEXT NOT NULL,            -- Asia/Seoul 기준 YYYY-MM-DD
  created_at TEXT NOT NULL,
  FOREIGN KEY (plan_id) REFERENCES date_plans(id) ON DELETE CASCADE,
  FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE,
  FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE CASCADE,
  FOREIGN KEY (preference_id) REFERENCES preferences(id) ON DELETE SET NULL,
  CHECK (weight >= -1 AND weight <= 1),
  UNIQUE (plan_id, member_id, question_id)
);

CREATE INDEX idx_date_question_answers_member
  ON date_question_answers(member_id, answered_on);

CREATE INDEX idx_date_question_answers_plan
  ON date_question_answers(plan_id, question_id);
