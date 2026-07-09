CREATE TABLE IF NOT EXISTS rooms (
  id TEXT PRIMARY KEY,
  relationship_type TEXT NOT NULL DEFAULT 'lover',
  title TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS members (
  id TEXT PRIMARY KEY,
  room_id TEXT,
  login_id TEXT NOT NULL UNIQUE,
  account_code TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  nickname TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'member',
  created_at TEXT NOT NULL,
  FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS sogon_files (
  id TEXT PRIMARY KEY,
  room_id TEXT NOT NULL,
  author_member_id TEXT NOT NULL,
  tags_json TEXT NOT NULL,
  content TEXT NOT NULL,
  sensitivity TEXT NOT NULL,
  opening_time TEXT NOT NULL,
  recommendation_on INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE,
  FOREIGN KEY (author_member_id) REFERENCES members(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS preferences (
  id TEXT PRIMARY KEY,
  room_id TEXT NOT NULL,
  member_id TEXT NOT NULL,
  category TEXT NOT NULL,
  text TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE,
  FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_members_room_id ON members(room_id);
CREATE INDEX IF NOT EXISTS idx_members_account_code ON members(account_code);
CREATE INDEX IF NOT EXISTS idx_sogon_files_room_id ON sogon_files(room_id);
CREATE INDEX IF NOT EXISTS idx_preferences_room_id ON preferences(room_id);
