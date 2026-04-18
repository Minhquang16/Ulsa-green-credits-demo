/**
 * auth.js — ULSA Green Credit Authentication Logic
 * Quản lý trạng thái đăng nhập qua sessionStorage
 */

const DEMO_ACCOUNTS = {
  'admin':    { password: 'admin123',    role: 'admin',    label: 'Admin'     },
  'verifier': { password: 'verifier123', role: 'verifier', label: 'Verifier'  },
  'student1': { password: 'student123',  role: 'student',  label: 'Student 1' },
};

const SESSION_KEY = 'ugc_user';

/** Lấy user hiện tại từ sessionStorage */
function getUser() {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

/** Lưu user vào sessionStorage */
function setUser(user) {
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(user));
}

/** Xóa session — đăng xuất */
function logout() {
  sessionStorage.removeItem(SESSION_KEY);
  window.location.href = 'login.html';
}

/**
 * Guard: kiểm tra xem đã đăng nhập chưa.
 * Nếu chưa → redirect về login.html
 * @returns {object|null} user object nếu hợp lệ
 */
function requireAuth() {
  const user = getUser();
  if (!user) {
    window.location.href = 'login.html';
    return null;
  }
  return user;
}

/**
 * Guard: chỉ admin mới được vào trang này.
 * @returns {object|null} user object nếu là admin
 */
function requireAdmin() {
  const user = requireAuth();
  if (user && user.role !== 'admin') {
    window.location.href = 'dashboard.html';
    return null;
  }
  return user;
}

/** Áp dụng tên người dùng lên các phần tử mang class tương ứng */
function populateUserInfo(user) {
  document.querySelectorAll('[data-user-name]').forEach(el => {
    el.textContent = user.label;
  });
  document.querySelectorAll('[data-user-role]').forEach(el => {
    el.textContent = user.role.toUpperCase();
  });
}

/** Ẩn/hiện phần tử theo role */
function applyRoleVisibility(user) {
  const role = user.role;
  const isAdmin    = role === 'admin';
  const isVerifier = role === 'verifier' || isAdmin;
  const isStudent  = role === 'student';

  // data-show-role="admin"    → chỉ hiện với admin
  // data-show-role="verifier" → hiện với verifier + admin
  // data-show-role="student"  → chỉ hiện với student
  document.querySelectorAll('[data-show-role]').forEach(el => {
    const requiredRole = el.dataset.showRole;
    let visible = false;
    if (requiredRole === 'admin')    visible = isAdmin;
    if (requiredRole === 'verifier') visible = isVerifier;
    if (requiredRole === 'student')  visible = isStudent;
    el.hidden = !visible;
  });
}

/** Xử lý đăng nhập form */
function doLogin(e) {
  e.preventDefault();
  const username = document.getElementById('username').value.trim();
  const password = document.getElementById('password').value.trim();
  const btn    = document.getElementById('loginBtn');
  const errBox = document.getElementById('loginError');

  btn.disabled = true;
  btn.textContent = 'Đang đăng nhập...';

  setTimeout(() => {
    const account = DEMO_ACCOUNTS[username];
    if (account && account.password === password) {
      setUser({ username, role: account.role, label: account.label });
      window.location.href = 'dashboard.html';
    } else {
      errBox.hidden = false;
      btn.disabled = false;
      btn.textContent = 'Truy cập hệ thống';
    }
  }, 700);
}

/** Đăng nhập nhanh (demo) */
function quickLogin(username) {
  const account = DEMO_ACCOUNTS[username];
  if (!account) return;
  setUser({ username, role: account.role, label: account.label });
  window.location.href = 'dashboard.html';
}
