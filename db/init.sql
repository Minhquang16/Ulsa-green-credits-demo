CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin','verifier','student')),
  wallet_index INT,
  wallet_address TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'disabled', 'pending', 'rejected')),
  student_id TEXT UNIQUE,
  class_name TEXT,
  cohort TEXT,
  birth_date TEXT,
  student_card_image TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS activity_types (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  credit_amount INT NOT NULL CHECK (credit_amount >= 0),
  evidence_required BOOLEAN NOT NULL DEFAULT TRUE,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  activity_type_id UUID NOT NULL REFERENCES activity_types(id),
  title TEXT NOT NULL,
  description TEXT,
  organizer_id UUID NOT NULL REFERENCES users(id),
  start_at TIMESTAMPTZ,
  end_at TIMESTAMPTZ,
  location TEXT,
  qr_token TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'published' CHECK (status IN ('draft','published','ended')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS checkins (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(event_id, student_id)
);

CREATE INDEX IF NOT EXISTS idx_checkins_event ON checkins(event_id);
CREATE INDEX IF NOT EXISTS idx_checkins_student ON checkins(student_id);


CREATE TABLE IF NOT EXISTS claims (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  evidence_path TEXT,
  evidence_hash TEXT,
  note TEXT,
  status TEXT NOT NULL DEFAULT 'submitted' CHECK (status IN ('submitted','approved','rejected')),
  approver_id UUID REFERENCES users(id),
  approved_tx_hash TEXT,
  decided_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_claims_status ON claims(status);
CREATE INDEX IF NOT EXISTS idx_claims_student ON claims(student_id);
CREATE INDEX IF NOT EXISTS idx_claims_event ON claims(event_id);

CREATE TABLE IF NOT EXISTS reward_categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS rewards (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  description TEXT,
  cost_credits INT NOT NULL CHECK (cost_credits >= 0),
  stock INT NOT NULL DEFAULT 0 CHECK (stock >= 0),
  category_id UUID REFERENCES reward_categories(id),
  limit_per_student INT DEFAULT 1,
  start_date DATE,
  expiry_date DATE,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','inactive')),
  image_url TEXT,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS redemptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  reward_id UUID NOT NULL REFERENCES rewards(id),
  student_id UUID NOT NULL REFERENCES users(id),
  cost_credits INT NOT NULL,
  tx_hash TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_redemptions_student ON redemptions(student_id);

CREATE TABLE IF NOT EXISTS retirements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID NOT NULL REFERENCES users(id),
  amount INT NOT NULL CHECK (amount >= 0),
  reason TEXT,
  tx_hash TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_retirements_student ON retirements(student_id);

CREATE TABLE IF NOT EXISTS achievements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  icon TEXT NOT NULL,
  label TEXT NOT NULL,
  description TEXT,
  target_type TEXT NOT NULL CHECK (target_type IN ('claims_count', 'total_ugc', 'on_chain')),
  target_value INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_achievements (
  student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  achievement_id UUID NOT NULL REFERENCES achievements(id) ON DELETE CASCADE,
  unlocked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (student_id, achievement_id)
);

-- Insert default achievements
INSERT INTO achievements (icon, label, description, target_type, target_value) VALUES
  ('🌱', 'Khởi đầu', 'Tham gia hoạt động đầu tiên', 'claims_count', 1),
  ('🌿', 'Tích cực', 'Hoàn thành 3 hoạt động', 'claims_count', 3),
  ('🌳', 'Chuyên cần', 'Đạt 50 UGC', 'total_ugc', 50),
  ('🏆', 'Xuất sắc', 'Đạt 100 UGC', 'total_ugc', 100),
  ('⭐', 'Huyền thoại', 'Đạt 200 UGC', 'total_ugc', 200),
  ('🔗', 'On-chain', 'Có giao dịch blockchain', 'on_chain', 1)
ON CONFLICT DO NOTHING;
