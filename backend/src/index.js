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
      { username: "admin",    full_name: "Admin ULSA (Hội đồng 1)", role: "admin", wallet_index: 0, password: "admin123" },
      { username: "admin2",   full_name: "Admin ULSA (Hội đồng 2)", role: "admin", wallet_index: 1, password: "admin456" },
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

  // event
  const eCount = await pool.query("SELECT COUNT(*)::int AS n FROM events");
  if (eCount.rows[0].n === 0) {
    console.log("Seeding one demo event...");
    const verifier = (await pool.query("SELECT id FROM users WHERE role='verifier' LIMIT 1")).rows[0];
    const hiemMau = (await pool.query("SELECT id FROM activity_types WHERE name='Hiến máu' LIMIT 1")).rows[0];

    if (!verifier || !hiemMau) {
      console.log("Could not find verifier or 'Hiến máu' activity type. Skipping demo event seeding.");
    } else {
      const qr_token = crypto.randomBytes(16).toString("hex");
      const now = new Date();
      const start = new Date(now.getTime() + 60 * 60 * 1000);
      const end = new Date(now.getTime() + 3 * 60 * 60 * 1000);

      await pool.query(
        "INSERT INTO events(activity_type_id, title, description, organizer_id, start_at, end_at, location, qr_token, status) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)",
        [hiemMau.id, "Sự kiện hiến máu (demo)", "Quét QR để ghi nhận tham gia và nhận tín chỉ xanh.", verifier.id, start, end, "Khu A - Hội trường", qr_token, "published"]
      );
    }
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
      wallet_address: user.wallet_address
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

    const normId  = (s) => (s || "").replace(/\s/g, "");
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
              u.full_name AS student_name
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
  const rs = await pool.query("SELECT id, username, full_name, role, wallet_address, created_at FROM users WHERE id=$1", [req.user.id]);
  res.json(rs.rows[0]);
});

// activity types
app.get("/activity-types", authRequired, async (req, res) => {
  const rs = await pool.query("SELECT * FROM activity_types ORDER BY created_at DESC");
  res.json(rs.rows);
});

app.post("/activity-types", authRequired, requireRole("admin"), async (req, res) => {
  const { name, description, credit_amount, evidence_required } = req.body || {};
  if (!name || credit_amount === undefined) return res.status(400).json({ error: "name & credit_amount required" });

  const rs = await pool.query(
    "INSERT INTO activity_types(name, description, credit_amount, evidence_required, created_by) VALUES($1,$2,$3,$4,$5) RETURNING *",
    [name, description || "", Number(credit_amount), evidence_required !== false, req.user.id]
  );
  res.json(rs.rows[0]);
});

app.put("/activity-types/:id", authRequired, requireRole("admin"), async (req, res) => {
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
  const rs = await pool.query(
    `SELECT e.*, a.name AS activity_name, a.credit_amount, a.description AS activity_description
     FROM events e
     JOIN activity_types a ON a.id = e.activity_type_id
     ORDER BY e.created_at DESC`
  );
  res.json(rs.rows);
});

app.post("/events", authRequired, requireRole("admin","verifier"), async (req, res) => {
  let { activity_type_id, activity_name, credit_amount, title, description, start_at, end_at, location } = req.body || {};

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
    `INSERT INTO events(activity_type_id, title, description, organizer_id, start_at, end_at, location, qr_token, status)
     VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)
     RETURNING *`,
    [activity_type_id, title, description || "", req.user.id, start_at || null, end_at || null, location || "", qr_token, "published"]
  );
  res.json(rs.rows[0]);
});

