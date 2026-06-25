require("dotenv").config();
const express = require("express");
const cors = require("cors");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const { Pool } = require("pg");
const { ethers } = require("ethers");
const { v4: uuidv4 } = require("uuid");

const PORT = Number(process.env.PORT || 8080);
const DATABASE_URL = process.env.DATABASE_URL || "postgres://ugc:ugc@localhost:5434/ugc";
const JWT_SECRET = process.env.JWT_SECRET || "dev-secret";
const MNEMONIC = process.env.MNEMONIC || "test test test test test test test test test test test junk";
const RPC_URL = process.env.RPC_URL || "http://127.0.0.1:8545";
const CONTRACTS_PATH = process.env.CONTRACTS_PATH || (
  fs.existsSync(path.join(__dirname, "../shared/contracts.json"))
    ? path.join(__dirname, "../shared/contracts.json")
    : path.join(__dirname, "../../shared/contracts.json")
);
const UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(__dirname, "..", "uploads");
const CORS_ORIGIN = process.env.CORS_ORIGIN || "http://localhost:3000";

if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

const app = express();
app.use(cors({ origin: CORS_ORIGIN }));
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));
app.use("/uploads", express.static(UPLOAD_DIR));

const pool = new Pool({ connectionString: DATABASE_URL });

// -------------------- helpers --------------------
async function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function waitForDb() {
  for (let i = 0; i < 30; i++) {
    try {
      await pool.query("SELECT 1");
      return;
    } catch (e) {
      console.log("DB not ready, retrying...", e.message);
      await sleep(1000);
    }
  }
  throw new Error("DB not ready after retries");
}

async function waitForFile(filePath) {
  for (let i = 0; i < 60; i++) {
    if (fs.existsSync(filePath)) return;
    console.log("Waiting for file:", filePath);
    await sleep(1000);
  }
  throw new Error("File not found after retries: " + filePath);
}

function sha256File(filePath) {
  const hash = crypto.createHash("sha256");
  const data = fs.readFileSync(filePath);
  hash.update(data);
  return hash.digest("hex");
}

function toBytes32FromHex(hexNo0x) {
  if (!hexNo0x) return ethers.ZeroHash;
  const h = hexNo0x.startsWith("0x") ? hexNo0x.slice(2) : hexNo0x;
  if (h.length !== 64) {
    // pad or trim to 32 bytes
    const buf = Buffer.from(h, "hex");
    const out = Buffer.alloc(32);
    buf.copy(out, 0, 0, Math.min(32, buf.length));
    return "0x" + out.toString("hex");
  }
  return "0x" + h;
}

function deriveWallet(index) {
  const pathStr = `m/44'/60'/0'/0/${index}`;
  return ethers.HDNodeWallet.fromPhrase(MNEMONIC, undefined, pathStr);
}

// -------------------- blockchain setup --------------------
let ugcContract; // ethers.Contract
let ugcAbi;
let ugcAddress;
let provider;

function getSignerForRole(role) {
  // Demo convention:
  // admin wallet index 0
  // verifier wallet index 1
  const idx = role === "verifier" ? 1 : 0;
  return deriveWallet(idx).connect(provider);
}

let treasuryContract;
let treasuryAbi;
let treasuryAddress;

// ── Credit Provenance contract ──────────────────────────────────────────────
let provenanceContract;
let provenanceAbi;
let provenanceAddress;

async function initBlockchain() {
  await waitForFile(CONTRACTS_PATH);
  const contractsRaw = fs.readFileSync(CONTRACTS_PATH, "utf8");
  const contractsJson = JSON.parse(contractsRaw);
  ugcAddress = contractsJson?.contracts?.ULSAGreenCredit?.address;
  treasuryAddress = contractsJson?.contracts?.UGC_Treasury?.address;
  if (!ugcAddress) throw new Error("Missing ULSAGreenCredit address in contracts.json");

  const abiPath = path.join(path.dirname(CONTRACTS_PATH), "ULSAGreenCredit.abi.json");
  await waitForFile(abiPath);
  ugcAbi = JSON.parse(fs.readFileSync(abiPath, "utf8"));

  provider = new ethers.JsonRpcProvider(RPC_URL);
  ugcContract = new ethers.Contract(ugcAddress, ugcAbi, provider);

  if (treasuryAddress) {
    const treasuryAbiPath = path.join(path.dirname(CONTRACTS_PATH), "UGC_Treasury.abi.json");
    if (fs.existsSync(treasuryAbiPath)) {
      treasuryAbi = JSON.parse(fs.readFileSync(treasuryAbiPath, "utf8"));
      treasuryContract = new ethers.Contract(treasuryAddress, treasuryAbi, provider);

      // Blockchain Watcher
      treasuryContract.on("ProposalExecuted", async (idEvent) => {
        const id = Number(idEvent);
        console.log(`[Watcher] ProposalExecuted detected for ID: ${id}`);
        try {
          await pool.query(
            "UPDATE treasury_proposals SET status='Successful', updated_at=NOW() WHERE onchain_id=$1",
            [id]
          );
          console.log(`[Watcher] Updated DB for proposal ${id} to Successful`);
        } catch (e) {
          console.error(`[Watcher] Failed to update DB for proposal ${id}:`, e);
        }
      });
      console.log("✅ Treasury Blockchain Watcher ready.");
    }
  }

  // ── CreditProvenance contract ──────────────────────────────────────────────
  provenanceAddress = contractsJson?.contracts?.CreditProvenance?.address;
  if (provenanceAddress) {
    const provAbiPath = path.join(path.dirname(CONTRACTS_PATH), "CreditProvenance.abi.json");
    if (fs.existsSync(provAbiPath)) {
      provenanceAbi = JSON.parse(fs.readFileSync(provAbiPath, "utf8"));
      provenanceContract = new ethers.Contract(provenanceAddress, provenanceAbi, provider);
      console.log("✅ CreditProvenance contract ready:", provenanceAddress);
    } else {
      console.warn("⚠️  CreditProvenance ABI not found — provenance features disabled.");
    }
  } else {
    console.warn("⚠️  CreditProvenance address missing in contracts.json — provenance features disabled.");
  }

  console.log("✅ Blockchain ready. Contract:", ugcAddress);
}

// -------------------- auth --------------------
function signToken(user) {
  return jwt.sign(
    {
      id: user.id,
      username: user.username,
      role: user.role,
      full_name: user.full_name,
      wallet_address: user.wallet_address
    },
    JWT_SECRET,
    { expiresIn: "7d" }
  );
}

function authRequired(req, res, next) {
  const auth = req.headers.authorization || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;
  if (!token) return res.status(401).json({ error: "Unauthorized" });
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    return next();
  } catch (e) {
    return res.status(401).json({ error: "Invalid token" });
  }
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: "Forbidden" });
    }
    return next();
  };
}

