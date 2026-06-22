const { Pool } = require('pg');
const pool = new Pool({ connectionString: 'postgres://ugc:ugc@localhost:5434/ugc' });
async function insert() {
  try {
    const studentRs = await pool.query("SELECT id FROM users WHERE role='student' AND username='student1' LIMIT 1");
    let student_id = studentRs.rows[0]?.id;
    if (!student_id) {
        const anyStudent = await pool.query("SELECT id FROM users WHERE role='student' LIMIT 1");
        student_id = anyStudent.rows[0]?.id;
    }

    const eventRs = await pool.query("SELECT id FROM events LIMIT 1");
    const event_id = eventRs.rows[0]?.id;
    
    if (!student_id || !event_id) {
        console.log("No student or event found. Need an event first.");
        const activityRs = await pool.query("SELECT id FROM activity_types LIMIT 1");
        const act_id = activityRs.rows[0]?.id;
        if (act_id) {
            const newEvent = await pool.query("INSERT INTO events (activity_type_id, title, organizer_id, qr_token) VALUES ($1, 'Dummy Event', $2, 'token') RETURNING id", [act_id, student_id]);
            const new_event_id = newEvent.rows[0].id;
            await pool.query("INSERT INTO claims (student_id, event_id, status, created_at, updated_at) VALUES ($1, $2, 'approved', NOW(), NOW())", [student_id, new_event_id]);
            await pool.query("INSERT INTO claims (student_id, event_id, status, created_at, updated_at) VALUES ($1, $2, 'submitted', NOW(), NOW())", [student_id, new_event_id]);
            console.log("Created event and inserted claims!");
        } else {
            console.log("Cannot create event, no activity types.");
        }
        process.exit(0);
    }
    
    await pool.query("INSERT INTO claims (student_id, event_id, status, created_at, updated_at) VALUES ($1, $2, 'approved', NOW(), NOW())", [student_id, event_id]);
    await pool.query("INSERT INTO claims (student_id, event_id, status, created_at, updated_at) VALUES ($1, $2, 'submitted', NOW(), NOW())", [student_id, event_id]);
    await pool.query("INSERT INTO claims (student_id, event_id, status, created_at, updated_at) VALUES ($1, $2, 'rejected', NOW(), NOW())", [student_id, event_id]);
    await pool.query("INSERT INTO claims (student_id, event_id, status, created_at, updated_at) VALUES ($1, $2, 'approved', NOW(), NOW())", [student_id, event_id]);
    await pool.query("INSERT INTO claims (student_id, event_id, status, created_at, updated_at) VALUES ($1, $2, 'submitted', NOW(), NOW())", [student_id, event_id]);
    console.log("Inserted claims!");
  } catch(e) {
    console.error(e);
  } finally {
    process.exit(0);
  }
}
insert();
