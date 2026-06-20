# Kỹ thuật sửa lỗi xô lệch Layout khi bật/tắt Sidebar

> **Tham khảo từ:** shadcn/ui `dashboard-01` block — `sidebar.jsx`  
> **Áp dụng vào:** ULSA Green Credits Demo

---

## Bối cảnh vấn đề

Khi Sidebar có `position: fixed` và Main Content dùng `padding-left` để nhường chỗ, hiện tượng "xô lệch" xảy ra vì:
- Sidebar mở → `padding-left` tăng từ `65px` → `220px`
- Container Main Content bị **thu hẹp thực sự** → các thẻ Card bên trong bị ép bẹp, rớt dòng hoặc vỡ grid

---

## Giải pháp: Phantom Div + Data-State CSS

Gồm **2 phần** phối hợp với nhau:

---

### Phần 1 — Phantom Div Pattern (từ shadcn)

**Nguyên lý:** Sidebar thật dùng `position: fixed` (nổi trên màn hình, không chiếm chỗ trong luồng). Thêm một "bóng ma" vô hình cùng chiều rộng ngồi trong Flexbox để giữ chỗ.

**Cấu trúc trong `App.jsx`:**

```jsx
// Outer wrapper: flex-row
<div
  className="bg-surface text-on-surface min-h-screen font-body flex flex-row"
  data-sidebar={isSidebarCollapsed ? 'collapsed' : 'expanded'}
>

  {/* --- STUDENT SIDEBAR --- */}
  {user.role === 'student' && (
    <>
      {/* Phantom div: vô hình nhưng giữ chỗ trong flex row */}
      <div
        className="hidden lg:block flex-shrink-0 transition-[width] duration-300"
        style={{ width: isSidebarCollapsed ? '65px' : '220px' }}
      />
      {/* Sidebar thật: position fixed, nổi trên */}
      <StudentSidebar
        isCollapsed={isSidebarCollapsed}
        setIsCollapsed={setIsSidebarCollapsed}
      />
    </>
  )}

  {/* Main content: flex-1 + min-w-0, KHÔNG dùng padding-left */}
  <div className="flex-1 min-w-0 transition-all duration-300 min-h-screen flex flex-col">
    {/* ... header, main, footer ... */}
  </div>

</div>
```

**Tại sao `min-w-0`?**  
Trong Flexbox, các item có `min-width: auto` theo mặc định — chúng không bao giờ thu hẹp dưới kích thước nội dung. `min-w-0` phá bỏ giới hạn này, cho phép Main Content co lại đúng theo không gian còn lại.

---

### Phần 2 — Data-State CSS (2 bộ kích thước)

**Nguyên lý:** Đặt `data-sidebar="expanded"` hoặc `"collapsed"` trên outer wrapper. CSS dùng attribute selector để áp dụng layout riêng biệt cho từng trạng thái.

**Trong `student-dashboard.css`:**

```css
/* ── Sidebar MỞ (expanded): ít không gian hơn ── */
[data-sidebar="expanded"] .dashboard-page__kpi-row {
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 12px;
}

[data-sidebar="expanded"] .kpi-card {
    padding: 14px 12px;
    gap: 10px;
}

[data-sidebar="expanded"] .kpi-card__value {
    font-size: 22px;
}

[data-sidebar="expanded"] .dashboard-page__welcome-section {
    flex-wrap: nowrap;
    gap: 12px;
}

[data-sidebar="expanded"] .progress-card {
    max-width: 480px;
}


/* ── Sidebar ĐÓNG (collapsed): không gian rộng hơn ── */
[data-sidebar="collapsed"] .dashboard-page__kpi-row {
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 20px;
}

[data-sidebar="collapsed"] .kpi-card {
    padding: 24px 20px;
    gap: 16px;
}

[data-sidebar="collapsed"] .dashboard-page__welcome-section {
    flex-wrap: nowrap;
    gap: 20px;
}

[data-sidebar="collapsed"] .progress-card {
    max-width: 630px;
}
```

---

## Bảng tóm tắt thay đổi

| File | Thay đổi gì |
|------|-------------|
| `App.jsx` | Outer wrapper: `flex flex-row` + `data-sidebar` attribute |
| `App.jsx` | Thêm Phantom div khớp width với Sidebar (`65px` / `220px`) |
| `App.jsx` | Main content: xóa `padding-left`, thay bằng `flex-1 min-w-0` |
| `student-dashboard.css` | KPI row: `repeat(4, minmax(0, 1fr))` thay vì `auto-fit` |
| `student-dashboard.css` | Progress card: `width: 100%; max-width: 630px` thay vì `width: 630px` cứng |
| `student-dashboard.css` | Thêm 2 bộ rules `[data-sidebar="expanded"]` và `[data-sidebar="collapsed"]` |

---

## Quy tắc mở rộng

Nếu muốn áp dụng cho bất kỳ component nào khác khi bật/tắt Sidebar, chỉ cần viết thêm vào CSS:

```css
/* Khi sidebar đang mở */
[data-sidebar="expanded"] .tên-class-của-bạn {
    /* ... style khi sidebar mở ... */
}

/* Khi sidebar đang đóng */
[data-sidebar="collapsed"] .tên-class-của-bạn {
    /* ... style khi sidebar đóng ... */
}
```

**Không cần đụng vào JavaScript hay JSX — chỉ thêm CSS là xong.**

---

## Lưu ý

- Phantom div có `hidden lg:block` — chỉ hiện trên desktop (≥ 1024px). Trên mobile, Sidebar thường là overlay nên không cần giữ chỗ.
- `transition-[width] duration-300` trên Phantom div phải khớp với `transition` của Sidebar để animation mượt.
- Sidebar thật giữ nguyên `position: fixed` — **không thay đổi**.