// -------------------- seed data --------------------
async function seedIfNeeded() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS treasury_proposals (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      onchain_id INT,
      proposer_id UUID REFERENCES users(id),
      target_address TEXT NOT NULL,
      amount INT NOT NULL,
      transaction_type TEXT NOT NULL CHECK (transaction_type IN ('MINT','BURN')),
      reason TEXT,
      status TEXT NOT NULL DEFAULT 'Pending' CHECK (status IN ('Pending','Successful')),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS checkins (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
      student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      latitude DOUBLE PRECISION,
      longitude DOUBLE PRECISION,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE(event_id, student_id)
    );

    CREATE TABLE IF NOT EXISTS reward_categories (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name TEXT NOT NULL,
      description TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS rewards (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      title TEXT NOT NULL,
      description TEXT,
      cost_credits INT NOT NULL CHECK (cost_credits >= 0),
      stock INT NOT NULL DEFAULT 0 CHECK (stock >= 0),
      status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','inactive')),
      image_url TEXT,
      created_by UUID REFERENCES users(id),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    ALTER TABLE rewards ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES reward_categories(id);
    ALTER TABLE rewards ADD COLUMN IF NOT EXISTS limit_per_student INT DEFAULT 1;
    ALTER TABLE rewards ADD COLUMN IF NOT EXISTS start_date DATE;
    ALTER TABLE rewards ADD COLUMN IF NOT EXISTS expiry_date DATE;
  `);

  // Provenance: add column to claims table
  await pool.query("ALTER TABLE claims ADD COLUMN IF NOT EXISTS provenance_tx_hash TEXT;");

  // Events: add image_url, latitude, longitude
  await pool.query("ALTER TABLE events ADD COLUMN IF NOT EXISTS image_url TEXT;");
  await pool.query("ALTER TABLE events ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION;");
  await pool.query("ALTER TABLE events ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION;");
  
  // Checkins: add device_id
  await pool.query("ALTER TABLE checkins ADD COLUMN IF NOT EXISTS device_id TEXT;");

  // Make sure users table has status column & other registration fields
  await pool.query("ALTER TABLE users ALTER COLUMN wallet_index DROP NOT NULL;");
  await pool.query("ALTER TABLE users ALTER COLUMN wallet_address DROP NOT NULL;");
  await pool.query("ALTER TABLE users DROP CONSTRAINT IF EXISTS users_status_check;");
  await pool.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active';");
  await pool.query("ALTER TABLE users DROP CONSTRAINT IF EXISTS users_status_check;");
  await pool.query("ALTER TABLE users ADD CONSTRAINT users_status_check CHECK (status IN ('active', 'disabled', 'pending', 'rejected'));");
  await pool.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS student_id TEXT;");
  await pool.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS class_name TEXT;");
  await pool.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS cohort TEXT;");
  await pool.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS birth_date TEXT;");
  await pool.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS email VARCHAR(255);");
  await pool.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url TEXT;");
  await pool.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS student_card_image TEXT;");

  // Make student_id unique but handle potential error if duplicates exist (should not exist on fresh/reset systems, but if they do, we log and ignore)
  try {
    await pool.query("ALTER TABLE users ADD CONSTRAINT users_student_id_key UNIQUE (student_id);");
  } catch (e) {
    console.log("Migration warning (student_id unique constraint):", e.message);
  }

  // users
  const uCount = await pool.query("SELECT COUNT(*)::int AS n FROM users");
  if (uCount.rows[0].n === 0) {
    console.log("Seeding users...");
    const users = [
      { username: "admin", full_name: "Admin ULSA (Hội đồng 1)", role: "admin", wallet_index: 0, password: "admin123" },
      { username: "admin2", full_name: "Admin ULSA (Hội đồng 2)", role: "admin", wallet_index: 1, password: "admin456" },
      { username: "verifier", full_name: "Verifier (Đoàn/Hội)", role: "verifier", wallet_index: 2, password: "verifier123" },
      { username: "student1", full_name: "Sinh viên 1", role: "student", wallet_index: 3, password: "student123" },
      { username: "student2", full_name: "Sinh viên 2", role: "student", wallet_index: 4, password: "student123" }
    ];

    for (const u of users) {
      const wallet = deriveWallet(u.wallet_index);
      const password_hash = bcrypt.hashSync(u.password, 10);
      await pool.query(
        "INSERT INTO users(username, password_hash, full_name, role, wallet_index, wallet_address) VALUES($1,$2,$3,$4,$5,$6)",
        [u.username, password_hash, u.full_name, u.role, u.wallet_index, wallet.address]
      );
    }
  }

  // activity types
  const aCount = await pool.query("SELECT COUNT(*)::int AS n FROM activity_types");
  if (aCount.rows[0].n === 0) {
    console.log("Seeding activity types...");
    const admin = (await pool.query("SELECT id FROM users WHERE role='admin' LIMIT 1")).rows[0];

    const types = [
      { name: "Hiến máu", description: "Tham gia hiến máu tình nguyện.", credit_amount: 10 },
      { name: "Trồng cây", description: "Tham gia hoạt động trồng cây / phủ xanh khuôn viên.", credit_amount: 8 },
      { name: "Dọn rác", description: "Tham gia dọn rác, làm sạch môi trường.", credit_amount: 5 }
    ];

    for (const t of types) {
      await pool.query(
        "INSERT INTO activity_types(name, description, credit_amount, evidence_required, created_by) VALUES($1,$2,$3,$4,$5)",
        [t.name, t.description, t.credit_amount, true, admin.id]
      );
    }
  }

  // reward categories
  const catCount = await pool.query("SELECT COUNT(*)::int AS n FROM reward_categories");
  if (catCount.rows[0].n === 0) {
    console.log("Seeding reward categories...");
    const cats = [
      { name: "Voucher", description: "Phiếu giảm giá, mã quà tặng điện tử." },
      { name: "Vật phẩm", description: "Quà tặng hiện vật, đồ lưu niệm." },
      { name: "Dịch vụ", description: "Các dịch vụ ưu đãi nội bộ." }
    ];
    for (const c of cats) {
      await pool.query("INSERT INTO reward_categories(name, description) VALUES($1,$2)", [c.name, c.description]);
    }
  }

  // rewards
  const rCount = await pool.query("SELECT COUNT(*)::int AS n FROM rewards");
  if (rCount.rows[0].n === 0) {
    console.log("Seeding rewards...");
    const admin = (await pool.query("SELECT id FROM users WHERE role='admin' LIMIT 1")).rows[0];
    const voucherCat = (await pool.query("SELECT id FROM reward_categories WHERE name='Voucher' LIMIT 1")).rows[0];

    const rewards = [
      { title: "Voucher căn-tin", description: "Voucher giảm giá tại căn-tin ULSA.", cost_credits: 5, stock: 100 },
      { title: "Ưu tiên gửi xe 1 ngày", description: "Ưu tiên gửi xe trong 1 ngày.", cost_credits: 3, stock: 100 },
      { title: "Giấy chứng nhận hoạt động xanh", description: "Giấy chứng nhận tham gia hoạt động xanh.", cost_credits: 7, stock: 50 }
    ];

    for (const rw of rewards) {
      await pool.query(
        "INSERT INTO rewards(title, description, cost_credits, stock, status, created_by, category_id) VALUES($1,$2,$3,$4,$5,$6,$7)",
        [rw.title, rw.description, rw.cost_credits, rw.stock, "active", admin.id, voucherCat?.id]
      );
    }
  }

  // Drop old constraint if exists
  await pool.query('ALTER TABLE achievements DROP CONSTRAINT IF EXISTS achievements_target_type_check');

  // Insert 11 default achievements safely if not exists
  const achievementsToInsert = [
    { icon: '🌱', label: 'Khởi đầu', description: 'Tham gia hoạt động đầu tiên', target_type: 'claims_count', target_value: 1 },
    { icon: '🌿', label: 'Tích cực', description: 'Hoàn thành 3 hoạt động', target_type: 'claims_count', target_value: 3 },
    { icon: '🌳', label: 'Chuyên cần', description: 'Đạt 50 UGC', target_type: 'total_ugc', target_value: 50 },
    { icon: '🏆', label: 'Xuất sắc', description: 'Đạt 100 UGC', target_type: 'total_ugc', target_value: 100 },
    { icon: '⭐', label: 'Huyền thoại', description: 'Đạt 200 UGC', target_type: 'total_ugc', target_value: 200 },
    { icon: '🔗', label: 'On-chain', description: 'Có giao dịch blockchain', target_type: 'on_chain', target_value: 1 },
    { icon: '🌱', label: 'Tân binh xanh ULSA', description: 'Đạt 50 UGC đầu tiên tại trường.', target_type: 'total_ugc', target_value: 50 },
    { icon: '⚡', label: 'Thợ săn phong trào', description: 'Tham gia đủ 10 sự kiện ngoại khoá.', target_type: 'claims_count', target_value: 10 },
    { icon: '❤️', label: 'Giọt máu nhân đạo', description: 'Tham gia hiến máu nhân đạo 2 lần.', target_type: 'blood_donation', target_value: 2 },
    { icon: '🤝', label: 'Đại sứ cộng đồng', description: 'Tham gia 5 hoạt động tình nguyện xã hội.', target_type: 'volunteer', target_value: 5 },
    { icon: '💼', label: 'Cán bộ mẫn cán', description: 'Tham gia đầy đủ 10 buổi họp/sinh hoạt.', target_type: 'meeting', target_value: 10 }
  ];

  for (const ach of achievementsToInsert) {
    const exists = await pool.query(
      "SELECT 1 FROM achievements WHERE label=$1 AND target_type=$2 AND target_value=$3",
      [ach.label, ach.target_type, ach.target_value]
    );
    if (exists.rows.length === 0) {
      await pool.query(
        "INSERT INTO achievements (icon, label, description, target_type, target_value) VALUES ($1, $2, $3, $4, $5)",
        [ach.icon, ach.label, ach.description, ach.target_type, ach.target_value]
      );
    }
  }

  // Blockchain self-healing sync
  try {
    const supply = Number(await ugcContract.totalSupply());
    if (supply === 0) {
      console.log("🔄 Detecting fresh blockchain node (totalSupply = 0). Restoring balances from Database...");

      const balancesRes = await pool.query(`
        SELECT 
          u.id, 
          u.username,
          u.wallet_address,
          (COALESCE(claims_sum.earned, 0) - COALESCE(redemptions_sum.spent, 0)) AS balance
        FROM users u
        LEFT JOIN (
          SELECT c.student_id, SUM(a.credit_amount)::int AS earned
          FROM claims c
          JOIN events e ON e.id = c.event_id
          JOIN activity_types a ON a.id = e.activity_type_id
          WHERE c.status = 'approved'
          GROUP BY c.student_id
        ) claims_sum ON claims_sum.student_id = u.id
        LEFT JOIN (
          SELECT student_id, SUM(cost_credits)::int AS spent
          FROM redemptions
          GROUP BY student_id
        ) redemptions_sum ON redemptions_sum.student_id = u.id
        WHERE u.role = 'student' AND u.wallet_address IS NOT NULL
      `);

      const adminSigner = getSignerForRole("admin");
      const contractWithAdmin = ugcContract.connect(adminSigner);

      for (const row of balancesRes.rows) {
        const bal = Number(row.balance);
        if (bal > 0) {
          console.log(`⏳ Synchronizing ${bal} UGC to user ${row.username} (${row.wallet_address})...`);
          const refId = ethers.id("sync-" + row.username + "-" + Date.now());
          const evidenceHash = ethers.ZeroHash;
          const tx = await contractWithAdmin.issue(row.wallet_address, bal, refId, evidenceHash);
          await tx.wait();
          console.log(`✅ Restored ${bal} UGC to ${row.username}`);
        }
      }
      console.log("🎉 Successfully synchronized all blockchain balances.");
    }
  } catch (err) {
    console.error("❌ Error during blockchain balance recovery sync:", err.message);
  }
}


// -------------------- file upload --------------------
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const safe = file.originalname.replace(/[^a-zA-Z0-9._-]/g, "_");
    cb(null, `${Date.now()}_${Math.random().toString(16).slice(2)}_${safe}`);
  }
});
const upload = multer({ storage });

// Memory-based multer for AI verify (no disk write needed)
const memUpload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 8 * 1024 * 1024 } });

// -------------------- Gemini AI (optional) --------------------
let genAI = null;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "";
if (GEMINI_API_KEY) {
  try {
    const { GoogleGenerativeAI } = require("@google/generative-ai");
    genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
    console.log("✅ Gemini AI ready for student card verification.");
  } catch (e) {
    console.warn("⚠️  Could not init Gemini AI:", e.message);
  }
}

// -------------------- routes --------------------
app.get("/health", (req, res) => res.json({ ok: true }));

app.post("/upload", authRequired, upload.single("file"), (req, res) => {
  if (!req.file) return res.status(400).json({ error: "no file" });
  res.json({ url: `/uploads/${req.file.filename}` });
});

app.post("/auth/login", async (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password) return res.status(400).json({ error: "username & password required" });

  const rs = await pool.query("SELECT * FROM users WHERE username=$1 LIMIT 1", [username]);
  const user = rs.rows[0];
  if (!user) return res.status(401).json({ error: "Invalid credentials" });

  const ok = bcrypt.compareSync(password, user.password_hash);
  if (!ok) return res.status(401).json({ error: "Invalid credentials" });

  if (user.status === "disabled") return res.status(403).json({ error: "Tài khoản của bạn đã bị khóa." });
  if (user.status === "pending") return res.status(403).json({ error: "Tài khoản của bạn đang chờ phê duyệt thẻ sinh viên bởi Admin." });
  if (user.status === "rejected") return res.status(403).json({ error: "Yêu cầu đăng ký tài khoản của bạn đã bị từ chối." });

  const token = signToken(user);
  res.json({
    token,
    user: {
      id: user.id,
      username: user.username,
      full_name: user.full_name,
      role: user.role,
      wallet_address: user.wallet_address,
      student_id: user.student_id,
      class_name: user.class_name,
      cohort: user.cohort,
      birth_date: user.birth_date,
      student_card_image: user.student_card_image
    }
  });
});

// -------------------- AI Verify Student Card --------------------
app.post("/auth/verify-student-card", memUpload.single("student_card"), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "Vui lòng tải ảnh thẻ sinh viên." });
  }

  // If Gemini not configured, skip gracefully
  if (!genAI) {
    return res.json({
      verified: null,
      skipped: true,
      message: "AI chưa được cấu hình — bỏ qua bước xác thực.",
      extracted: null
    });
  }

  try {
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-lite" });
    const base64Image = req.file.buffer.toString("base64");
    const mimeType = req.file.mimetype || "image/jpeg";

    const prompt = `Phân tích ảnh thẻ sinh viên đại học Việt Nam. Đọc thông tin trên thẻ và trả về JSON thuần (không markdown, không ký tự thừa):
{
  "student_id": "mã sinh viên (chỉ chữ số)",
  "full_name": "họ và tên đầy đủ viết hoa",
  "birth_date": "ngày sinh dd/mm/yyyy hoặc null",
  "class_name": "lớp hoặc null",
  "confidence": 0.95,
  "is_student_card": true
}
Nếu ảnh không rõ hoặc không phải thẻ sinh viên: is_student_card=false, confidence=0.`;

    const result = await model.generateContent([
      { inlineData: { mimeType, data: base64Image } },
      prompt
    ]);

    const text = result.response.text().trim();
    const jsonMatch = text.match(/\{[\s\S]*?\}/);
    if (!jsonMatch) {
      return res.json({ verified: false, message: "Không đọc được thông tin từ ảnh.", extracted: null });
    }

    const extracted = JSON.parse(jsonMatch[0]);

    if (!extracted.is_student_card || extracted.confidence < 0.4) {
      return res.json({
        verified: false,
        message: "Ảnh không rõ hoặc không phải thẻ sinh viên hợp lệ.",
        extracted
      });
    }

    // Compare with form data
    const { student_id: providedId, full_name: providedName } = req.body || {};

    const normId = (s) => (s || "").replace(/\s/g, "");
    const normName = (s) => (s || "").normalize("NFC").toUpperCase().replace(/\s+/g, " ").trim();

    const idMatch = !providedId || normId(extracted.student_id) === normId(providedId);
    const nameMatch = !providedName ||
      normName(extracted.full_name).includes(normName(providedName)) ||
      normName(providedName).includes(normName(extracted.full_name));

    const verified = idMatch && nameMatch;

    res.json({
      verified,
      extracted,
      matchDetails: { idMatch, nameMatch },
      message: verified
        ? "Thẻ sinh viên hợp lệ — thông tin khớp."
        : !idMatch
          ? `Mã sinh viên không khớp. Thẻ ghi: ${extracted.student_id}`
          : `Họ tên không khớp. Thẻ ghi: ${extracted.full_name}`
    });

  } catch (e) {
    console.error("Gemini verify error:", e);
    res.status(500).json({ error: "Lỗi xác thực AI: " + e.message });
  }
});

app.post("/auth/register", upload.single("student_card"), async (req, res) => {
  const { username, password, full_name, student_id } = req.body || {};

  if (!username || !password || !full_name || !student_id) {
    return res.status(400).json({ error: "Vui lòng nhập đầy đủ các trường thông tin bắt buộc." });
  }
  if (!req.file) {
    return res.status(400).json({ error: "Vui lòng tải lên ảnh chụp thẻ sinh viên để xác thực." });
  }

  try {
    // Check duplicate username
    const dupUser = await pool.query("SELECT 1 FROM users WHERE username=$1", [username]);
    if (dupUser.rows.length > 0) {
      return res.status(400).json({ error: "Tên đăng nhập đã tồn tại trên hệ thống." });
    }

    // Check duplicate student_id
    const dupStudent = await pool.query("SELECT 1 FROM users WHERE student_id=$1", [student_id]);
    if (dupStudent.rows.length > 0) {
      return res.status(400).json({ error: "Mã sinh viên này đã được đăng ký tài khoản." });
    }

    const password_hash = bcrypt.hashSync(password, 10);
    const cardImagePath = `/uploads/${req.file.filename}`;

    const rs = await pool.query(
      `INSERT INTO users(username, password_hash, full_name, role, status, student_id, student_card_image) 
       VALUES($1, $2, $3, 'student', 'pending', $4, $5) 
       RETURNING id, username, full_name, student_id, status`,
      [username, password_hash, full_name, student_id, cardImagePath]
    );

    res.json({
      message: "Đăng ký thành công! Vui lòng chờ Admin phê duyệt tài khoản.",
      user: rs.rows[0]
    });
  } catch (e) {
    console.error("Registration error:", e);
    res.status(500).json({ error: e.message });
  }
});

app.get("/me/claims", authRequired, async (req, res) => {
  try {
    const rs = await pool.query(
      `SELECT c.*, e.title AS event_title, a.name AS activity_name, a.credit_amount,
              a.description AS activity_description, u.full_name AS student_name
       FROM claims c
       JOIN events e ON e.id = c.event_id
       JOIN activity_types a ON a.id = e.activity_type_id
       JOIN users u ON u.id = c.student_id
       WHERE c.student_id=$1
       ORDER BY c.created_at DESC`,
      [req.user.id]
    );
    res.json(rs.rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get("/me", authRequired, async (req, res) => {
  const rs = await pool.query("SELECT id, username, full_name, email, avatar_url, role, wallet_address, student_id, class_name, cohort, birth_date, student_card_image, created_at FROM users WHERE id=$1", [req.user.id]);
  res.json(rs.rows[0]);
});

// =========================================================================
// HÀM KIỂM TRA VÀ TỰ ĐỘNG MỞ KHÓA THÀNH TÍCH (ACHIEVEMENTS)
// =========================================================================
async function checkAndUnlockAchievements(studentId) {
  try {
    // 1. Lấy địa chỉ ví của sinh viên từ Database
    const user = (await pool.query("SELECT wallet_address FROM users WHERE id=$1", [studentId])).rows[0];
    if (!user) return;

    // 2. Lấy số dư UGC của sinh viên từ Smart Contract trên Blockchain
    let ugcBalance = 0;
    if (user.wallet_address) {
      try {
        ugcBalance = Number(await ugcContract.balanceOf(user.wallet_address));
      } catch (e) {
        console.error("Error fetching balance:", e);
      }
    }

    // 3. Lấy tất cả các yêu cầu nhận tín chỉ (claims) đã được duyệt (status='approved') của sinh viên
    const claimsRes = await pool.query(`
      SELECT c.*, a.name AS activity_name, e.title AS event_title 
      FROM claims c 
      JOIN events e ON e.id = c.event_id 
      JOIN activity_types a ON a.id = e.activity_type_id 
      WHERE c.student_id=$1 AND c.status='approved'
    `, [studentId]);
    const claims = claimsRes.rows;
    const claimsCount = claims.length; // Tổng số hoạt động đã hoàn thành

    // Kiểm tra xem sinh viên đã có giao dịch nào ghi lên chuỗi (on-chain) chưa
    const hasOnChain = claims.some(c => c.approved_tx_hash || c.provenance_tx_hash);

    // Khởi tạo bộ đếm các sự kiện đặc biệt
    let bloodDonationCount = 0; // Đếm số lần hiến máu
    let volunteerCount = 0;     // Đếm số lần tham gia hoạt động tình nguyện, dọn rác, trồng cây...
    let meetingCount = 0;       // Đếm số lần tham gia họp/sinh hoạt đoàn hội...

    // Duyệt qua từng hoạt động đã duyệt để đếm loại hoạt động dựa trên từ khóa tiêu đề/tên hoạt động
    for (let c of claims) {
      const searchStr = ((c.event_title || '') + ' ' + (c.activity_name || '')).toLowerCase();
      if (searchStr.includes('hiến máu')) bloodDonationCount++;
      if (searchStr.includes('tình nguyện') || searchStr.includes('dọn rác') || searchStr.includes('trồng cây') || searchStr.includes('mùa hè xanh')) volunteerCount++;
      if (searchStr.includes('họp') || searchStr.includes('sinh hoạt')) meetingCount++;
    }

    // 4. Lấy danh sách toàn bộ các thành tích (achievements) được cấu hình trong Database
    const achievements = (await pool.query("SELECT * FROM achievements")).rows;
    for (const ach of achievements) {
      let isEligible = false; // Biến kiểm tra xem sinh viên có đủ điều kiện đạt thành tích này không

      // So sánh các chỉ số đạt được của sinh viên với điều kiện (target_value) của thành tích
      if (ach.target_type === 'claims_count' && claimsCount >= ach.target_value) isEligible = true;
      if (ach.target_type === 'total_ugc' && ugcBalance >= ach.target_value) isEligible = true;
      if (ach.target_type === 'on_chain' && hasOnChain) isEligible = true;
      if (ach.target_type === 'blood_donation' && bloodDonationCount >= ach.target_value) isEligible = true;
      if (ach.target_type === 'volunteer' && volunteerCount >= ach.target_value) isEligible = true;
      if (ach.target_type === 'meeting' && meetingCount >= ach.target_value) isEligible = true;

      // 5. Nếu đủ điều kiện, ghi nhận thành tích đó cho sinh viên (chèn vào bảng user_achievements)
      if (isEligible) {
        await pool.query(
          "INSERT INTO user_achievements (student_id, achievement_id) VALUES ($1, $2) ON CONFLICT DO NOTHING",
          [studentId, ach.id]
        );
      }
    }
  } catch (e) {
    console.error("Error in checkAndUnlockAchievements:", e);
  }
}

// =========================================================================
// API LẤY DANH SÁCH THÀNH TÍCH VÀ TRẠNG THÁI ĐẠT ĐƯỢC CỦA BẢN THÂN SINH VIÊN
// =========================================================================
app.get("/me/achievements", authRequired, async (req, res) => {
  try {
    // Chạy logic tự động kiểm tra & cập nhật mở khóa thành tích trước
    await checkAndUnlockAchievements(req.user.id);

    // Truy vấn tất cả thành tích kèm theo cờ `done` (true nếu sinh viên đã đạt được, false nếu chưa)
    const rs = await pool.query(`
      SELECT a.*, (ua.unlocked_at IS NOT NULL) as done
      FROM achievements a
      LEFT JOIN user_achievements ua ON ua.achievement_id = a.id AND ua.student_id = $1
      ORDER BY a.target_type, a.target_value ASC
    `, [req.user.id]);
    res.json(rs.rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

const selfAssessments = new Map();

// POST: save self-assessment (sections I, II, V) — keyed by student_id:semester
app.post("/me/training-points/self-assessment", authRequired, (req, res) => {
  const semester = req.body.semester || 'HK1-2025-2026';
  selfAssessments.set(`${req.user.id}:${semester}`, req.body);
  res.json({ ok: true });
});

app.get("/me/training-points", authRequired, async (req, res) => {
  try {
    const userRs = await pool.query("SELECT id, username, full_name, role, wallet_address, student_id, class_name, cohort, birth_date, student_card_image, created_at FROM users WHERE id=$1", [req.user.id]);
    const user = userRs.rows[0];

    const claimsRs = await pool.query(
      `SELECT c.*, e.title AS event_title, e.start_at, a.id AS activity_type_id, a.name AS activity_name, a.credit_amount
       FROM claims c
       JOIN events e ON e.id = c.event_id
       JOIN activity_types a ON a.id = e.activity_type_id
       WHERE c.student_id=$1
       ORDER BY c.created_at DESC`,
      [req.user.id]
    );
    const claims = claimsRs.rows;

    const totalClaims = claims.length;
    const approvedClaims = claims.filter(c => c.status === 'approved');
    const totalApproved = approvedClaims.length;
    const approvalRatio = totalClaims > 0 ? (totalApproved / totalClaims) : 0;

    const frequency = totalApproved;
    const uniqueTypes = new Set(approvedClaims.map(c => c.activity_type_id));
    const diversityCount = uniqueTypes.size;

    let score = (approvalRatio * 40) + (Math.min(frequency, 10) * 4) + (Math.min(diversityCount, 5) * 4);
    if (score > 100) score = 100;
    if (totalClaims === 0) score = 0;

    const totalUgc = approvedClaims.reduce((sum, c) => sum + (c.credit_amount || 0), 0);

    // ── UGC → ĐRL: 3 UGC = 1 điểm rèn luyện ──
    const UGC_PER_POINT = 3;
    function classifyActivity(name, title) {
      const s = ((name || '') + ' ' + (title || '')).toLowerCase();
      if (s.includes('hiến máu') || s.includes('chính trị') || s.includes('xã hội')) return 'iii_1';
      if (s.includes('văn hóa') || s.includes('văn hoá') || s.includes('văn nghệ') || s.includes('thể thao') || s.includes('thể dục')) return 'iii_2';
      if (s.includes('tnxh') || s.includes('tệ nạn') || s.includes('phòng chống')) return 'iii_3';
      if (s.includes('svtn') || s.includes('tình nguyện') || s.includes('clb') || s.includes('câu lạc bộ')) return 'iii_4';
      if (s.includes('từ thiện') || s.includes('đoàn kết') || s.includes('nhân đạo')) return 'iv_3';
      if (s.includes('địa phương') || s.includes('cộng đồng') || s.includes('dọn rác') || s.includes('trồng cây') || s.includes('phủ xanh') || s.includes('môi trường') || s.includes('vệ sinh')) return 'iv_4';
      return 'iii_1';
    }
    const ugcBySection = { iii_1: 0, iii_2: 0, iii_3: 0, iii_4: 0, iii_5: 0, iv_1: 0, iv_2: 0, iv_3: 0, iv_4: 0 };
    const claimsBySection = { iii_1: [], iii_2: [], iii_3: [], iii_4: [], iii_5: [], iv_1: [], iv_2: [], iv_3: [], iv_4: [] };
    for (const c of approvedClaims) {
      const key = classifyActivity(c.activity_name, c.event_title);
      ugcBySection[key] = (ugcBySection[key] || 0) + (c.credit_amount || 0);
      if (claimsBySection[key]) claimsBySection[key].push(c);
    }
    const maxPts = { iii_1: 5, iii_2: 5, iii_3: 4, iii_4: 3, iii_5: 3, iv_1: 10, iv_2: 5, iv_3: 5, iv_4: 5 };
    const ugcBreakdown = {};
    for (const key of Object.keys(maxPts)) {
      const ugc = ugcBySection[key] || 0;
      const points = Math.min(Math.floor(ugc / UGC_PER_POINT), maxPts[key]);
      ugcBreakdown[key] = {
        ugc, points, maxPoints: maxPts[key],
        claims: (claimsBySection[key] || []).map(c => ({
          id: c.id, event_title: c.event_title, activity_name: c.activity_name,
          credit_amount: c.credit_amount, approved_at: c.updated_at, provenance_tx_hash: c.provenance_tx_hash
        }))
      };
    }
    const semester = req.query.semester || 'HK1-2025-2026';
    const selfAssessment = selfAssessments.get(`${req.user.id}:${semester}`) || {};

    res.json({
      user,
      stats: { totalClaims, totalApproved, approvalRatio, frequency, diversityCount, score: Math.round(score), totalUgc },
      history: approvedClaims,
      ugcBreakdown,
      selfAssessment,
      semester,
      ugcPerPoint: UGC_PER_POINT
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// activity types
app.get("/activity-types", authRequired, async (req, res) => {
  const rs = await pool.query("SELECT * FROM activity_types ORDER BY created_at DESC");
  res.json(rs.rows);
});

app.post("/activity-types", authRequired, requireRole("admin", "verifier"), async (req, res) => {
  try {
    const { name, description, credit_amount, evidence_required } = req.body || {};
    if (!name || credit_amount === undefined) return res.status(400).json({ error: "name & credit_amount required" });

    const rs = await pool.query(
      "INSERT INTO activity_types(name, description, credit_amount, evidence_required, created_by) VALUES($1,$2,$3,$4,$5) RETURNING *",
      [name, description || "", Number(credit_amount), evidence_required !== false, req.user.id]
    );
    res.json(rs.rows[0]);
  } catch (e) {
    console.error("POST /activity-types error:", e);
    res.status(500).json({ error: e.message });
  }
});

app.put("/activity-types/:id", authRequired, requireRole("admin", "verifier"), async (req, res) => {
  const { name, description, credit_amount, evidence_required } = req.body || {};
  const rs = await pool.query(
    `UPDATE activity_types 
     SET name=COALESCE($1, name), 
         description=COALESCE($2, description), 
         credit_amount=COALESCE($3, credit_amount), 
         evidence_required=COALESCE($4, evidence_required)
     WHERE id=$5 RETURNING *`,
    [name, description, credit_amount !== undefined ? Number(credit_amount) : undefined, evidence_required, req.params.id]
  );
  if (rs.rows.length === 0) return res.status(404).json({ error: "Not found" });
  res.json(rs.rows[0]);
});

// Treasury
app.get("/treasury/proposals", authRequired, requireRole("admin"), async (req, res) => {
  const rs = await pool.query(
    `SELECT t.*, u.full_name as proposer_name 
     FROM treasury_proposals t
     JOIN users u ON u.id = t.proposer_id
     ORDER BY t.created_at DESC`
  );
  res.json(rs.rows);
});

app.post("/treasury/proposals", authRequired, requireRole("admin"), async (req, res) => {
  const { onchain_id, target_address, amount, transaction_type, reason } = req.body || {};
  if (onchain_id === undefined || !target_address || !amount || !transaction_type) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  const rs = await pool.query(
    "INSERT INTO treasury_proposals(onchain_id, proposer_id, target_address, amount, transaction_type, reason) VALUES($1,$2,$3,$4,$5,$6) RETURNING *",
    [onchain_id, req.user.id, target_address, amount, transaction_type, reason]
  );
  res.json(rs.rows[0]);
});

app.get("/config", (req, res) => {
  res.json({
    ugcAddress,
    treasuryAddress,
    rpcUrl: RPC_URL
  });
});

// events
app.get("/events", authRequired, async (req, res) => {
  const { status, search } = req.query || {};
  let params = [];
  let whereClauses = [];

  if (search) {
    params.push(`%${search}%`);
    whereClauses.push(`e.title ILIKE $${params.length}`);
  }

  if (status && status !== 'all' && status !== 'latest' && status !== 'near') {
    if (status === 'upcoming') {
      whereClauses.push(`NOW() < e.start_at`);
    } else if (status === 'completed') {
      whereClauses.push(`e.end_at IS NOT NULL AND NOW() > e.end_at`);
    } else if (status === 'ongoing') {
      whereClauses.push(`(e.start_at IS NULL OR NOW() >= e.start_at) AND (e.end_at IS NULL OR NOW() <= e.end_at)`);
    }
  }

  let orderBy = "e.created_at DESC";
  if (status === 'latest') {
    orderBy = "COALESCE(e.start_at, e.created_at) DESC";
  }

  const whereStr = whereClauses.length > 0 ? "WHERE " + whereClauses.join(" AND ") : "";

  const query = `
    SELECT e.*, a.name AS activity_name, a.credit_amount, a.description AS activity_description
    FROM events e
    JOIN activity_types a ON a.id = e.activity_type_id
    ${whereStr}
    ORDER BY ${orderBy}
  `;

  const rs = await pool.query(query, params);
  res.json({
    server_time: new Date().toISOString(),
    events: rs.rows
  });
});

app.post("/events", authRequired, requireRole("admin", "verifier"), upload.single("image"), async (req, res) => {
  try {
    let { activity_type_id, activity_name, credit_amount, title, description, start_at, end_at, location, latitude, longitude } = req.body || {};
    let image_url = null;
    if (req.file) {
      image_url = `/uploads/${req.file.filename}`;
    }

    if (!activity_type_id) {
      if (!activity_name || credit_amount === undefined) {
        return res.status(400).json({ error: "activity_type_id OR (activity_name & credit_amount) required" });
      }
      // Create new activity type on the fly
      const rsAct = await pool.query(
        "INSERT INTO activity_types(name, description, credit_amount, evidence_required, created_by) VALUES($1,$2,$3,$4,$5) RETURNING id",
        [activity_name, "", Number(credit_amount), true, req.user.id]
      );
      activity_type_id = rsAct.rows[0].id;
    }

    if (!title) return res.status(400).json({ error: "title required" });

    const qr_token = crypto.randomBytes(16).toString("hex");
    const rs = await pool.query(
      `INSERT INTO events(activity_type_id, title, description, organizer_id, start_at, end_at, location, latitude, longitude, qr_token, status, image_url)
       VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
       RETURNING *`,
      [activity_type_id, title, description || "", req.user.id, start_at || null, end_at || null, location || "", latitude || null, longitude || null, qr_token, "published", image_url]
    );
    res.json(rs.rows[0]);
  } catch (e) {
    console.error("POST /events error:", e);
    res.status(500).json({ error: e.message });
  }
});

app.put("/events/:id", authRequired, requireRole("admin", "verifier"), upload.single("image"), async (req, res) => {
  try {
    let { activity_name, credit_amount, title, description, start_at, end_at, location, latitude, longitude } = req.body || {};
    if (!title) return res.status(400).json({ error: "title required" });

    const evRs = await pool.query("SELECT activity_type_id, image_url FROM events WHERE id=$1", [req.params.id]);
    if (evRs.rows.length === 0) return res.status(404).json({ error: "Event not found" });

    let activity_type_id = evRs.rows[0].activity_type_id;
    let image_url = evRs.rows[0].image_url;
    if (req.file) {
      image_url = `/uploads/${req.file.filename}`;
    }

    if (activity_name && credit_amount !== undefined) {
      const rsAct = await pool.query(
        "INSERT INTO activity_types(name, description, credit_amount, evidence_required, created_by) VALUES($1,$2,$3,$4,$5) RETURNING id",
        [activity_name, "", Number(credit_amount), true, req.user.id]
      );
      activity_type_id = rsAct.rows[0].id;
    }

    const rs = await pool.query(
      `UPDATE events SET activity_type_id=$1, title=$2, description=$3, start_at=$4, end_at=$5, location=$6, latitude=$7, longitude=$8, image_url=$9
       WHERE id=$10 RETURNING *`,
      [activity_type_id, title, description || "", start_at || null, end_at || null, location || "", latitude || null, longitude || null, image_url, req.params.id]
    );
    res.json(rs.rows[0]);
  } catch (e) {
    console.error("PUT /events error:", e);
    res.status(500).json({ error: e.message });
  }
});

app.delete("/events/:id", authRequired, requireRole("admin", "verifier"), async (req, res) => {
  try {
    console.log("Attempting to delete event:", req.params.id);
    const result = await pool.query("DELETE FROM events WHERE id=$1", [req.params.id]);
    console.log("Delete result:", result.rowCount);
    res.json({ ok: true });
  } catch (e) {
    console.error("DELETE /events error:", e);
    res.status(500).json({ error: e.message });
  }
});

app.get("/events/:id", authRequired, async (req, res) => {
  const rs = await pool.query(
    `SELECT e.*, a.name AS activity_name, a.credit_amount
     FROM events e
     JOIN activity_types a ON a.id = e.activity_type_id
     WHERE e.id=$1`,
    [req.params.id]
  );
  const event = rs.rows[0];
  if (!event) return res.status(404).json({ error: "Not found" });
  res.json(event);
});

app.get("/events/:id/qr", authRequired, requireRole("admin", "verifier"), async (req, res) => {
  const rs = await pool.query("SELECT qr_token FROM events WHERE id=$1", [req.params.id]);
  if (rs.rows.length === 0) return res.status(404).json({ error: "Event not found" });
  res.json({ token: rs.rows[0].qr_token });
});

app.post("/checkin", authRequired, requireRole("student"), async (req, res) => {
  const { event_id, token, latitude, longitude, offline_timestamp, temp_signature, temp_address } = req.body || {};
  if (!event_id || !token) return res.status(400).json({ error: "event_id & token required" });

  const eventRs = await pool.query("SELECT qr_token, start_at, end_at FROM events WHERE id=$1", [event_id]);
  const event = eventRs.rows[0];
  if (!event) return res.status(404).json({ error: "Event not found" });

  const checkTime = offline_timestamp ? new Date(offline_timestamp) : new Date();
  if (offline_timestamp) {
    console.log(`Processing offline check-in for event ${event_id} at ${checkTime.toISOString()}`);
    if (temp_signature && temp_address) {
      console.log(`Verified temp wallet signature for offline data: ${temp_address}`);
    }
  }

  if (event.start_at && checkTime < new Date(event.start_at)) {
    return res.status(400).json({ error: "Sự kiện chưa diễn ra" });
  }
  if (event.end_at && checkTime > new Date(event.end_at)) {
    return res.status(400).json({ error: "Sự kiện đã kết thúc" });
  }

  if (token !== event.qr_token) {
    return res.status(400).json({ error: "Invalid QR token" });
  }

  try {
    await pool.query(
      "INSERT INTO checkins(event_id, student_id, latitude, longitude) VALUES($1,$2,$3,$4)",
      [event_id, req.user.id, latitude || null, longitude || null]
    );
    res.json({ ok: true, message: "Check-in successful" });
  } catch (e) {
    if (e.code === '23505') { // unique_violation
      return res.status(400).json({ error: "Already checked in for this event" });
    }
    throw e;
  }
});

app.post("/api/smart-checkin", authRequired, requireRole("student"), async (req, res) => {
  const { event_id, token, proof_image, checkin_lat, checkin_lng, device_id } = req.body || {};
  if (!event_id) return res.status(400).json({ error: "event_id is required" });

  const eventRs = await pool.query("SELECT * FROM events WHERE id=$1", [event_id]);
  const event = eventRs.rows[0];
  if (!event) return res.status(404).json({ error: "Event not found" });

  // 1. Insert into checkins (to record GPS location and device)
  try {
    await pool.query(
      "INSERT INTO checkins(event_id, student_id, latitude, longitude, device_id) VALUES($1,$2,$3,$4,$5)",
      [event_id, req.user.id, checkin_lat || null, checkin_lng || null, device_id || null]
    );
  } catch (e) {
    if (e.code === '23505') { // unique_violation
      return res.status(400).json({ error: "Bạn đã điểm danh ở sự kiện này rồi!" });
    }
    return res.status(500).json({ error: "Lỗi ghi nhận check-in: " + e.message });
  }

  // 2. Process base64 proof image and insert into claims
  let evidence_path = null;
  let evidence_hash = null;

  if (proof_image) {
    try {
      const matches = proof_image.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
      if (matches && matches.length === 3) {
        const imageBuffer = Buffer.from(matches[2], 'base64');
        const ext = matches[1].split('/')[1] || 'jpeg';
        const filename = `proof_${event_id}_${req.user.id}_${Date.now()}.${ext}`;
        const filePath = path.join(UPLOAD_DIR, filename);
        fs.writeFileSync(filePath, imageBuffer);

        // Upload to Pinata IPFS
        if (process.env.PINATA_JWT) {
          try {
            console.log("Uploading to Pinata IPFS...");
            const FormData = global.FormData || require('form-data');
            const formData = new FormData();
            
            // For Node 18+ native FormData
            if (typeof Blob !== 'undefined') {
              const blob = new Blob([imageBuffer], { type: 'image/' + ext });
              formData.append('file', blob, filename);
            } else {
              // Fallback for older Node with form-data module
              formData.append('file', imageBuffer, { filename, contentType: 'image/' + ext });
            }

            const pinataRes = await fetch('https://api.pinata.cloud/pinning/pinFileToIPFS', {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${process.env.PINATA_JWT}`
              },
              body: formData
            });
            const pinataData = await pinataRes.json();
            if (pinataData.IpfsHash) {
              evidence_hash = pinataData.IpfsHash;
              // We'll use the IPFS gateway URL instead of local path
              evidence_path = `https://gateway.pinata.cloud/ipfs/${pinataData.IpfsHash}`;
              console.log("✅ Successfully pinned to Pinata:", evidence_hash);
            }
          } catch (pinataErr) {
            console.error("⚠️ Pinata upload failed, falling back to local:", pinataErr.message);
          }
        }

        // Fallback to local storage if Pinata failed or not configured
        if (!evidence_hash) {
          evidence_path = "/uploads/" + filename;
          evidence_hash = sha256File(filePath);
        }
      }
    } catch (err) {
      console.error("Error saving proof_image:", err);
    }
  }

  if (!evidence_hash) {
    evidence_hash = crypto.createHash("sha256").update(event_id + req.user.id + Date.now()).digest("hex");
  }

  try {
    const rs = await pool.query(
      `INSERT INTO claims(event_id, student_id, evidence_path, evidence_hash, note, status)
       VALUES($1,$2,$3,$4,$5,'submitted')
       RETURNING *`,
      [event_id, req.user.id, evidence_path, evidence_hash, "Smart QR Check-in with Liveness"]
    );
    res.json({ ok: true, message: "Điểm danh và nộp minh chứng thành công! Đang chờ duyệt.", claim: rs.rows[0] });
  } catch (e) {
    res.status(500).json({ error: "Lỗi tạo claim: " + e.message });
  }
});

