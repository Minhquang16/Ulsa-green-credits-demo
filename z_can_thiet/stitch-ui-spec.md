# ULSA Green Credit — UI Design Spec (dùng cho Stitch)

## Tổng quan hệ thống

Ứng dụng web quản lý **tín chỉ xanh** cho trường ULSA, tích hợp blockchain (Hardhat local). Giao dịch được ghi on-chain, dữ liệu nghiệp vụ lưu PostgreSQL.

**Màu chủ đạo gợi ý:** Xanh lá (#22c55e / #16a34a), nền tối hoặc trắng sạch, điểm nhấn vàng (#eab308) khi cần.

---

## Vai trò người dùng

| Vai trò | Quyền hạn |
|---|---|
| **Student** | Xem sự kiện, gửi claim, xem số dư & lịch sử on-chain, đổi ưu đãi (redeem), retire tín chỉ |
| **Verifier** | Xem + tạo sự kiện, duyệt/từ chối claims (trigger mint on-chain) |
| **Admin** | Tất cả quyền của Verifier + tạo activity types, tạo rewards, xem thống kê tổng quan |

---

## Cấu trúc Navigation (Navbar)

```
[ULSA Green Credit (Demo)]   [Dashboard] [Hoạt động] [Ghi nhận] [Đổi ưu đãi] [Admin*]   [Tên user (role)] [Đăng xuất]
```

- **Admin*** chỉ hiện khi role = `admin`
- Navbar: nền tối (`bg-dark`), text trắng
- Active link được highlight

---

## Màn hình 1 — Trang Đăng nhập (`/login`)

### Layout
- Canh giữa trang (horizontally centered), chiều rộng ~500px
- Card có shadow nhẹ

### Thành phần
```
┌─────────────────────────────────┐
│        Đăng nhập                │
│  Demo nội bộ hệ thống           │
│  tín chỉ xanh (issue→redeem).  │
│                                 │
│  [Alert lỗi — nếu có]          │
│                                 │
│  Username: [input text]         │
│  Password: [input password]     │
│                                 │
│  [Nút: Đăng nhập]              │
│                                 │
│  ─────────────────────────────  │
│  Tài khoản demo:                │
│  • Admin: admin / admin123      │
│  • Verifier: verifier / ...     │
│  • Student: student1 / ...      │
│                                 │
│  [Chọn Student] [Chọn Verifier] │
│  [Chọn Admin]                   │
└─────────────────────────────────┘
```

### Trạng thái
- Nút đăng nhập: disabled + text "Đang đăng nhập..." khi loading
- Nút shortcut (Chọn Student/Verifier/Admin): tự điền form

---

## Màn hình 2 — Dashboard (`/dashboard`)

> Hiển thị với **tất cả các role**

### Layout
- Header: "Dashboard" + địa chỉ ví của user + nút Reload
- Lưới 2 cột: cột trái (4/12) = card số dư, cột phải (8/12) = bảng lịch sử

### Card Số dư tín chỉ xanh
```
┌──────────────────────┐
│ Số dư tín chỉ xanh  │
│                      │
│      [ 42 ]          │  ← display-6, số lớn
│                      │
│ Token on-chain:      │
│ 0x1234abcd...ef89    │  ← rút gọn địa chỉ contract
└──────────────────────┘
```

### Card Lịch sử on-chain
```
┌──────────────────────────────────────────────────────┐
│ Lịch sử on-chain (mới nhất)         [Hardhat local] │
│                                                      │
│ Type   │ Amount │ Ref            │ Tx               │
│ ISSUE  │   10   │ 0x1234...abcd  │ 0x5678...ef01    │
│ BURN   │    5   │ 0xaaaa...bbbb  │ 0xcccc...dddd    │
│                                                      │
│ Gợi ý demo: Hoạt động → Student submit → ...         │
└──────────────────────────────────────────────────────┘
```

- Badge `ISSUE`: màu xanh lá (success)
- Badge `BURN`: màu vàng (warning, text tối)
- Hiện tối đa 10 giao dịch gần nhất

---

## Màn hình 3 — Hoạt động xanh (`/events`)

### Điều kiện hiển thị
- **Student**: chỉ xem danh sách sự kiện + form submit claim
- **Verifier/Admin**: xem danh sách + form tạo sự kiện mới + thấy QR token

### Form Tạo sự kiện (Verifier/Admin only)
```
┌──────────────────────────────────────────────────────┐
│  Tạo sự kiện (Verifier/Admin)                        │
│                                                      │
│ Loại HĐ  [dropdown]  Tiêu đề [input]   Địa điểm [input]  Mô tả [input]
│                                                      │
│                                    [Tạo sự kiện]    │
└──────────────────────────────────────────────────────┘
```
- Dropdown hiện danh sách activity types: "Hiến máu (10 credits)", "Trồng cây (8 credits)", "Dọn rác (5 credits)"

### Danh sách sự kiện — Event Card (dạng lưới 2 cột)
```
┌──────────────────────────────────────┐
│  Sự kiện hiến máu (demo)  [published]│
│  Hiến máu • 10 credits               │
│                                      │
│  Địa điểm: Khu A - Hội trường        │
│  Thời gian: 01/01/2025 08:00 → 10:00 │
│                                      │
│  QR token (Verifier/Admin only):     │   ← CHỈ hiện khi không phải student
│  abc123def456...                     │
│                                      │
│  [Gửi yêu cầu ghi nhận (claim)]     │   ← CHỈ hiện khi là student
│                                      │
│  ▼ (khi mở):                         │
│    Ghi chú: [input]                  │
│    Minh chứng (ảnh/PDF): [file input]│
│    Nếu không upload, hash từ ghi chú │
│    [Submit]                           │
└──────────────────────────────────────┘
```

---

## Màn hình 4 — Ghi nhận / Claims (`/claims`)

### Điều kiện hiển thị
- **Student**: thấy danh sách claim của chính mình
- **Verifier/Admin**: thấy tất cả claims, có filter trạng thái, có nút Approve/Reject

### Filter trạng thái (Verifier/Admin only)
```
Lọc trạng thái: [dropdown: submitted | approved | rejected]
```

### Bảng Claims
```
┌─────────────────────────────────────────────────────────────────────────────┐
│ Student  │ Event              │ Activity │ Credits │ Status    │ Evidence │ Tx       │ Action   │
│──────────│────────────────────│──────────│─────────│───────────│──────────│──────────│──────────│
│ Sinh viên│ Sự kiện hiến máu  │ Hiến máu │   10    │[submitted]│  -       │  -       │[Approve] │
│ 1        │                    │          │         │           │          │          │[Reject]  │
│──────────│────────────────────│──────────│─────────│───────────│──────────│──────────│──────────│
│ Sinh viên│ Sự kiện hiến máu  │ Hiến máu │   10    │[approved] │ file     │ 0x12...  │  -       │
│ 2        │                    │          │         │           │          │          │          │
└─────────────────────────────────────────────────────────────────────────────┘
```

- Badge status:
  - `submitted` → màu xám (secondary)
  - `approved` → màu xanh lá (success)
  - `rejected` → màu đỏ (danger)
- Cột **Action** chỉ hiện với Verifier/Admin
- Khi đang xử lý: nút Approve hiện "..." và disabled
- Dưới bảng: chú thích "Approve = ghi giao dịch issue() lên blockchain"

---

## Màn hình 5 — Đổi ưu đãi (`/rewards`)

> Student: thấy danh sách + nút Redeem + form Retire  
> Admin: thấy danh sách (chú thích "Tạo reward trong tab Admin")

### Danh sách Rewards — dạng lưới 2 cột
```
┌──────────────────────────────────┐
│  Voucher căn-tin        [active] │
│  Voucher giảm giá tại căn-tin    │
│                                  │
│  Cost: 5 credits                 │
│  Stock: 100                      │
│                                  │
│  [Redeem (burn)]                 │   ← Chỉ Student, disabled nếu hết stock
└──────────────────────────────────┘
```

- Badge `active`: màu xanh lá
- Badge `inactive`: màu xám
- Nút Redeem: màu vàng (warning), disabled khi `stock <= 0` hoặc `status != 'active'`

### Form Retire (chỉ Student)
```
┌────────────────────────────────────────────────────────┐
│  Retire tín chỉ (burn type = RETIRE)                   │
│                                                        │
│  Amount [  1  ]   Reason [Đã sử dụng cho mục đích...] │
│                                              [Retire]  │
│                                                        │
│  Retire dùng khi tín chỉ đã "ghi nhận/khóa sổ"...     │
└────────────────────────────────────────────────────────┘
```

---

## Màn hình 6 — Admin (`/admin`)

> Chỉ dành cho role `admin`. Nếu truy cập bằng role khác: hiện alert "Chỉ Admin mới truy cập trang này."

### Khu vực 1 — Thống kê tổng quan (4 mini-stats cards)
```
┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐
│  Users  │  │  Events │  │ Claims  │  │Approved │
│    4    │  │    5    │  │   12    │  │    8    │
└─────────┘  └─────────┘  └─────────┘  └─────────┘
```

### Khu vực 2 — Token stats on-chain (full width card)
```
┌──────────────────────────────────────────────────────┐
│  Token stats (on-chain)                              │
│  Contract: 0xAbCd...1234                             │
│                                                      │
│  Total issued: 120   Total burned: 45   Supply: 75  │
└──────────────────────────────────────────────────────┘
```

### Khu vực 3 — Forms (2 cột, 50/50)

**Cột trái — Tạo Activity Type**
```
┌──────────────────────────┐
│  Tạo Activity Type       │
│                          │
│  Tên: [input]            │
│  Mô tả: [input]          │
│  Credits: [number input] │
│                          │
│  [Tạo]                   │
│                          │
│  Gợi ý: đạp xe, phân    │
│  loại rác, tiết kiệm...  │
└──────────────────────────┘
```

**Cột phải — Tạo Reward**
```
┌──────────────────────────────┐
│  Tạo Reward                  │
│                              │
│  Tiêu đề: [input]            │
│  Mô tả: [input]              │
│  Cost credits: [number]      │
│  Stock: [number]             │
│                              │
│  [Tạo]                       │
│                              │
│  Reward chỉ là quyền lợi    │
│  nội bộ, không quy đổi tiền │
└──────────────────────────────┘
```

---

## Error & Empty States

| Tình huống | Hiển thị |
|---|---|
| Lỗi API | Alert đỏ (danger) ở đầu trang với message lỗi |
| Không có dữ liệu (table/list) | Text xám: "Không có dữ liệu." / "Chưa có giao dịch." |
| Claim đang được xử lý | Nút Approve hiện "..." và disabled |
| Tạo sự kiện đang xử lý | Nút hiện "Đang tạo..." và disabled |
| Đăng nhập đang xử lý | Nút hiện "Đang đăng nhập..." và disabled |

---

## Footer

```
Demo chạy local: Web (3000) • API (8080) • Hardhat RPC (8545) • Postgres (5432)
```
Text nhỏ, màu muted, cuối mỗi trang.

---

## Luồng nghiệp vụ chính (để tham khảo khi vẽ flows)

```
[Student đăng nhập]
    → Hoạt động → chọn sự kiện → Gửi claim (upload ảnh/PDF hoặc ghi chú)
    
[Verifier đăng nhập]
    → Ghi nhận → Lọc "submitted" → Approve claim
      → Backend gọi contract.issue(to, amount, refId, evidenceHash)
      → Cập nhật tx_hash vào DB
      
[Student quay lại Dashboard]
    → Số dư tăng
    → Lịch sử on-chain có giao dịch "ISSUE"
    
[Student vào Đổi ưu đãi]
    → Bấm Redeem → Backend gọi contract.burn(..., burnType=0)
    → Lịch sử on-chain có "BURN"
    
[Student Retire]
    → Nhập amount + reason → Backend gọi contract.burn(..., burnType=1)
    → Lịch sử on-chain có "BURN" (RETIRE)
```

---

## Ghi chú kỹ thuật (tham khảo cho Stitch context)

- **Framework**: React + Vite, dùng Bootstrap CSS
- **State management**: React Context (AuthContext)
- **Auth**: JWT lưu localStorage key `ugc_token`, truyền qua `Authorization: Bearer <token>`
- **Blockchain**: Hardhat local chain, contract `ULSAGreenCredit.sol`
  - `issue(to, amount, refId, evidenceHash)` — cấp tín chỉ
  - `burn(from, amount, burnType, refId, reasonHash)` — đốt tín chỉ (0=REDEEM, 1=RETIRE)
- **Database tables**: `users`, `activity_types`, `events`, `claims`, `rewards`, `redemptions`, `retirements`
- **API base**: `/api` (proxied qua nginx)
