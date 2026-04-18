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
const DATABASE_URL = process.env.DATABASE_URL || "postgres://ugc:ugc@localhost:5432/ugc";
const JWT_SECRET = process.env.JWT_SECRET || "dev-secret";
const MNEMONIC = process.env.MNEMONIC || "test test test test test test test test test test test junk";
const RPC_URL = process.env.RPC_URL || "http://127.0.0.1:8545";
const CONTRACTS_PATH = process.env.CONTRACTS_PATH || path.join(__dirname, "..", "shared", "contracts.json");
const UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(__dirname, "..", "uploads");
const CORS_ORIGIN = process.env.CORS_ORIGIN || "http://localhost:3000";

if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

const app = express();
app.use(cors({ origin: CORS_ORIGIN }));
app.use(express.json());
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

async function initBlockchain() {
  await waitForFile(CONTRACTS_PATH);
  const contractsRaw = fs.readFileSync(CONTRACTS_PATH, "utf8");
  const contractsJson = JSON.parse(contractsRaw);
  ugcAddress = contractsJson?.contracts?.ULSAGreenCredit?.address;
  if (!ugcAddress) throw new Error("Missing ULSAGreenCredit address in contracts.json");

  const abiPath = path.join(path.dirname(CONTRACTS_PATH), "ULSAGreenCredit.abi.json");
  await waitForFile(abiPath);
  ugcAbi = JSON.parse(fs.readFileSync(abiPath, "utf8"));

  provider = new ethers.JsonRpcProvider(RPC_URL);
  ugcContract = new ethers.Contract(ugcAddress, ugcAbi, provider);

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
  // users
  const uCount = await pool.query("SELECT COUNT(*)::int AS n FROM users");
  if (uCount.rows[0].n === 0) {
    console.log("Seeding users...");
    const users = [
      { username: "admin", full_name: "Admin ULSA", role: "admin", wallet_index: 0, password: "admin123" },
      { username: "verifier", full_name: "Verifier (Đoàn/Hội)", role: "verifier", wallet_index: 1, password: "verifier123" },
      { username: "student1", full_name: "Sinh viên 1", role: "student", wallet_index: 2, password: "student123" },
      { username: "student2", full_name: "Sinh viên 2", role: "student", wallet_index: 3, password: "student123" }
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

  // rewards
  const rCount = await pool.query("SELECT COUNT(*)::int AS n FROM rewards");
  if (rCount.rows[0].n === 0) {
    console.log("Seeding rewards...");
    const admin = (await pool.query("SELECT id FROM users WHERE role='admin' LIMIT 1")).rows[0];

    const rewards = [
      { title: "Voucher căn-tin", description: "Voucher giảm giá tại căn-tin ULSA.", cost_credits: 5, stock: 100 },
      { title: "Ưu tiên gửi xe 1 ngày", description: "Ưu tiên gửi xe trong 1 ngày.", cost_credits: 3, stock: 100 },
      { title: "Giấy chứng nhận hoạt động xanh", description: "Giấy chứng nhận tham gia hoạt động xanh.", cost_credits: 7, stock: 50 }
    ];

    for (const rw of rewards) {
      await pool.query(
        "INSERT INTO rewards(title, description, cost_credits, stock, status, created_by) VALUES($1,$2,$3,$4,$5,$6)",
        [rw.title, rw.description, rw.cost_credits, rw.stock, "active", admin.id]
      );
    }
  }

  // event
  const eCount = await pool.query("SELECT COUNT(*)::int AS n FROM events");
  if (eCount.rows[0].n === 0) {
    console.log("Seeding one demo event...");
    const verifier = (await pool.query("SELECT id FROM users WHERE role='verifier' LIMIT 1")).rows[0];
    const hiemMau = (await pool.query("SELECT id FROM activity_types WHERE name='Hiến máu' LIMIT 1")).rows[0];

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

// -------------------- file upload --------------------
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const safe = file.originalname.replace(/[^a-zA-Z0-9._-]/g, "_");
    cb(null, `${Date.now()}_${Math.random().toString(16).slice(2)}_${safe}`);
  }
});
const upload = multer({ storage });

// -------------------- routes --------------------
app.get("/health", (req, res) => res.json({ ok: true }));

app.post("/auth/login", async (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password) return res.status(400).json({ error: "username & password required" });

  const rs = await pool.query("SELECT * FROM users WHERE username=$1 LIMIT 1", [username]);
  const user = rs.rows[0];
  if (!user) return res.status(401).json({ error: "Invalid credentials" });

  const ok = bcrypt.compareSync(password, user.password_hash);
  if (!ok) return res.status(401).json({ error: "Invalid credentials" });

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

// events
app.get("/events", authRequired, async (req, res) => {
  const rs = await pool.query(
    `SELECT e.*, a.name AS activity_name, a.credit_amount
     FROM events e
     JOIN activity_types a ON a.id = e.activity_type_id
     ORDER BY e.created_at DESC`
  );
  res.json(rs.rows);
});

app.post("/events", authRequired, requireRole("admin","verifier"), async (req, res) => {
  const { activity_type_id, title, description, start_at, end_at, location } = req.body || {};
  if (!activity_type_id || !title) return res.status(400).json({ error: "activity_type_id & title required" });

  const qr_token = crypto.randomBytes(16).toString("hex");
  const rs = await pool.query(
    `INSERT INTO events(activity_type_id, title, description, organizer_id, start_at, end_at, location, qr_token, status)
     VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)
     RETURNING *`,
    [activity_type_id, title, description || "", req.user.id, start_at || null, end_at || null, location || "", qr_token, "published"]
  );
  res.json(rs.rows[0]);
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

// rewards
app.get("/rewards", authRequired, async (req, res) => {
  const where = req.user.role === "admin" ? "" : "WHERE status='active'";
  const rs = await pool.query(`SELECT * FROM rewards ${where} ORDER BY created_at DESC`);
  res.json(rs.rows);
});

app.post("/rewards", authRequired, requireRole("admin"), async (req, res) => {
  const { title, description, cost_credits, stock, status } = req.body || {};
  if (!title || cost_credits === undefined) return res.status(400).json({ error: "title & cost_credits required" });

  const rs = await pool.query(
    `INSERT INTO rewards(title, description, cost_credits, stock, status, created_by)
     VALUES($1,$2,$3,$4,$5,$6) RETURNING *`,
    [title, description || "", Number(cost_credits), Number(stock || 0), status || "active", req.user.id]
  );
  res.json(rs.rows[0]);
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