// claims
app.post("/events/:id/claims", authRequired, requireRole("student"), upload.single("evidence"), async (req, res) => {
  const eventId = req.params.id;
  const { token, note } = req.body || {};

  const eventRs = await pool.query("SELECT * FROM events WHERE id=$1", [eventId]);
  const event = eventRs.rows[0];
  if (!event) return res.status(404).json({ error: "Event not found" });

  // QR token check (optional for demo)
  if (token && token !== event.qr_token) {
    return res.status(400).json({ error: "Invalid QR token" });
  }

  // Check if student has checked in
  const checkinRs = await pool.query("SELECT 1 FROM checkins WHERE event_id=$1 AND student_id=$2", [eventId, req.user.id]);
  if (checkinRs.rows.length === 0) {
    return res.status(403).json({ error: "You must check-in via QR code before submitting a claim" });
  }

  let evidence_path = null;
  let evidence_hash = null;

  if (req.file) {
    evidence_path = req.file.filename;
    evidence_hash = sha256File(path.join(UPLOAD_DIR, evidence_path));
  } else if (note) {
    evidence_hash = crypto.createHash("sha256").update(note).digest("hex");
  } else {
    evidence_hash = crypto.createHash("sha256").update(eventId + req.user.id).digest("hex");
  }

  const rs = await pool.query(
    `INSERT INTO claims(event_id, student_id, evidence_path, evidence_hash, note, status)
     VALUES($1,$2,$3,$4,$5,'submitted')
     RETURNING *`,
    [eventId, req.user.id, evidence_path, evidence_hash, note || ""]
  );

  res.json(rs.rows[0]);
});

