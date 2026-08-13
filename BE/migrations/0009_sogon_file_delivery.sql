-- 0009: 소곤파일이 "언제 열렸고" "상대가 봤는지"를 남긴다.
--
-- 그전에는 열림이 status='opened' 한 글자로만 남았다. 그래서 두 가지를 못 했다.
--   1. 기록 캘린더가 "열어본 날"을 쓴 날(created_at)에 찍었다. 8월 2일에 압축해
--      8월 13일에 연 파일이 8월 2일 칸에 들어갔다.
--   2. 받는 쪽에 "도착했어요"를 언제까지 띄울지 판단할 근거가 없었다.
--      상대가 이미 확인했는지 아닌지를 어디에도 안 적었기 때문이다.
--
-- 두 컬럼 다 NULL을 허용한다. 이미 열린 파일은 연 시각을 소급할 수 없다 —
-- 모르는 걸 아는 척하느니 NULL로 두고 화면이 created_at으로 물러나게 한다.

ALTER TABLE sogon_files ADD COLUMN opened_at TEXT;
ALTER TABLE sogon_files ADD COLUMN partner_seen_at TEXT;

-- 홈 배너가 매번 묻는 질문: "이 방에서 열렸는데 아직 상대가 못 본 게 있나?"
CREATE INDEX IF NOT EXISTS idx_sogon_files_delivery
  ON sogon_files(room_id, status, partner_seen_at);
