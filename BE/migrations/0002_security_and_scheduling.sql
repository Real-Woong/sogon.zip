-- 0002: 치명적 결함(P0) 수정을 위한 스키마
--
-- 1) 세션 토큰 분리          : 토큰 = member id 구조 제거
-- 2) 비밀번호 salt + 알고리즘 : 전역 prefix SHA-256 제거
-- 3) 로그인 시도 제한
-- 4) 연결 요청/승인          : 상대 동의 없는 방 합류 차단
-- 5) opening_at             : "정해둔 날에 열림"을 실제 날짜로 저장
--
-- ALTER TABLE ... ADD COLUMN은 SQLite에서 IF NOT EXISTS를 지원하지 않는다.
-- 이 파일은 한 번만 실행한다.
--   wrangler d1 execute sogonzip-db --remote --file=BE/migrations/0002_security_and_scheduling.sql

-- 1) 세션 -------------------------------------------------------------------
-- 토큰 원문은 저장하지 않는다. DB가 유출돼도 살아있는 세션을 넘겨주지 않기 위해
-- SHA-256 해시만 보관한다.
CREATE TABLE IF NOT EXISTS sessions (
  token_hash TEXT PRIMARY KEY,
  member_id TEXT NOT NULL,
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_sessions_member_id ON sessions(member_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at);

-- 2) 비밀번호 ---------------------------------------------------------------
-- 기존 계정은 password_algo = 'sha256-legacy'로 남고, 다음 로그인 성공 시
-- 서버가 자동으로 PBKDF2로 재해싱한다.
ALTER TABLE members ADD COLUMN password_salt TEXT;
ALTER TABLE members ADD COLUMN password_algo TEXT NOT NULL DEFAULT 'sha256-legacy';

-- 3) 로그인 시도 제한 -------------------------------------------------------
CREATE TABLE IF NOT EXISTS auth_attempts (
  login_id TEXT PRIMARY KEY,
  failed_count INTEGER NOT NULL DEFAULT 0,
  first_failed_at TEXT NOT NULL,
  locked_until TEXT
);

-- 4) 연결 요청 --------------------------------------------------------------
CREATE TABLE IF NOT EXISTS connection_requests (
  id TEXT PRIMARY KEY,
  requester_id TEXT NOT NULL,
  target_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending', -- pending | accepted | declined | cancelled
  created_at TEXT NOT NULL,
  responded_at TEXT,
  FOREIGN KEY (requester_id) REFERENCES members(id) ON DELETE CASCADE,
  FOREIGN KEY (target_id) REFERENCES members(id) ON DELETE CASCADE
);

-- 같은 상대에게 pending 요청이 중복 생성되지 않도록 막는다.
CREATE UNIQUE INDEX IF NOT EXISTS idx_connection_requests_pending
  ON connection_requests(requester_id, target_id)
  WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_connection_requests_target
  ON connection_requests(target_id, status);
CREATE INDEX IF NOT EXISTS idx_connection_requests_requester
  ON connection_requests(requester_id, status);

-- 5) 개봉 시각 --------------------------------------------------------------
-- NULL이면 날짜로 자동 개봉되지 않는다(수동 개봉 / 닫아둠).
ALTER TABLE sogon_files ADD COLUMN opening_at TEXT;

CREATE INDEX IF NOT EXISTS idx_sogon_files_opening
  ON sogon_files(room_id, status, opening_at);

-- 내 파일만 조회하는 경로가 기본이 되므로 작성자 인덱스를 추가한다.
CREATE INDEX IF NOT EXISTS idx_sogon_files_author
  ON sogon_files(room_id, author_member_id);
