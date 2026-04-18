/**
 * ui.js — ULSA Green Credit UI Helpers
 * Toast notifications, form helpers
 */

/** Hiển thị toast notification */
function showToast(msg, duration = 2800) {
  const toast = document.getElementById('toast');
  if (!toast) return;
  toast.textContent = msg;
  toast.classList.add('toast--visible');
  setTimeout(() => toast.classList.remove('toast--visible'), duration);
}

/** Toggle hiển thị 1 element bằng cách thêm/xóa class hidden */
function toggle(id) {
  const el = document.getElementById(id);
  if (el) el.hidden = !el.hidden;
}

/** Xử lý loading state cho button */
function withLoading(btn, loadingText, delay, callback) {
  const original = btn.innerHTML;
  btn.disabled = true;
  btn.textContent = loadingText;
  setTimeout(() => {
    btn.innerHTML = original;
    btn.disabled = false;
    callback();
  }, delay);
}
