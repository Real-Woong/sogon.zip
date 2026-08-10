PRAGMA foreign_keys = ON;

INSERT INTO users (id, display_name, password_demo, created_at) VALUES
  ('user-jinwoong', '김진웅', '1234', '2026-06-12T00:00:00.000Z'),
  ('user-seoyeon', '서연', 'demo-partner', '2026-06-12T00:00:00.000Z');

INSERT INTO rooms (id, invite_code, relationship_type, created_at) VALUES
  ('room-love2', 'LOVE2', 'lover', '2026-06-12T00:00:00.000Z');

INSERT INTO room_members (room_id, user_id, role, joined_at) VALUES
  ('room-love2', 'user-jinwoong', 'owner', '2026-06-12T00:00:00.000Z'),
  ('room-love2', 'user-seoyeon', 'partner', '2026-06-12T00:00:00.000Z');

INSERT INTO user_preferences (id, user_id, category, content, source, created_at) VALUES
  ('pref-jinwoong-food-1', 'user-jinwoong', '밥', '매운 음식보다 담백한 일식이 좋아.', 'manual', '2026-06-12T00:10:00.000Z'),
  ('pref-jinwoong-cafe-1', 'user-jinwoong', '카페', '조용하고 창가 자리가 있는 카페를 좋아해.', 'manual', '2026-06-12T00:12:00.000Z'),
  ('pref-seoyeon-walk-1', 'user-seoyeon', '산책', '사람 많은 곳보다 강변 산책을 좋아해.', 'sogon_zip', '2026-06-12T00:15:00.000Z');

INSERT INTO sogon_files (
  id,
  room_id,
  owner_id,
  title,
  content,
  sensitivity,
  opening_time_label,
  open_on,
  recommendation_on,
  status,
  created_at,
  opened_at
) VALUES
  (
    'sogon-jinwoong-food',
    'room-love2',
    'user-jinwoong',
    '음식취향.zip',
    '사실 나는 매운 음식을 잘 못 먹어.',
    '😀',
    'D+100 열림 예정',
    '2026-05-28',
    1,
    'opened',
    '2026-05-01T00:00:00.000Z',
    '2026-05-28T11:00:00.000Z'
  ),
  (
    'sogon-seoyeon-cafe',
    'room-love2',
    'user-seoyeon',
    '카페취향.zip',
    '다음 데이트는 조용한 창가 자리 있는 카페였으면 좋겠어.',
    '🙂',
    '오늘 열 수 있어요',
    '2026-06-12',
    1,
    'ready',
    '2026-06-12T01:00:00.000Z',
    NULL
  ),
  (
    'sogon-jinwoong-gift',
    'room-love2',
    'user-jinwoong',
    '기념일선물.zip',
    '실용적인 선물보다 오래 기억나는 편지가 좋아.',
    '🙂',
    '다음 기념일',
    '2026-07-01',
    1,
    'scheduled',
    '2026-06-10T09:00:00.000Z',
    NULL
  );

INSERT INTO received_sogon_files (id, sogon_file_id, receiver_id, sender_id, message, received_at, is_read) VALUES
  (
    'received-seoyeon-cafe',
    'sogon-seoyeon-cafe',
    'user-jinwoong',
    'user-seoyeon',
    '진웅아, 이번 주말에 같이 가보고 싶은 분위기야.',
    '2026-06-12T02:04:03.395Z',
    0
  );

INSERT INTO reactions (id, sogon_file_id, user_id, reaction_label, reply_text, created_at) VALUES
  (
    'reaction-food-thanks',
    'sogon-jinwoong-food',
    'user-seoyeon',
    '말해줘서 고마워',
    '다음에는 안 매운 곳으로 가자.',
    '2026-05-28T12:00:00.000Z'
  );

INSERT INTO record_events (id, room_id, sogon_file_id, event_date, event_type, title, description, icon, created_at) VALUES
  (
    'record-2026-05-28-food',
    'room-love2',
    'sogon-jinwoong-food',
    '2026-05-28',
    'opened',
    '음식취향.zip 압축해제',
    '사실 나는 매운 음식을 잘 못 먹어.',
    '🎁',
    '2026-05-28T12:05:00.000Z'
  ),
  (
    'record-2026-06-12-received',
    'room-love2',
    'sogon-seoyeon-cafe',
    '2026-06-12',
    'received',
    '서연의 카페취향.zip 도착',
    '조용한 창가 자리 있는 카페를 추천에 반영할 수 있어요.',
    '💬',
    '2026-06-12T02:04:03.395Z'
  );

INSERT INTO recommendations (id, room_id, category, title, reason, status, created_at, saved_at) VALUES
  (
    'rec-food-001',
    'room-love2',
    '밥',
    '밥 추천.zip 압축해제 결과',
    '김진웅의 담백한 음식 취향과 서연의 조용한 분위기 취향을 함께 반영했어요.',
    'draft',
    '2026-06-12T02:10:00.000Z',
    NULL
  );

INSERT INTO recommendation_items (id, recommendation_id, step_order, content) VALUES
  ('rec-food-001-step-1', 'rec-food-001', 1, '맵지 않은 일식집'),
  ('rec-food-001-step-2', 'rec-food-001', 2, '조용한 골목 산책'),
  ('rec-food-001-step-3', 'rec-food-001', 3, '창가 자리 있는 카페에서 디저트');