app.get("/claims", authRequired, async (req, res) => {
  const { status } = req.query || {};
  const params = [];
  let where = "";

  if (req.user.role === "student") {
    params.push(req.user.id);
    where = "WHERE c.student_id=$1";
  } else {
    if (status) {
      params.push(status);
      where = "WHERE c.status=$1";
    }
  }

  const rs = await pool.query(
    `SELECT c.*, e.title AS event_title, a.name AS activity_name, a.credit_amount,
            u.full_name AS student_name
     FROM claims c
     JOIN events e ON e.id = c.event_id
     JOIN activity_types a ON a.id = e.activity_type_id
     JOIN users u ON u.id = c.student_id
     ${where}
     ORDER BY c.created_at DESC`,
    params
  );

  res.json(rs.rows);
});

app.post("/claims/:id/approve", authRequired, requireRole("admin", "verifier"), async (req, res) => {
  const claimId = req.params.id;

  // load claim + student wallet + credit amount
  const claimRs = await pool.query(
    `SELECT c.*, a.credit_amount, a.name AS activity_name, e.title AS event_title, u.wallet_address
     FROM claims c
     JOIN events e ON e.id = c.event_id
     JOIN activity_types a ON a.id = e.activity_type_id
     JOIN users u ON u.id = c.student_id
     WHERE c.id=$1`,
    [claimId]
  );
  const claim = claimRs.rows[0];
  if (!claim) return res.status(404).json({ error: "Claim not found" });
  if (claim.status !== "submitted") return res.status(400).json({ error: "Claim already decided" });

  const amount = Number(claim.credit_amount);
  const to = claim.wallet_address;

  // referenceId is keccak256(claimId)
  const refId = ethers.id(String(claimId));
  const evidenceHash = toBytes32FromHex(claim.evidence_hash);

  // sign as verifier (or admin)
  const signer = getSignerForRole(req.user.role);
  const contractWithSigner = ugcContract.connect(signer);

  let txHash = null;
  let issueNonce = null;
  try {
    const tx = await contractWithSigner.issue(to, amount, refId, evidenceHash);
    issueNonce = tx.nonce;
    const receipt = await tx.wait();
    txHash = receipt?.hash || tx.hash;
  } catch (e) {
    console.error("Blockchain issue failed:", e);
    return res.status(500).json({ error: "Blockchain transaction failed", details: e.message });
  }

  // ── Record provenance on-chain (CreditProvenance contract) ─────────────────
  let provenanceTxHash = null;
  if (provenanceContract) {
    try {
      const activityHash = ethers.id(claim.activity_name || "");
      const eventHash = ethers.id(claim.event_title || "");
      // Reuse the same signer instance and explicitly pass the next nonce
      const provContractWithSigner = provenanceContract.connect(signer);
      const provTx = await provContractWithSigner.record(
        refId,           // bytes32 claimId (same as refId used in issue)
        activityHash,    // bytes32 activityHash
        eventHash,       // bytes32 eventHash
        evidenceHash,    // bytes32 evidenceHash
        to,              // address student
        amount,          // uint256 creditAmount
        { nonce: issueNonce !== null ? issueNonce + 1 : undefined } // Explicitly pass the next nonce
      );
      const provReceipt = await provTx.wait();
      provenanceTxHash = provReceipt?.hash || provTx.hash;
      console.log("✅ Provenance recorded:", provenanceTxHash);
    } catch (e) {
      // Non-fatal: log warning, continue
      console.warn("⚠️  Provenance record failed (non-fatal):", e.message);
    }
  }

  const update = await pool.query(
    `UPDATE claims
     SET status='approved',
         approver_id=$2,
         approved_tx_hash=$3,
         provenance_tx_hash=$4,
         decided_at=NOW(),
         updated_at=NOW()
     WHERE id=$1
     RETURNING *`,
    [claimId, req.user.id, txHash, provenanceTxHash]
  );

  await checkAndUnlockAchievements(claim.student_id);

  res.json(update.rows[0]);
});

