-- 0008: 두 사람이 각자 정한 기본 데이트 흐름
--
-- 한 사람당 한 순서를 저장하고, 둘의 공통 부분은 조회 시 결정론적으로 계산한다.
-- 이 파일은 한 번만 실행한다.
--   yarn wrangler d1 execute sogonzip-db --remote --file=BE/migrations/0008_member_course_preferences.sql

CREATE TABLE member_course_preferences (
  member_id TEXT PRIMARY KEY,
  room_id TEXT NOT NULL,
  pattern_json TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE CASCADE,
  FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE
);

CREATE INDEX idx_member_course_preferences_room
  ON member_course_preferences(room_id);
