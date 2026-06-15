const { Pool } = require('pg');
const DATABASE_URL = process.env.DATABASE_URL || "postgres://ugc:ugc@localhost:5434/ugc";
const pool = new Pool({ connectionString: DATABASE_URL });

async function patch() {
  try {
    console.log("Altering achievements table...");
    await pool.query('ALTER TABLE achievements DROP CONSTRAINT IF EXISTS achievements_target_type_check');

    console.log("Adding new achievements...");
    const queries = [
      "INSERT INTO achievements (icon, label, description, target_type, target_value) VALUES ('🌱', 'Tân binh xanh ULSA', 'Đạt 50 UGC đầu tiên tại trường.', 'total_ugc', 50) ON CONFLICT DO NOTHING;",
      "INSERT INTO achievements (icon, label, description, target_type, target_value) VALUES ('⚡', 'Thợ săn phong trào', 'Tham gia đủ 10 sự kiện ngoại khoá.', 'claims_count', 10) ON CONFLICT DO NOTHING;",
      "INSERT INTO achievements (icon, label, description, target_type, target_value) VALUES ('❤️', 'Giọt máu nhân đạo', 'Tham gia hiến máu nhân đạo 2 lần.', 'blood_donation', 2) ON CONFLICT DO NOTHING;",
      "INSERT INTO achievements (icon, label, description, target_type, target_value) VALUES ('🤝', 'Đại sứ cộng đồng', 'Tham gia 5 hoạt động tình nguyện xã hội.', 'volunteer', 5) ON CONFLICT DO NOTHING;",
      "INSERT INTO achievements (icon, label, description, target_type, target_value) VALUES ('💼', 'Cán bộ mẫn cán', 'Tham gia đầy đủ 10 buổi họp/sinh hoạt.', 'meeting', 10) ON CONFLICT DO NOTHING;",
    ];
    for (let q of queries) {
      await pool.query(q);
    }
    console.log("Successfully added new achievements.");
  } catch (err) {
    console.error(err);
  } finally {
    pool.end();
  }
}
patch();
