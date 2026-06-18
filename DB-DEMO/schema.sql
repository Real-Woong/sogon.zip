PRAGMA foreign_keys = ON;

DROP TABLE IF EXISTS recommendation_items;
DROP TABLE IF EXISTS recommendations;
DROP TABLE IF EXISTS record_events;
DROP TABLE IF EXISTS reactions;
DROP TABLE IF EXISTS received_sogon_files;
DROP TABLE IF EXISTS sogon_files;
DROP TABLE IF EXISTS user_preferences;
DROP TABLE IF EXISTS room_members;
DROP TABLE IF EXISTS rooms;
DROP TABLE IF EXISTS users;

CREATE TABLE users (
  id TEXT PRIMARY KEY,
  display_name TEXT NOT NULL,
  password_demo TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE rooms (
  id TEXT PRIMARY KEY,
  invite_code TEXT NOT NULL UNIQUE,
  relationship_type TEXT NOT NULL CHECK (relationship_type IN ('lover', 'friend')),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE room_members (
  room_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('owner', 'partner')),
  joined_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (room_id, user_id),
  FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE user_preferences (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  category TEXT NOT NULL,
  content TEXT NOT NULL,
  source TEXT NOT NULL DEFAULT 'manual' CHECK (source IN ('manual', 'sogon_zip')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE sogon_files (
  id TEXT PRIMARY KEY,
  room_id TEXT NOT NULL,
  owner_id TEXT NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  sensitivity TEXT NOT NULL,
  opening_time_label TEXT NOT NULL,
  open_on TEXT,
  recommendation_on INTEGER NOT NULL DEFAULT 1 CHECK (recommendation_on IN (0, 1)),
  status TEXT NOT NULL CHECK (status IN ('scheduled', 'ready', 'opened', 'closed')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  opened_at TEXT,
  FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE,
  FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE received_sogon_files (
  id TEXT PRIMARY KEY,
  sogon_file_id TEXT NOT NULL,
  receiver_id TEXT NOT NULL,
  sender_id TEXT NOT NULL,
  message TEXT,
  received_at TEXT NOT NULL DEFAULT (datetime('now')),
  is_read INTEGER NOT NULL DEFAULT 0 CHECK (is_read IN (0, 1)),
  FOREIGN KEY (sogon_file_id) REFERENCES sogon_files(id) ON DELETE CASCADE,
  FOREIGN KEY (receiver_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE reactions (
  id TEXT PRIMARY KEY,
  sogon_file_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  reaction_label TEXT NOT NULL,
  reply_text TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (sogon_file_id) REFERENCES sogon_files(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE record_events (
  id TEXT PRIMARY KEY,
  room_id TEXT NOT NULL,
  sogon_file_id TEXT,
  event_date TEXT NOT NULL,
  event_type TEXT NOT NULL CHECK (event_type IN ('opened', 'received', 'recommendation_saved', 'reaction')),
  title TEXT NOT NULL,
  description TEXT,
  icon TEXT NOT NULL DEFAULT '📦',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE,
  FOREIGN KEY (sogon_file_id) REFERENCES sogon_files(id) ON DELETE SET NULL
);

CREATE TABLE recommendations (
  id TEXT PRIMARY KEY,
  room_id TEXT NOT NULL,
  category TEXT NOT NULL,
  title TEXT NOT NULL,
  reason TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'saved', 'dismissed')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  saved_at TEXT,
  FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE
);

CREATE TABLE recommendation_items (
  id TEXT PRIMARY KEY,
  recommendation_id TEXT NOT NULL,
  step_order INTEGER NOT NULL,
  content TEXT NOT NULL,
  FOREIGN KEY (recommendation_id) REFERENCES recommendations(id) ON DELETE CASCADE
);

CREATE INDEX idx_room_members_user_id ON room_members(user_id);
CREATE INDEX idx_preferences_user_id ON user_preferences(user_id);
CREATE INDEX idx_sogon_files_room_status ON sogon_files(room_id, status);
CREATE INDEX idx_received_receiver_read ON received_sogon_files(receiver_id, is_read);
CREATE INDEX idx_record_events_room_date ON record_events(room_id, event_date);
CREATE INDEX idx_recommendations_room_category ON recommendations(room_id, category);
