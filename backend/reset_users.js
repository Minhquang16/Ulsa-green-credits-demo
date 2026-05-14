const bcrypt = require('bcryptjs');
const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'ugc',
  user: process.env.DB_USER || 'ugc',
  password: process.env.DB_PASS || 'ugc'
});

const users = [
  { username: 'admin',    password: 'admin123',    full_name: 'Admin ULSA (Hội đồng 1)', role: 'admin',    wallet_index: 0, wallet_address: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266' },
  { username: 'admin2',   password: 'admin456',    full_name: 'Admin ULSA (Hội đồng 2)', role: 'admin',    wallet_index: 1, wallet_address: '0x70997970C51812dc3A010C7d01b50e0d17dc79C8' },
  { username: 'verifier', password: 'verifier123', full_name: 'Verifier (Đoàn/Hội)',     role: 'verifier', wallet_index: 2, wallet_address: '0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC' },
  { username: 'student1', password: 'student123',  full_name: 'Sinh viên 1',             role: 'student',  wallet_index: 3, wallet_address: '0x90F79bf6EB2c4f870365E785982E1f101E93b906' },
  { username: 'student2', password: 'student123',  full_name: 'Sinh viên 2',             role: 'student',  wallet_index: 4, wallet_address: '0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65' },
];

async function main() {
  console.log('🔄 Resetting all users...');
  await pool.query('TRUNCATE TABLE users CASCADE');

  for (const u of users) {
    const hash = bcrypt.hashSync(u.password, 10);
    await pool.query(
      `INSERT INTO users(username, password_hash, full_name, role, wallet_index, wallet_address)
       VALUES($1,$2,$3,$4,$5,$6)`,
      [u.username, hash, u.full_name, u.role, u.wallet_index, u.wallet_address]
    );
    console.log(`✅ Created: ${u.username} / ${u.password}`);
  }

  console.log('\n🎉 Done! All users re-seeded successfully.');
  await pool.end();
}

main().catch(e => { console.error('❌ Error:', e.message); process.exit(1); });
