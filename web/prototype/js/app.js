/* ========================================= */
/*  ULSA Green Credit — App Logic (Demo)     */
/* ========================================= */

// ───────────────────────────
//  STATE
// ───────────────────────────
let currentUser = null; // { username, role, label }
const DEMO_ACCOUNTS = {
  'admin': { password: 'admin123', role: 'admin', label: 'Admin' },
  'verifier': { password: 'verifier123', role: 'verifier', label: 'Verifier' },
  'student1': { password: 'student123', role: 'student', label: 'Student 1' },
};

// ───────────────────────────
//  TOAST
// ───────────────────────────
function showToast(msg, duration = 2500) {
  const t = document.getElementById('toast');
  if (!t) return;
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), duration);
}

// ───────────────────────────
//  LOGIN
// ───────────────────────────
function doLogin(e) {
  e.preventDefault();
  const username = document.getElementById('username').value.trim();
  const password = document.getElementById('password').value.trim();
  const btn = document.getElementById('loginBtn');
  const errDiv = document.getElementById('loginError');

  btn.disabled = true;
  btn.textContent = 'Đang đăng nhập...';

  setTimeout(() => {
    const account = DEMO_ACCOUNTS[username];
    if (account && account.password === password) {
      currentUser = { username, role: account.role, label: account.label };
      errDiv.classList.add('hidden');
      loginSuccess();
    } else {
      errDiv.classList.remove('hidden');
      document.getElementById('loginErrorMsg').textContent = 'Sai tên đăng nhập hoặc mật khẩu.';
      btn.disabled = false;
      btn.innerHTML = 'Truy cập hệ thống <span class="material-symbols-outlined text-lg">arrow_forward</span>';
    }
  }, 700);
}

function quickLogin(username, password, role) {
  document.getElementById('username').value = username;
  document.getElementById('password').value = password;
  const account = DEMO_ACCOUNTS[username];
  currentUser = { username, role: account.role, label: account.label };
  loginSuccess();
}

function loginSuccess() {
  applyRoleVisibility();
  navigate('dashboard');
  showToast(`Đăng nhập thành công! Xin chào ${currentUser.label} 👋`);
}

function logout() {
  currentUser = null;
  document.getElementById('studentNav').classList.add('hidden');
  document.getElementById('adminSidebar').classList.add('hidden');
  document.getElementById('mainContentWrapper').style.marginLeft = "0";

  showPage('login');
  document.getElementById('username').value = '';
  document.getElementById('password').value = '';
  document.getElementById('loginBtn').disabled = false;
  document.getElementById('loginBtn').innerHTML = 'Truy cập hệ thống <span class="material-symbols-outlined text-lg">arrow_forward</span>';
  document.getElementById('loginError').classList.add('hidden');
}

// ───────────────────────────
//  ROLE-BASED VISIBILITY
// ───────────────────────────
function applyRoleVisibility() {
  if (!currentUser) return;
  const role = currentUser.role;
  const isAdmin = role === 'admin';
  const isVerifier = role === 'verifier' || isAdmin;
  const isStudent = role === 'student';

  // Toggle Nav/Sidebar
  const sNav = document.getElementById('studentNav');
  const aSide = document.getElementById('adminSidebar');
  const wrapper = document.getElementById('mainContentWrapper');

  if (isStudent) {
    if (sNav) sNav.classList.remove('hidden');
    if (aSide) aSide.classList.add('hidden');
    if (wrapper) wrapper.style.marginLeft = "0";
    document.querySelectorAll('.studentNameLabel').forEach(el => el.textContent = currentUser.label);
  } else {
    if (sNav) sNav.classList.add('hidden');
    if (aSide) aSide.classList.remove('hidden');
    if (wrapper) wrapper.style.marginLeft = "18rem"; // 72px * 4 = 18rem matches w-72
    document.querySelectorAll('.adminNameLabel').forEach(el => el.textContent = currentUser.label);
    document.querySelectorAll('.adminRoleLabel').forEach(el => el.textContent = currentUser.role.toUpperCase());
  }

  // Events page filters
  const createEventSection = document.getElementById('createEventSection');
  if (createEventSection) createEventSection.classList.toggle('hidden', isStudent);

  // QR & Claims actions
  ['qrSection1', 'qrSection2', 'qrSection3'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.classList.toggle('hidden', isStudent);
  });
  ['claimSection1', 'claimSection2', 'claimSection3'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.classList.toggle('hidden', !isStudent);
  });
  const verifFab = document.getElementById('eventsVerifierFAB');
  if (verifFab) verifFab.classList.toggle('hidden', !isVerifier);

  const claimsFilter = document.getElementById('claimsFilter');
  if (claimsFilter) claimsFilter.classList.toggle('hidden', !isVerifier);
  const claimsHeader = document.getElementById('claimsActionHeader');
  if (claimsHeader) claimsHeader.classList.toggle('hidden', !isVerifier);
  document.querySelectorAll('.claimsAction').forEach(el => el.classList.toggle('hidden', !isVerifier));

  document.querySelectorAll('.redeemBtn').forEach(btn => btn.classList.toggle('hidden', !isStudent));
  const adminNote = document.getElementById('adminRewardNote');
  if (adminNote) adminNote.classList.toggle('hidden', !isAdmin);
  const retireSection = document.getElementById('retireSection');
  if (retireSection) retireSection.classList.toggle('hidden', !isStudent);
}

