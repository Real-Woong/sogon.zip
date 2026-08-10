PRAGMA foreign_keys = ON;

-- 1. Login demo lookup
SELECT id, display_name
FROM users
WHERE display_name = '김진웅'
  AND password_demo = '1234';

-- 2. Home profile and partner
SELECT
  owner.display_name AS user_name,
  partner.display_name AS partner_name,
  rooms.relationship_type,
  rooms.invite_code
FROM rooms
JOIN room_members owner_member
  ON owner_member.room_id = rooms.id
  AND owner_member.role = 'owner'
JOIN users owner
  ON owner.id = owner_member.user_id
JOIN room_members partner_member
  ON partner_member.room_id = rooms.id
  AND partner_member.role = 'partner'
JOIN users partner
  ON partner.id = partner_member.user_id
WHERE owner.id = 'user-jinwoong';

-- 3. Unread received sogon.zip notification
SELECT
  received_sogon_files.id,
  sender.display_name AS sender_name,
  sogon_files.title,
  sogon_files.content,
  received_sogon_files.message,
  received_sogon_files.received_at
FROM received_sogon_files
JOIN sogon_files
  ON sogon_files.id = received_sogon_files.sogon_file_id
JOIN users sender
  ON sender.id = received_sogon_files.sender_id
WHERE received_sogon_files.receiver_id = 'user-jinwoong'
  AND received_sogon_files.is_read = 0
ORDER BY received_sogon_files.received_at DESC;

-- 4. My sogon.zip folder by status
SELECT
  id,
  title,
  sensitivity,
  opening_time_label,
  recommendation_on,
  status,
  created_at
FROM sogon_files
WHERE owner_id = 'user-jinwoong'
  AND status = 'scheduled'
ORDER BY created_at DESC;

-- 5. Preferences used by recommendation.zip
SELECT category, content, source, created_at
FROM user_preferences
WHERE user_id IN ('user-jinwoong', 'user-seoyeon')
ORDER BY created_at DESC;

-- 6. Latest recommendation.zip with items
SELECT
  recommendations.title,
  recommendations.category,
  recommendations.reason,
  recommendation_items.step_order,
  recommendation_items.content
FROM recommendations
JOIN recommendation_items
  ON recommendation_items.recommendation_id = recommendations.id
WHERE recommendations.room_id = 'room-love2'
ORDER BY recommendations.created_at DESC, recommendation_items.step_order ASC;

-- 7. Calendar records for a month
SELECT
  event_date,
  event_type,
  title,
  description,
  icon
FROM record_events
WHERE room_id = 'room-love2'
  AND event_date BETWEEN '2026-06-01' AND '2026-06-30'
ORDER BY event_date ASC;