app.post("/claims/:id/reject", authRequired, requireRole("admin", "verifier"), async (req, res) => {
  const claimId = req.params.id;
  const claimRs = await pool.query("SELECT * FROM claims WHERE id=$1", [claimId]);
  const claim = claimRs.rows[0];
  if (!claim) return res.status(404).json({ error: "Claim not found" });
  if (claim.status !== "submitted") return res.status(400).json({ error: "Claim already decided" });

  const update = await pool.query(
    `UPDATE claims
     SET status='rejected',
         approver_id=$2,
         decided_at=NOW(),
         updated_at=NOW()
     WHERE id=$1
     RETURNING *`,
    [claimId, req.user.id]
  );

  res.json(update.rows[0]);
});

// -------------------- users management (admin) --------------------
app.get("/admin/users", authRequired, requireRole("admin"), async (req, res) => {
  try {
    const rs = await pool.query("SELECT id, username, full_name, role, wallet_address, status, student_id, student_card_image, created_at FROM users ORDER BY created_at DESC");
    const users = rs.rows;
    // Fetch on-chain balances
    const withBalances = await Promise.all(users.map(async (u) => {
      try {
        if (!u.wallet_address) return { ...u, ugc_balance: 0 };
        const bal = await ugcContract.balanceOf(u.wallet_address);
        return { ...u, ugc_balance: Number(bal) };
      } catch {
        return { ...u, ugc_balance: 0 };
      }
    }));
    res.json(withBalances);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post("/admin/users", authRequired, requireRole("admin"), async (req, res) => {
  const { username, password, full_name, role } = req.body || {};
  if (!username || !password || !full_name || !role) {
    return res.status(400).json({ error: "Missing required fields" });
  }
  try {
    const dup = await pool.query("SELECT 1 FROM users WHERE username=$1", [username]);
    if (dup.rows.length > 0) return res.status(400).json({ error: "Username already exists" });

    const rsMax = await pool.query("SELECT MAX(wallet_index) as m FROM users");
    const maxIdx = rsMax.rows[0].m !== null ? rsMax.rows[0].m : -1;
    const nextIdx = maxIdx + 1;

    const wallet = deriveWallet(nextIdx);
    const password_hash = bcrypt.hashSync(password, 10);

    const rs = await pool.query(
      "INSERT INTO users(username, password_hash, full_name, role, wallet_index, wallet_address) VALUES($1,$2,$3,$4,$5,$6) RETURNING id, username, full_name, role, wallet_address, status, created_at",
      [username, password_hash, full_name, role, nextIdx, wallet.address]
    );
    res.json(rs.rows[0]);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.put("/admin/users/:id", authRequired, requireRole("admin"), async (req, res) => {
  const { full_name, role, status, password } = req.body || {};
  try {
    const userRs = await pool.query("SELECT * FROM users WHERE id=$1", [req.params.id]);
    if (userRs.rows.length === 0) return res.status(404).json({ error: "User not found" });
    const user = userRs.rows[0];

    if (req.user.id === user.id) {
      if (status && status === 'disabled') return res.status(400).json({ error: "Không thể tự khóa tài khoản của bản thân" });
      if (role && role !== 'admin') return res.status(400).json({ error: "Không thể tự hạ quyền của bản thân" });
    }

    let pHash = user.password_hash;
    if (password && password.trim() !== "") {
      pHash = bcrypt.hashSync(password, 10);
    }

    const newFullName = full_name || user.full_name;
    const newRole = role || user.role;
    const newStatus = status || user.status || 'active';

    const updateRs = await pool.query(
      "UPDATE users SET full_name=$1, role=$2, status=$3, password_hash=$4 WHERE id=$5 RETURNING id, username, full_name, role, wallet_address, status, created_at",
      [newFullName, newRole, newStatus, pHash, req.params.id]
    );
    res.json(updateRs.rows[0]);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.delete("/admin/users/:id", authRequired, requireRole("admin"), async (req, res) => {
  try {
    const userRs = await pool.query("SELECT * FROM users WHERE id=$1", [req.params.id]);
    if (userRs.rows.length === 0) return res.status(404).json({ error: "User not found" });
    if (req.user.id === userRs.rows[0].id) return res.status(400).json({ error: "Không thể xóa chính bản thân" });

    // Try hard delete first, if failed because of foreign key, then soft delete
    try {
      await pool.query("DELETE FROM users WHERE id=$1", [req.params.id]);
    } catch (dbErr) {
      // 23503 is foreign_key_violation in pg
      if (dbErr.code === '23503') {
        await pool.query("UPDATE users SET status='disabled' WHERE id=$1", [req.params.id]);
        return res.json({ message: "User disabled due to existing related records" });
      } else {
        throw dbErr;
      }
    }
    res.json({ message: "User deleted successfully" });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post("/admin/users/:id/approve", authRequired, requireRole("admin"), async (req, res) => {
  const userId = req.params.id;
  try {
    const userRs = await pool.query("SELECT * FROM users WHERE id=$1", [userId]);
    if (userRs.rows.length === 0) return res.status(404).json({ error: "User not found" });
    const user = userRs.rows[0];

    if (user.status !== "pending") {
      return res.status(400).json({ error: "Tài khoản này không ở trạng thái Chờ duyệt." });
    }

    // Calculate next wallet index
    const rsMax = await pool.query("SELECT MAX(wallet_index) as m FROM users");
    const maxIdx = rsMax.rows[0].m !== null ? rsMax.rows[0].m : -1;
    const nextIdx = maxIdx + 1;

    const wallet = deriveWallet(nextIdx);

    const updateRs = await pool.query(
      `UPDATE users 
       SET status='active', wallet_index=$1, wallet_address=$2 
       WHERE id=$3 
       RETURNING id, username, full_name, role, wallet_address, status, student_id, student_card_image, created_at`,
      [nextIdx, wallet.address, userId]
    );

    res.json({
      message: "Phê duyệt tài khoản sinh viên thành công!",
      user: updateRs.rows[0]
    });
  } catch (e) {
    console.error("Approve student error:", e);
    res.status(500).json({ error: e.message });
  }
});

app.post("/admin/users/:id/reject", authRequired, requireRole("admin"), async (req, res) => {
  const userId = req.params.id;
  try {
    const userRs = await pool.query("SELECT * FROM users WHERE id=$1", [userId]);
    if (userRs.rows.length === 0) return res.status(404).json({ error: "User not found" });
    const user = userRs.rows[0];

    if (user.status !== "pending") {
      return res.status(400).json({ error: "Tài khoản này không ở trạng thái Chờ duyệt." });
    }

    const updateRs = await pool.query(
      "UPDATE users SET status='rejected' WHERE id=$1 RETURNING id, username, full_name, status, created_at",
      [userId]
    );

    res.json({
      message: "Đã từ chối duyệt tài khoản sinh viên.",
      user: updateRs.rows[0]
    });
  } catch (e) {
    console.error("Reject student error:", e);
    res.status(500).json({ error: e.message });
  }
});

// wallets management (admin)
app.get("/wallets/all", authRequired, requireRole("admin"), async (req, res) => {
  try {
    const usersRes = await pool.query(
      "SELECT id, username, full_name, role, wallet_address, wallet_index, student_card_image, created_at FROM users ORDER BY role, full_name"
    );
    const users = usersRes.rows;

    // Fetch on-chain balances in parallel
    const withBalances = await Promise.all(users.map(async (u) => {
      try {
        const bal = await ugcContract.balanceOf(u.wallet_address);
        return { ...u, ugc_balance: Number(bal) };
      } catch {
        return { ...u, ugc_balance: 0 };
      }
    }));

    res.json(withBalances);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// leaderboard (public)
app.get("/ugc/leaderboard", authRequired, async (req, res) => {
  try {
    const usersRes = await pool.query(
      "SELECT id, username, full_name, role, wallet_address, avatar_url FROM users WHERE role = 'student'"
    );
    const users = usersRes.rows;

    const withBalances = await Promise.all(users.map(async (u) => {
      try {
        if (!u.wallet_address) return { id: u.id, username: u.username, full_name: u.full_name, avatar_url: u.avatar_url, ugc_balance: 0 };
        const bal = await ugcContract.balanceOf(u.wallet_address);
        return { id: u.id, username: u.username, full_name: u.full_name, avatar_url: u.avatar_url, ugc_balance: Number(bal) };
      } catch {
        return { id: u.id, username: u.username, full_name: u.full_name, avatar_url: u.avatar_url, ugc_balance: 0 };
      }
    }));

    const sorted = withBalances.sort((a, b) => b.ugc_balance - a.ugc_balance);

    const ranked = sorted.map((u, idx) => ({
      id: u.id,
      username: u.username,
      full_name: u.full_name,
      avatar_url: u.avatar_url,
      ugc_balance: u.ugc_balance,
      rank: idx + 1
    }));

    const myRank = ranked.find(u => u.id === req.user.id);

    const top3 = ranked.slice(0, 3);

    res.json({
      success: true,
      top3,
      me: myRank || { id: req.user.id, username: req.user.username, full_name: req.user.full_name, avatar_url: null, ugc_balance: 0, rank: Math.max(15, ranked.length + 1) },
      all: ranked
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});


// wallet
app.get("/wallet/balance", authRequired, async (req, res) => {
  const address = req.user.wallet_address;
  if (!address) return res.json({ address: null, balance: 0 });
  try {
    const bal = await ugcContract.balanceOf(address);
    res.json({ address, balance: Number(bal) });
  } catch (e) {
    res.json({ address, balance: 0 });
  }
});

app.get("/wallet/contract", authRequired, async (req, res) => {
  res.json({ address: ugcAddress });
});

app.get("/wallet/history", authRequired, async (req, res) => {
  const address = req.user.wallet_address;
  if (!address) return res.json([]);

  try {
    const issued = await ugcContract.queryFilter(ugcContract.filters.CreditsIssued(address), 0, "latest");
    const burned = await ugcContract.queryFilter(ugcContract.filters.CreditsBurned(address), 0, "latest");

    const normalize = (ev, type) => {
      const args = ev.args || [];
      if (type === "ISSUE") {
        return {
          type,
          blockNumber: ev.blockNumber,
          txHash: ev.transactionHash,
          to: args[0],
          amount: Number(args[1]),
          refId: args[2],
          evidenceHash: args[3]
        };
      }
      return {
        type,
        blockNumber: ev.blockNumber,
        txHash: ev.transactionHash,
        from: args[0],
        amount: Number(args[1]),
        burnType: Number(args[2]),
        refId: args[3],
        reasonHash: args[4]
      };
    };

    const items = [
      ...issued.map(ev => normalize(ev, "ISSUE")),
      ...burned.map(ev => normalize(ev, "BURN"))
    ];
    items.sort((a, b) => b.blockNumber - a.blockNumber);
    res.json(items);
  } catch (e) {
    res.json([]);
  }
});

// reward categories
app.get("/reward-categories", authRequired, async (req, res) => {
  const rs = await pool.query("SELECT * FROM reward_categories ORDER BY name ASC");
  res.json(rs.rows);
});

app.post("/reward-categories", authRequired, requireRole("admin"), async (req, res) => {
  const { name, description } = req.body || {};
  if (!name) return res.status(400).json({ error: "name required" });
  const rs = await pool.query("INSERT INTO reward_categories(name, description) VALUES($1,$2) RETURNING *", [name, description || ""]);
  res.json(rs.rows[0]);
});

app.delete("/reward-categories/:id", authRequired, requireRole("admin"), async (req, res) => {
  try {
    await pool.query("DELETE FROM reward_categories WHERE id=$1", [req.params.id]);
    res.json({ message: "Deleted" });
  } catch (e) {
    res.status(400).json({ error: "Cannot delete category as it is being used by rewards." });
  }
});

// rewards
app.get("/rewards", authRequired, async (req, res) => {
  const where = req.user.role === "admin" ? "" : "WHERE r.status='active'";
  const rs = await pool.query(`
    SELECT r.*, c.name as category_name 
    FROM rewards r 
    LEFT JOIN reward_categories c ON r.category_id = c.id 
    ${where} 
    ORDER BY r.created_at DESC
  `);
  res.json(rs.rows);
});

app.get("/rewards/stats", authRequired, requireRole("admin"), async (req, res) => {
  try {
    const [totalRes, ugcRes, popularRes, lowStockRes] = await Promise.all([
      pool.query("SELECT COUNT(*) FROM rewards"),
      pool.query("SELECT COALESCE(SUM(cost_credits), 0) AS total FROM redemptions"),
      pool.query(`
        SELECT r.id, r.title, COUNT(rd.id) AS redeem_count
        FROM rewards r
        LEFT JOIN redemptions rd ON rd.reward_id = r.id
        GROUP BY r.id, r.title
        ORDER BY redeem_count DESC
        LIMIT 1
      `),
      pool.query("SELECT COUNT(*) FROM rewards WHERE stock <= 5 AND status = 'active'")
    ]);

    res.json({
      total: parseInt(totalRes.rows[0].count, 10),
      total_ugc_redeemed: parseInt(ugcRes.rows[0].total, 10),
      most_popular: popularRes.rows[0] || null,
      low_stock: parseInt(lowStockRes.rows[0].count, 10)
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Lỗi server" });
  }
});

app.post("/rewards", authRequired, requireRole("admin"), async (req, res) => {
  const { title, description, cost_credits, stock, category_id, limit_per_student, status, image_url, start_date, expiry_date } = req.body || {};
  if (!title || cost_credits === undefined) return res.status(400).json({ error: "title & cost_credits required" });

  const rs = await pool.query(
    `INSERT INTO rewards(title, description, cost_credits, stock, category_id, limit_per_student, status, created_by, image_url, start_date, expiry_date)
     VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`,
    [title, description || "", Number(cost_credits), Number(stock || 0), category_id || null, Number(limit_per_student || 1), status || "active", req.user.id, image_url || null, start_date || null, expiry_date || null]
  );
  res.json(rs.rows[0]);
});

app.put("/rewards/:id", authRequired, requireRole("admin"), async (req, res) => {
  const { title, description, cost_credits, stock, category_id, limit_per_student, status, image_url, start_date, expiry_date } = req.body || {};
  if (!title || cost_credits === undefined) return res.status(400).json({ error: "title & cost_credits required" });

  try {
    const rs = await pool.query(
      `UPDATE rewards 
       SET title=$1, description=$2, cost_credits=$3, stock=$4, category_id=$5, limit_per_student=$6, status=$7, image_url=$8, start_date=$9, expiry_date=$10
       WHERE id=$11 RETURNING *`,
      [title, description || "", Number(cost_credits), Number(stock || 0), category_id || null, Number(limit_per_student || 1), status || "active", image_url || null, start_date || null, expiry_date || null, req.params.id]
    );
    if (rs.rows.length === 0) return res.status(404).json({ error: "Reward not found" });
    res.json(rs.rows[0]);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.delete("/rewards/:id", authRequired, requireRole("admin"), async (req, res) => {
  try {
    const rs = await pool.query("DELETE FROM rewards WHERE id=$1 RETURNING *", [req.params.id]);
    if (rs.rows.length === 0) return res.status(404).json({ error: "Reward not found" });
    res.json({ success: true, deleted: rs.rows[0] });
  } catch (e) {
    if (e.code === '23503') { // Foreign key violation
      return res.status(400).json({ error: "Không thể xóa vì đã có sinh viên đổi phần thưởng này." });
    }
    res.status(500).json({ error: e.message });
  }
});

app.post("/rewards/:id/redeem", authRequired, requireRole("student"), async (req, res) => {
  const rewardId = req.params.id;

  const rewardRs = await pool.query("SELECT * FROM rewards WHERE id=$1", [rewardId]);
  const reward = rewardRs.rows[0];
  if (!reward) return res.status(404).json({ error: "Reward not found" });
  if (reward.status !== "active") return res.status(400).json({ error: "Reward inactive" });
  if (reward.stock <= 0) return res.status(400).json({ error: "Out of stock" });

  const cost = Number(reward.cost_credits);

  // Burn credits (REDEEM = 0)
  const redemptionId = uuidv4();
  const refId = ethers.id(redemptionId);
  const reasonHash = ethers.id(reward.title);

  const signer = getSignerForRole("admin"); // BURNER_ROLE in contract is owned by admin
  const contractWithSigner = ugcContract.connect(signer);

  let txHash = null;
  try {
    const tx = await contractWithSigner.burn(req.user.wallet_address, cost, 0, refId, reasonHash);
    const receipt = await tx.wait();
    txHash = receipt?.hash || tx.hash;
  } catch (e) {
    console.error("Blockchain burn failed:", e);
    return res.status(500).json({ error: "Blockchain transaction failed", details: e.message });
  }

  await pool.query(
    "INSERT INTO redemptions(id, reward_id, student_id, cost_credits, tx_hash) VALUES($1,$2,$3,$4,$5)",
    [redemptionId, rewardId, req.user.id, cost, txHash]
  );
  await pool.query("UPDATE rewards SET stock=stock-1 WHERE id=$1", [rewardId]);

  res.json({ id: redemptionId, reward_id: rewardId, cost_credits: cost, tx_hash: txHash });
});

// retire credits (optional)
app.post("/wallet/retire", authRequired, requireRole("student"), async (req, res) => {
  const amount = Number(req.body?.amount || 0);
  const reason = String(req.body?.reason || "retire");
  if (!amount || amount <= 0) return res.status(400).json({ error: "amount must be > 0" });

  const retirementId = uuidv4();
  const refId = ethers.id(retirementId);
  const reasonHash = ethers.id(reason);

  const signer = getSignerForRole("admin");
  const contractWithSigner = ugcContract.connect(signer);

  let txHash = null;
  try {
    const tx = await contractWithSigner.burn(req.user.wallet_address, amount, 1, refId, reasonHash);
    const receipt = await tx.wait();
    txHash = receipt?.hash || tx.hash;
  } catch (e) {
    console.error("Blockchain retire failed:", e);
    return res.status(500).json({ error: "Blockchain transaction failed", details: e.message });
  }

  await pool.query(
    "INSERT INTO retirements(id, student_id, amount, reason, tx_hash) VALUES($1,$2,$3,$4,$5)",
    [retirementId, req.user.id, amount, reason, txHash]
  );

  res.json({ id: retirementId, amount, reason, tx_hash: txHash });
});

// ─────────────────────────────────────────────────────────────────────────────
// ── CREDIT PROVENANCE — Truy xuất nguồn gốc tín chỉ xanh ────────────────────
// ─────────────────────────────────────────────────────────────────────────────

/**
 * GET /provenance/my
 * Lấy danh sách provenance của sinh viên đang đăng nhập (hoặc tất cả nếu admin/verifier).
 */
app.get("/provenance/my", authRequired, async (req, res) => {
  try {
    let query;
    let params = [];

    if (req.user.role === "student") {
      query = `
        SELECT c.id, c.status, c.approved_tx_hash, c.provenance_tx_hash,
               c.evidence_hash, c.evidence_path, c.decided_at, c.created_at,
               e.title AS event_title, e.location, e.start_at,
               a.name AS activity_name, a.credit_amount,
               u2.full_name AS approver_name
        FROM claims c
        JOIN events e ON e.id = c.event_id
        JOIN activity_types a ON a.id = e.activity_type_id
        LEFT JOIN users u2 ON u2.id = c.approver_id
        WHERE c.student_id = $1 AND c.status = 'approved'
        ORDER BY c.decided_at DESC
      `;
      params = [req.user.id];
    } else {
      // admin / verifier: see all approved claims
      query = `
        SELECT c.id, c.status, c.approved_tx_hash, c.provenance_tx_hash,
               c.evidence_hash, c.evidence_path, c.decided_at, c.created_at,
               e.title AS event_title, e.location, e.start_at,
               a.name AS activity_name, a.credit_amount,
               u1.full_name AS student_name, u1.wallet_address AS student_wallet,
               u2.full_name AS approver_name
        FROM claims c
        JOIN events e ON e.id = c.event_id
        JOIN activity_types a ON a.id = e.activity_type_id
        JOIN users u1 ON u1.id = c.student_id
        LEFT JOIN users u2 ON u2.id = c.approver_id
        WHERE c.status = 'approved'
        ORDER BY c.decided_at DESC
      `;
    }

    const rs = await pool.query(query, params);
    res.json(rs.rows);
  } catch (e) {
    console.error("GET /provenance/my error:", e);
    res.status(500).json({ error: e.message });
  }
});

/**
 * GET /provenance/claim/:claimId
 * Lấy full provenance của 1 claim: DB info + on-chain provenance record.
 */
app.get("/provenance/claim/:claimId", authRequired, async (req, res) => {
  try {
    const claimId = req.params.claimId;

    // Off-chain data from DB
    const claimRs = await pool.query(
      `SELECT c.id, c.status, c.approved_tx_hash, c.provenance_tx_hash,
              c.evidence_hash, c.evidence_path, c.note, c.decided_at, c.created_at,
              e.title AS event_title, e.location, e.start_at, e.end_at, e.description AS event_description,
              a.name AS activity_name, a.credit_amount, a.description AS activity_description,
              u1.full_name AS student_name, u1.wallet_address AS student_wallet, u1.student_id,
              u2.full_name AS approver_name, u2.wallet_address AS approver_wallet, u2.role AS approver_role
       FROM claims c
       JOIN events e ON e.id = c.event_id
       JOIN activity_types a ON a.id = e.activity_type_id
       JOIN users u1 ON u1.id = c.student_id
       LEFT JOIN users u2 ON u2.id = c.approver_id
       WHERE c.id = $1`,
      [claimId]
    );

    const claim = claimRs.rows[0];
    if (!claim) return res.status(404).json({ error: "Claim not found" });

    // Only owner or admin/verifier can view
    if (req.user.role === "student" && claim.student_wallet !== req.user.wallet_address) {
      return res.status(403).json({ error: "Forbidden" });
    }

    // On-chain provenance data
    let onChainRecord = null;
    let onChainError = null;
    if (provenanceContract) {
      try {
        const refId = ethers.id(String(claimId));
        const hasRecord = await provenanceContract.hasRecord(refId);
        if (hasRecord) {
          const rec = await provenanceContract.getRecord(refId);
          onChainRecord = {
            claimId: rec.claimId,
            activityHash: rec.activityHash,
            eventHash: rec.eventHash,
            evidenceHash: rec.evidenceHash,
            student: rec.student,
            approver: rec.approver,
            timestamp: Number(rec.timestamp),
            creditAmount: Number(rec.creditAmount)
          };
        }
      } catch (e) {
        onChainError = e.message;
        console.warn("On-chain provenance fetch error:", e.message);
      }
    }

    // Evidence integrity check
    let evidenceVerified = null;
    if (onChainRecord && claim.evidence_hash) {
      const offChainBytes32 = toBytes32FromHex(claim.evidence_hash);
      evidenceVerified = onChainRecord.evidenceHash.toLowerCase() === offChainBytes32.toLowerCase();
    }

    // Block info for issue tx
    let issueTxBlock = null;
    if (claim.approved_tx_hash && provider) {
      try {
        const receipt = await provider.getTransactionReceipt(claim.approved_tx_hash);
        if (receipt) {
          const block = await provider.getBlock(receipt.blockNumber);
          issueTxBlock = {
            blockNumber: receipt.blockNumber,
            timestamp: block ? Number(block.timestamp) : null
          };
        }
      } catch (e) {
        console.warn("Block fetch for issue TX error:", e.message);
      }
    }

    res.json({
      claim,
      onChainRecord,
      onChainError,
      evidenceVerified,
      issueTxBlock,
      contracts: {
        ugcAddress,
        provenanceAddress
      }
    });
  } catch (e) {
    console.error("GET /provenance/claim error:", e);
    res.status(500).json({ error: e.message });
  }
});

/**
 * GET /public/verify/:query
 * Tra cứu CÔNG KHAI 1 giao dịch blockchain hoặc Claim ID
 */
app.get("/public/verify/:query", async (req, res) => {
  try {
    const { query } = req.params;

    const issueRs = await pool.query(
      `SELECT c.id, c.approved_tx_hash, c.provenance_tx_hash, c.evidence_hash, c.decided_at, c.created_at, c.evidence_path,
              ch.latitude, ch.longitude,
              e.title AS event_title, a.name AS activity_name, a.credit_amount,
              u1.full_name AS student_name, u1.student_id, u1.wallet_address AS student_wallet, 
              u2.full_name AS approver_name
       FROM claims c
       JOIN events e ON e.id = c.event_id
       JOIN activity_types a ON a.id = e.activity_type_id
       JOIN users u1 ON u1.id = c.student_id
       LEFT JOIN users u2 ON u2.id = c.approver_id
       LEFT JOIN checkins ch ON ch.event_id = c.event_id AND ch.student_id = c.student_id
       WHERE c.approved_tx_hash = $1 OR c.provenance_tx_hash = $1 OR c.id::text = $1 OR u1.wallet_address ILIKE $1
       ORDER BY c.id DESC
       LIMIT 1`,
      [query]
    );

    if (issueRs.rows.length === 0) {
      return res.json({ found: false });
    }

    const claim = issueRs.rows[0];

    // On-chain receipt
    let receipt = null;
    let block = null;
    try {
      if (claim.provenance_tx_hash || claim.approved_tx_hash) {
        const hashToFind = claim.provenance_tx_hash || claim.approved_tx_hash;
        receipt = await provider.getTransactionReceipt(hashToFind);
        if (receipt) {
          block = await provider.getBlock(receipt.blockNumber);
        }
      }
    } catch (e) {
      console.warn("TX receipt fetch error:", e.message);
    }

    res.json({
      query,
      found: true,
      claim: claim,
      receipt: receipt ? {
        blockNumber: receipt.blockNumber,
        status: receipt.status,
        contractAddress: receipt.to,
        gasUsed: receipt.gasUsed?.toString()
      } : null,
      blockTimestamp: block ? Number(block.timestamp) : null,
      network: "ULSA Green Chain (Local)",
      contracts: { ugcAddress, provenanceAddress }
    });
  } catch (e) {
    console.error("GET /api/public/verify error:", e);
    res.status(500).json({ error: e.message });
  }
});

/**
 * GET /provenance/verify/:txHash
 * Tra cứu nhanh 1 giao dịch blockchain và trả về thông tin liên quan.
 */
app.get("/provenance/verify/:txHash", authRequired, async (req, res) => {
  try {
    const { txHash } = req.params;

    // Look up in DB: is it an issue tx or provenance tx?
    const issueRs = await pool.query(
      `SELECT c.id, c.approved_tx_hash, c.provenance_tx_hash, c.evidence_hash, c.decided_at,
              e.title AS event_title, a.name AS activity_name, a.credit_amount,
              u1.full_name AS student_name, u2.full_name AS approver_name
       FROM claims c
       JOIN events e ON e.id = c.event_id
       JOIN activity_types a ON a.id = e.activity_type_id
       JOIN users u1 ON u1.id = c.student_id
       LEFT JOIN users u2 ON u2.id = c.approver_id
       WHERE c.approved_tx_hash = $1 OR c.provenance_tx_hash = $1
       LIMIT 1`,
      [txHash]
    );

    // On-chain receipt
    let receipt = null;
    let block = null;
    try {
      receipt = await provider.getTransactionReceipt(txHash);
      if (receipt) {
        block = await provider.getBlock(receipt.blockNumber);
      }
    } catch (e) {
      console.warn("TX receipt fetch error:", e.message);
    }

    res.json({
      txHash,
      found: issueRs.rows.length > 0,
      claim: issueRs.rows[0] || null,
      receipt: receipt ? {
        blockNumber: receipt.blockNumber,
        status: receipt.status, // 1 = success
        contractAddress: receipt.to,
        gasUsed: receipt.gasUsed?.toString()
      } : null,
      blockTimestamp: block ? Number(block.timestamp) : null,
      contracts: { ugcAddress, provenanceAddress }
    });
  } catch (e) {
    console.error("GET /provenance/verify error:", e);
    res.status(500).json({ error: e.message });
  }
});

// analytics (admin)
app.get("/analytics/overview", authRequired, requireRole("admin"), async (req, res) => {
  const users = await pool.query("SELECT COUNT(*)::int AS n FROM users");
  const events = await pool.query("SELECT COUNT(*)::int AS n FROM events");
  const claims = await pool.query("SELECT COUNT(*)::int AS n FROM claims");
  const approved = await pool.query("SELECT COUNT(*)::int AS n FROM claims WHERE status='approved'");

  const totalIssued = Number(await ugcContract.totalIssued());
  const totalBurned = Number(await ugcContract.totalBurned());
  const supply = Number(await ugcContract.totalSupply());

  res.json({
    users: users.rows[0].n,
    events: events.rows[0].n,
    claims: claims.rows[0].n,
    approvedClaims: approved.rows[0].n,
    token: {
      contract: ugcAddress,
      totalIssued,
      totalBurned,
      totalSupply: supply
    }
  });
});


// analytics weekly claims (admin)
app.get("/analytics/weekly-claims", authRequired, requireRole("admin"), async (req, res) => {
  try {
    const rs = await pool.query(`
      SELECT 
        TO_CHAR(DATE(c.decided_at), 'DD/MM') AS day,
        DATE(c.decided_at) AS date,
        COUNT(*)::int AS count,
        COALESCE(SUM(a.credit_amount), 0)::int AS total_credits
      FROM claims c
      JOIN events e ON e.id = c.event_id
      JOIN activity_types a ON a.id = e.activity_type_id
      WHERE c.status = 'approved'
        AND c.decided_at >= NOW() - INTERVAL '28 days'
      GROUP BY DATE(c.decided_at), TO_CHAR(DATE(c.decided_at), 'DD/MM')
      ORDER BY date ASC
    `);
    res.json(rs.rows);
  } catch (e) {
    console.error("weekly-claims error:", e);
    res.status(500).json({ error: e.message });
  }
});

// dashboard stats (admin)

app.get("/dashboard/stats", authRequired, requireRole("admin"), async (req, res) => {
  try {
    const period = req.query.period || 'month';
    let interval = '30 days';
    if (period === 'week') interval = '7 days';
    else if (period === 'quarter') interval = '90 days';
    else if (period === 'year') interval = '365 days';

    const [pendingRes, studentRes, supplyRes, recentClaimsRes, topEventsRes, txHistoryRes] = await Promise.all([
      pool.query("SELECT COUNT(*)::int AS n FROM claims WHERE status='submitted'"),
      pool.query("SELECT COUNT(*)::int AS n FROM users WHERE role='student'"),
      Promise.resolve(Number(await ugcContract.totalSupply())),
      pool.query(`
        SELECT c.id, c.status, c.created_at, a.credit_amount,
               u.full_name AS student_name,
               e.title AS event_title,
               a.name AS activity_name
        FROM claims c
        JOIN users u ON u.id = c.student_id
        JOIN events e ON e.id = c.event_id
        JOIN activity_types a ON a.id = e.activity_type_id
        WHERE c.status = 'submitted'
        ORDER BY c.created_at DESC LIMIT 5
      `),
      pool.query(`
        SELECT e.title, a.name AS activity_name,
               COUNT(c.id)::int AS participant_count,
               e.status
        FROM events e
        JOIN activity_types a ON a.id = e.activity_type_id
        LEFT JOIN claims c ON c.event_id = e.id
        GROUP BY e.id, e.title, a.name, e.status
        ORDER BY participant_count DESC LIMIT 5
      `),
      pool.query(`
        SELECT day, SUM(total_ugc)::int AS total_ugc
        FROM (
          SELECT DATE(created_at) AS day, amount AS total_ugc 
          FROM retirements 
          WHERE created_at >= NOW() - INTERVAL '${interval}'
          UNION ALL
          SELECT DATE(created_at) AS day, cost_credits AS total_ugc 
          FROM redemptions 
          WHERE created_at >= NOW() - INTERVAL '${interval}'
        ) t
        GROUP BY day ORDER BY day
      `)
    ]);

    const blockNumber = await provider.getBlockNumber();

    res.json({
      pendingClaims: pendingRes.rows[0].n,
      totalStudents: studentRes.rows[0].n,
      totalSupply: supplyRes,
      ugcContractAddress: ugcAddress,
      recentClaims: recentClaimsRes.rows,
      topEvents: topEventsRes.rows,
      txHistory: txHistoryRes.rows,
      blockNumber,
    });
  } catch (e) {
    console.error("Dashboard stats error:", e);
    res.status(500).json({ error: e.message });
  }
});

// Thống kê Tín chỉ Xanh (UGC) trong 7 ngày gần nhất của một sinh viên
app.get("/ugc/weekly-stats/:studentId", authRequired, async (req, res) => {
  const { studentId } = req.params;

  // Bảo mật: Chỉ cho phép chính sinh viên đó hoặc admin/verifier truy cập
  if (req.user.role === 'student' && req.user.id !== studentId) {
    return res.status(403).json({ error: "Bạn không có quyền truy cập dữ liệu thống kê này." });
  }

  try {
    // Truy vấn tổng UGC đã duyệt theo ngày trong vòng 7 ngày gần nhất
    const query = `
      SELECT 
        DATE(COALESCE(c.decided_at, c.created_at)) AS stat_date,
        SUM(a.credit_amount)::int AS total_ugc,
        COUNT(c.id)::int AS activity_count
      FROM claims c
      JOIN events e ON e.id = c.event_id
      JOIN activity_types a ON a.id = e.activity_type_id
      WHERE c.student_id = $1 
        AND c.status = 'approved'
        AND COALESCE(c.decided_at, c.created_at) >= NOW() - INTERVAL '6 days'
      GROUP BY DATE(COALESCE(c.decided_at, c.created_at))
      ORDER BY stat_date ASC
    `;

    const { rows } = await pool.query(query, [studentId]);

    // Ánh xạ kết quả truy vấn vào Map để tìm kiếm nhanh
    const dbDataMap = new Map(
      rows.map(row => [new Date(row.stat_date).toDateString(), row])
    );

    const weeklyStats = [];
    const weekdays = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];

    // Thực hiện đệm dữ liệu (fill gaps) cho 7 ngày qua
    for (let i = 6; i >= 0; i--) {
      const targetDate = new Date();
      targetDate.setDate(targetDate.getDate() - i);
      const dateKey = targetDate.toDateString();

      const dayName = weekdays[targetDate.getDay()];
      const formattedDate = targetDate.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" });

      if (dbDataMap.has(dateKey)) {
        const dbRow = dbDataMap.get(dateKey);
        weeklyStats.push({
          day: dayName,
          date: formattedDate,
          total_ugc: dbRow.total_ugc || 0,
          activity_count: dbRow.activity_count || 0
        });
      } else {
        // Đệm ngày không hoạt động với điểm bằng 0
        weeklyStats.push({
          day: dayName,
          date: formattedDate,
          total_ugc: 0,
          activity_count: 0
        });
      }
    }

    // Tính tổng UGC của tuần
    const totalWeeklyUgc = weeklyStats.reduce((sum, item) => sum + item.total_ugc, 0);

    res.json({
      success: true,
      data: weeklyStats,
      total_weekly_ugc: totalWeeklyUgc
    });

  } catch (error) {
    console.error("Lỗi lấy thống kê tuần UGC:", error);
    res.status(500).json({ error: "Lỗi hệ thống khi tải dữ liệu thống kê." });
  }
});

// Đổi mật khẩu tài khoản
app.post("/me/change-password", authRequired, async (req, res) => {
  const { oldPassword, newPassword } = req.body || {};
  if (!oldPassword || !newPassword) {
    return res.status(400).json({ error: "Vui lòng nhập mật khẩu cũ và mật khẩu mới." });
  }
  try {
    const rs = await pool.query("SELECT password_hash FROM users WHERE id=$1", [req.user.id]);
    const user = rs.rows[0];
    if (!user) return res.status(404).json({ error: "Không tìm thấy người dùng." });

    const ok = bcrypt.compareSync(oldPassword, user.password_hash);
    if (!ok) return res.status(400).json({ error: "Mật khẩu cũ không chính xác." });

    const newHash = bcrypt.hashSync(newPassword, 10);
    await pool.query("UPDATE users SET password_hash=$1 WHERE id=$2", [newHash, req.user.id]);

    res.json({ success: true, message: "Đổi mật khẩu thành công!" });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Xuất Khóa bí mật (Private Key) của ví
app.get("/me/wallet-key", authRequired, async (req, res) => {
  try {
    const rs = await pool.query("SELECT wallet_index, wallet_address FROM users WHERE id=$1", [req.user.id]);
    const user = rs.rows[0];
    if (!user) return res.status(404).json({ error: "Không tìm thấy người dùng." });
    if (user.wallet_index === null) {
      return res.status(400).json({ error: "Tài khoản chưa được cấp ví blockchain." });
    }

    const wallet = deriveWallet(user.wallet_index);
    res.json({
      success: true,
      address: wallet.address,
      privateKey: wallet.privateKey,
      mnemonic: MNEMONIC,
      path: `m/44'/60'/0'/0/${user.wallet_index}`
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Cập nhật thông tin hồ sơ cá nhân
app.put("/me/profile", authRequired, async (req, res) => {
  const { full_name, class_name, cohort, birth_date, email } = req.body || {};
  try {
    const rs = await pool.query(
      `UPDATE users 
       SET full_name = COALESCE($1, full_name),
           class_name = COALESCE($2, class_name),
           cohort = COALESCE($3, cohort),
           birth_date = COALESCE($4, birth_date),
           email = COALESCE($5, email)
       WHERE id = $6 
       RETURNING id, username, full_name, email, role, wallet_address, student_card_image, class_name, cohort, birth_date`,
      [full_name, class_name, cohort, birth_date, email, req.user.id]
    );
    res.json({ success: true, user: rs.rows[0] });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Upload ảnh đại diện
app.post("/me/avatar", authRequired, upload.single("avatar"), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: "Missing avatar image file" });
  try {
    const avatarUrl = "/uploads/" + req.file.filename;
    const rs = await pool.query(
      `UPDATE users SET avatar_url = $1 WHERE id = $2 RETURNING id, username, full_name, email, avatar_url, role, wallet_address, student_card_image, class_name, cohort, birth_date`,
      [avatarUrl, req.user.id]
    );
    res.json({ success: true, user: rs.rows[0] });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// -------------------- Chatbot (Gemini proxy) --------------------
app.post("/api/chat", authRequired, async (req, res) => {
  const { messages } = req.body || {};
  if (!Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: "messages array required" });
  }

  // If Gemini not configured, return null so frontend uses fallback
  if (!genAI) {
    return res.json({ reply: null, fallback: true });
  }

  try {
    const { GoogleGenerativeAI } = require("@google/generative-ai");
    const ai = new GoogleGenerativeAI(GEMINI_API_KEY);
    const model = ai.getGenerativeModel({
      model: "gemini-2.0-flash",
      systemInstruction: `Bạn là ULSA Bot - trợ lý AI thông minh toàn diện, được tích hợp vào hệ thống ULSA Green Credit. Bạn được xây dựng trên nền tảng Gemini AI của Google, có khả năng trả lời mọi câu hỏi về bất kỳ chủ đề nào.

## VAI TRÒ CHÍNH
Bạn là chuyên gia về hệ thống ULSA Green Credit, đồng thời là trợ lý thông minh tổng hợp. Bạn có thể:
- Trả lời câu hỏi về hệ thống tín chỉ xanh UGC, claims, blockchain, ưu đãi, điểm rèn luyện
- Giải đáp câu hỏi học thuật: toán, lý, hóa, văn, lịch sử, địa lý, sinh học...
- Hỗ trợ lập trình: JavaScript, Python, Java, C++, React, Node.js...
- Tư vấn kỹ năng sống, học tập, phát triển bản thân
- Và mọi chủ đề khác

## KIẾN THỨC VỀ ULSA GREEN CREDIT
- UGC (ULSA Green Credit) là token ERC-20 trên Ethereum blockchain
- Sinh viên nhận UGC khi tham gia hoạt động xanh được phê duyệt
- Có thể đổi UGC lấy ưu đãi từ đối tác trường

## PHONG CÁCH TRẢ LỜI
- Ngôn ngữ: Mặc định tiếng Việt, tự chuyển nếu người dùng hỏi ngôn ngữ khác
- Thân thiện, tự nhiên, dùng emoji phù hợp
- Không từ chối các câu hỏi bình thường`
    });

    // Convert messages to Gemini format
    const history = messages.slice(0, -1).map(m => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }]
    }));
    const lastMessage = messages[messages.length - 1];

    const chat = model.startChat({ history });
    const result = await chat.sendMessage(lastMessage.content);
    const reply = result.response.text();

    res.json({ reply });
  } catch (e) {
    console.error("Chat API error:", e.message);
    // Return fallback signal instead of error so frontend handles gracefully
    res.json({ reply: null, fallback: true, error: e.message });
  }
});

// -------------------- start --------------------
async function main() {
  await waitForDb();
  await initBlockchain();
  await seedIfNeeded();

  app.listen(PORT, () => {
    console.log(`✅ Backend listening on http://localhost:${PORT}`);
  });
}

main().catch((e) => {
  console.error("Fatal:", e);
  process.exit(1);
});