// ───────────────────────────
//  ROUTING
// ───────────────────────────
const pages = ['login', 'dashboard', 'events', 'claims', 'rewards', 'admin'];

function showPage(pageId) {
  pages.forEach(p => {
    const el = document.getElementById('page-' + p);
    if (el) el.classList.toggle('active', p === pageId);
  });
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function navigate(pageId) {
  if (!currentUser && pageId !== 'login') {
    showPage('login');
    return;
  }

  // Role-based navigation constraints
  if (pageId === 'admin' && currentUser.role !== 'admin') {
    pageId = 'dashboard';
  }

  // Update active states for both Nav and Sidebar
  pages.forEach(p => {
    const navLink = document.getElementById('nav-' + p);
    const sideLink = document.getElementById('side-' + p);
    if (navLink) navLink.classList.toggle('active', p === pageId);
    if (sideLink) sideLink.classList.toggle('active', p === pageId);
  });

  if (pageId === 'login') {
    const sNav = document.getElementById('studentNav');
    const aSide = document.getElementById('adminSidebar');
    const wrapper = document.getElementById('mainContentWrapper');
    if (sNav) sNav.classList.add('hidden');
    if (aSide) aSide.classList.add('hidden');
    if (wrapper) wrapper.style.marginLeft = "0";
  }

  showPage(pageId);
}

// ───────────────────────────
//  HANDLERS
// ───────────────────────────
function handleCreateEvent(e) {
  e.preventDefault();
  const btn = document.getElementById('createEventBtn');
  btn.textContent = 'Đang tạo...';
  btn.disabled = true;
  setTimeout(() => {
    btn.textContent = 'Tạo sự kiện';
    btn.disabled = false;
    showToast('✅ Sự kiện đã được tạo thành công!');
    e.target.reset();
  }, 1200);
}

function toggleClaimForm(id) {
  const form = document.getElementById(id);
  if (form) form.classList.toggle('hidden');
}

function handleSubmitClaim(e) {
  e.preventDefault();
  const btn = e.target;
  const orig = btn.textContent;
  btn.textContent = 'Đang gửi...';
  btn.disabled = true;
  setTimeout(() => {
    btn.textContent = orig;
    btn.disabled = false;
    // hide form
    const form = btn.closest('[id^="claimForm"]');
    if (form) form.classList.add('hidden');
    showToast('📝 Claim đã được gửi! Chờ Verifier duyệt.');
  }, 1000);
}

function handleApprove(btn) {
  const row = btn.closest('tr');
  const orig = btn.innerHTML;
  btn.innerHTML = '...';
  btn.disabled = true;
  setTimeout(() => {
    // Update status badge
    const statusCell = row.querySelector('td:nth-child(5) span');
    if (statusCell) {
      statusCell.className = 'inline-flex items-center px-3 py-1 rounded-full bg-primary-container text-on-primary-container font-label text-[10px] font-bold uppercase tracking-wider';
      statusCell.textContent = 'approved';
    }
    // Hide action buttons
    row.querySelectorAll('.flex button').forEach(b => b.remove());
    const actionCell = row.querySelector('td:last-child');
    if (actionCell) actionCell.innerHTML = '<span class="text-[11px] font-label text-on-surface-variant/40">No Actions</span>';
    showToast('✅ Đã approve! Giao dịch issue() đã ghi lên blockchain.');
  }, 1200);
}

function handleReject(btn) {
  const row = btn.closest('tr');
  setTimeout(() => {
    const statusCell = row.querySelector('td:nth-child(5) span');
    if (statusCell) {
      statusCell.className = 'inline-flex items-center px-3 py-1 rounded-full bg-error-container text-on-error-container font-label text-[10px] font-bold uppercase tracking-wider';
      statusCell.textContent = 'rejected';
    }
    const actionCell = row.querySelector('td:last-child');
    if (actionCell) actionCell.innerHTML = '<button class="px-3 py-1 rounded-lg bg-surface-container-high text-[10px] font-bold text-on-surface-variant hover:bg-surface-variant transition-colors">Appeal Log</button>';
    showToast('❌ Đã từ chối claim.');
  }, 800);
}

function handleRedeem(btn, name, cost) {
  const orig = btn.textContent;
  btn.textContent = 'Đang xử lý...';
  btn.disabled = true;
  setTimeout(() => {
    btn.textContent = orig;
    btn.disabled = false;
    showToast(`🎁 Đã redeem "${name}" (${cost} UGC). Giao dịch BURN ghi lên blockchain!`);
  }, 1200);
}

function handleRetire(e) {
  e.preventDefault();
  const amount = document.getElementById('retireAmount').value;
  const reason = document.getElementById('retireReason').value;
  if (!amount || amount < 1) { showToast('⚠️ Nhập số lượng tín chỉ cần retire.'); return; }
  showToast(`🔥 Đã retire ${amount} UGC. Lý do: "${reason}". Giao dịch BURN (RETIRE) ghi lên blockchain!`);
  e.target.reset();
}

function handleCreateActivityType(e) {
  e.preventDefault();
  setTimeout(() => {
    showToast('✅ Activity Type đã được tạo!');
    e.target.reset();
  }, 700);
}

function handleCreateReward(e) {
  e.preventDefault();
  setTimeout(() => {
    showToast('🎁 Reward đã được tạo và publish!');
    e.target.reset();
  }, 700);
}

// ───────────────────────────
//  INIT
// ───────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  showPage('login');
});
