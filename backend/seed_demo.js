const { Pool } = require('pg');
const pool = new Pool({ connectionString: 'postgres://ugc:ugc@localhost:5432/ugc' }); // Adjust if needed

async function seed() {
  try {
    const studentRes = await pool.query("SELECT id FROM users WHERE role='student' LIMIT 1;");
    if (studentRes.rows.length === 0) {
      console.log('No student found.');
      return;
    }
    const studentId = studentRes.rows[0].id;

    // Create a mock event
    const eventRes = await pool.query(`
      INSERT INTO events (title, description, credit_amount, max_participants, start_at, end_at)
      VALUES ('Đạp xe vì môi trường', 'Đạp xe quanh hồ Gươm', 10, 100, NOW(), NOW() + INTERVAL '7 days')
      RETURNING id;
    `);
    const eventId = eventRes.rows[0].id;

    // Create claims
    await pool.query(`
      INSERT INTO claims (student_id, event_id, proof_hash, status, reviewer_id, credit_amount)
      VALUES ($1, $2, 'mock-hash-1', 'approved', NULL, 10);
    `, [studentId, eventId]);

    await pool.query(`
      INSERT INTO claims (student_id, event_id, proof_hash, status, reviewer_id, credit_amount)
      VALUES ($1, $2, 'mock-hash-2', 'submitted', NULL, 10);
    `, [studentId, eventId]);

    await pool.query(`
      INSERT INTO claims (student_id, event_id, proof_hash, status, reviewer_id, credit_amount)
      VALUES ($1, $2, 'mock-hash-3', 'rejected', NULL, 10);
    `, [studentId, eventId]);

    console.log('Successfully seeded event and claims!');
  } catch (err) {
    console.error('Error seeding:', err);
  } finally {
    pool.end();
  }
}

seed();
