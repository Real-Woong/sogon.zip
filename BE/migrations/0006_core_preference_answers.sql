-- 0006: 핵심 취향 질문 답변
--
-- 가입·로그인과 분리된 명시적 취향 입력이다. 질문 문구가 바뀌어도 당시 의미가
-- 보존되도록 axis/tag/weight를 함께 저장한다.
-- 이 파일은 한 번만 실행한다.
--   yarn wrangler d1 execute sogonzip-db --remote --file=BE/migrations/0006_core_preference_answers.sql

CREATE TABLE core_preference_answers (
  id TEXT PRIMARY KEY,
  room_id TEXT NOT NULL,
  member_id TEXT NOT NULL,
  question_id TEXT NOT NULL,
  option_id TEXT NOT NULL,
  axis TEXT NOT NULL,
  tag TEXT NOT NULL,
  weight REAL NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE,
  FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE CASCADE,
  CHECK (weight >= -1 AND weight <= 1),
  UNIQUE (member_id, question_id)
);

CREATE INDEX idx_core_preference_answers_room
  ON core_preference_answers(room_id, member_id);