app.put("/events/:id", authRequired, requireRole("admin","verifier"), async (req, res) => {
  try {
    let { activity_name, credit_amount, title, description, start_at, end_at, location } = req.body || {};
    if (!title) return res.status(400).json({ error: "title required" });

    const evRs = await pool.query("SELECT activity_type_id FROM events WHERE id=$1", [req.params.id]);
    if (evRs.rows.length === 0) return res.status(404).json({ error: "Event not found" });

    let activity_type_id = evRs.rows[0].activity_type_id;

    if (activity_name && credit_amount !== undefined) {
       const rsAct = await pool.query(
        "INSERT INTO activity_types(name, description, credit_amount, evidence_required, created_by) VALUES($1,$2,$3,$4,$5) RETURNING id",
        [activity_name, "", Number(credit_amount), true, req.user.id]
       );
       activity_type_id = rsAct.rows[0].id;
    }

    const rs = await pool.query(
      `UPDATE events SET activity_type_id=$1, title=$2, description=$3, start_at=$4, end_at=$5, location=$6
       WHERE id=$7 RETURNING *`,
      [activity_type_id, title, description || "", start_at || null, end_at || null, location || "", req.params.id]
    );
    res.json(rs.rows[0]);
  } catch (e) {
    console.error("PUT /events error:", e);
    res.status(500).json({ error: e.message });
  }
});

app.delete("/events/:id", authRequired, requireRole("admin","verifier"), async (req, res) => {
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
  const { event_id, token, latitude, longitude } = req.body || {};
  if (!event_id || !token) return res.status(400).json({ error: "event_id & token required" });

  const eventRs = await pool.query("SELECT qr_token, start_at, end_at FROM events WHERE id=$1", [event_id]);
  const event = eventRs.rows[0];
  if (!event) return res.status(404).json({ error: "Event not found" });

  const now = new Date();
  if (event.start_at && now < new Date(event.start_at)) {
    return res.status(400).json({ error: "Sự kiện chưa diễn ra" });
  }
  if (event.end_at && now > new Date(event.end_at)) {
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

app.post("/claims/:id/approve", authRequired, requireRole("admin","verifier"), async (req, res) => {
  const claimId = req.params.id;

  // load claim + student wallet + credit amount
  const claimRs = await pool.query(
    `SELECT c.*, a.credit_amount, u.wallet_address
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
  try {
    const tx = await contractWithSigner.issue(to, amount, refId, evidenceHash);
    const receipt = await tx.wait();
    txHash = receipt?.hash || tx.hash;
  } catch (e) {
    console.error("Blockchain issue failed:", e);
    return res.status(500).json({ error: "Blockchain transaction failed", details: e.message });
  }

  const update = await pool.query(
    `UPDATE claims
     SET status='approved',
         approver_id=$2,
         approved_tx_hash=$3,
         decided_at=NOW(),
         updated_at=NOW()
     WHERE id=$1
     RETURNING *`,
    [claimId, req.user.id, txHash]
  );

  res.json(update.rows[0]);
});

app.post("/claims/:id/reject", authRequired, requireRole("admin","verifier"), async (req, res) => {
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
      "SELECT id, username, full_name, role, wallet_address, wallet_index, created_at FROM users ORDER BY role, full_name"
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

// wallet
app.get("/wallet/balance", authRequired, async (req, res) => {
  const address = req.user.wallet_address;
  const bal = await ugcContract.balanceOf(address);
  res.json({ address, balance: Number(bal) });
});

app.get("/wallet/contract", authRequired, async (req, res) => {
  res.json({ address: ugcAddress });
});

app.get("/wallet/history", authRequired, async (req, res) => {
  const address = req.user.wallet_address;

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
    ...issued.map((e) => normalize(e, "ISSUE")),
    ...burned.map((e) => normalize(e, "BURN"))
  ].sort((a, b) => b.blockNumber - a.blockNumber);

  res.json(items);
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

// dashboard stats (admin)
app.get("/dashboard/stats", authRequired, requireRole("admin"), async (req, res) => {
  try {
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
        SELECT DATE(created_at) AS day, SUM(amount)::int AS total_ugc
        FROM retirements
        WHERE created_at >= NOW() - INTERVAL '7 days'
        GROUP BY DATE(created_at) ORDER BY day
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
