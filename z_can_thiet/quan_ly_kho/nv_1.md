# 🏛️ Quản lý Kho quỹ Multi-Sig Treasury

## 1. Ý nghĩa — Tại sao lại cần cái này?

Trong hệ thống ULSA Green Credit, **UGC Token** (Tín chỉ Xanh) là tài sản cốt lõi. Nếu chỉ cần 1 người là Admin có thể tự ý in thêm hoặc thu hồi hàng nghìn token, thì hệ thống sẽ rất dễ bị lạm quyền hoặc làm giả.

**Multi-Sig Treasury** (Kho quỹ Đa chữ ký) giải quyết vấn đề này bằng cách:

> 💡 **Bắt buộc phải có ít nhất N/M chữ ký từ các Admin khác nhau thì một lệnh mới được thực thi.**  
> Ví dụ: Cần 2 trong số 3 Admin đồng ý thì token mới được cấp phát.

Điều này giống như một két sắt có **2 ổ khóa** — không ai có thể một mình mở được.

---

## 2. Các khái niệm cần biết

| Thuật ngữ | Ý nghĩa đơn giản |
|---|---|
| **Proposal (Đề xuất)** | Một yêu cầu Mint hoặc Burn token, được ghi lên Blockchain |
| **Threshold (Ngưỡng)** | Số lượng chữ ký tối thiểu cần để thực thi (ví dụ: 2/3) |
| **MINT** | Cấp phát thêm token vào ví của ai đó |
| **BURN** | Thu hồi (đốt) token từ ví của ai đó |
| **Confirm (Ký xác nhận)** | Admin đồng ý với đề xuất bằng cách ký chữ ký số |
| **Execute (Thực thi)** | Khi đủ chữ ký, lệnh được gửi lên Smart Contract để thực hiện thật |
| **Smart Contract** | Đoạn code chạy trên Blockchain, không ai có thể sửa sau khi deploy |
| **Private Key** | Chìa khóa bí mật của ví — ai có key đó là có quyền ký |

---

## 3. Quy trình hoạt động (Step by step)

```
Admin A                    Admin B                    Blockchain
   │                          │                           │
   │── 1. Kết nối ví ────────>│                           │
   │                          │                           │
   │── 2. Điền form ─────────>│                           │
   │   (Mint 5000 UGC cho     │                           │
   │    ví 0x70997...)        │                           │
   │                          │                           │
   │── 3. Gửi Đề Xuất ───────────────────────────────>   │
   │                          │         (Proposal #1 được │
   │                          │          ghi lên chain,   │
   │                          │          count: 1/2)      │
   │                          │                           │
   │                 Admin B vào web, thấy Card Đề xuất   │
   │                          │                           │
   │                          │── 4. Ký duyệt ─────────> │
   │                          │         (count nhảy lên   │
   │                          │          2/2 ✅)           │
   │                          │                           │
   │── 5. Thực thi ──────────────────────────────────>   │
   │                          │         (Token được Mint, │
   │                          │          Proposal: Done ✅)│
```

### Chi tiết từng bước:

**Bước 1 – Kết nối ví:**
- Admin mở trang Treasury và nhấn **[Kết nối Ví Admin]**.
- Hệ thống cho chọn: dùng **MetaMask** (extension trình duyệt) hoặc **Ví nội bộ** (dán Private Key).
- Sau khi kết nối, Smart Contract kiểm tra địa chỉ ví đó có nằm trong danh sách Admin không.
- Nếu không phải Admin → báo lỗi, từ chối truy cập.

**Bước 2 – Tạo đề xuất (Admin A):**
- Admin điền vào form:
  - Loại giao dịch: **MINT** (cấp phát) hoặc **BURN** (thu hồi).
  - Địa chỉ ví người nhận/bị thu hồi.
  - Số lượng UGC.
  - Lý do rõ ràng.
- Nhấn **[Gửi Đề Xuất]** → một giao dịch được ký và ghi lên Blockchain.

**Bước 3 – Đề xuất chờ ký:**
- Proposal Card hiện ra trong danh sách với trạng thái **"1/2 chữ ký"**.
- Thanh tiến độ màu xanh cho thấy mức độ đồng thuận hiện tại.
- Admin A thấy nút **"Đã ký"** (mờ) vì họ đã ký lúc tạo.

**Bước 4 – Admin B ký duyệt:**
- Admin B đăng nhập bằng ví của họ (Private Key khác).
- Thấy Card đề xuất của Admin A, nhấn **[Ký duyệt]**.
- Thanh tiến độ nhảy lên **"2/2 chữ ký"** ✅.
- Nút **[Thực thi]** màu xanh xuất hiện.

**Bước 5 – Thực thi giao dịch:**
- Bất kỳ Admin nào cũng nhấn **[Thực thi]**.
- Smart Contract kiểm tra: đủ chữ ký? → Thực hiện Mint/Burn token thật.
- Card đổi sang trạng thái **"✅ Hoàn thành"** — không thể hoàn tác.
- Dữ liệu được ghi vĩnh viễn lên Blockchain, công khai cho ai cũng xem được.

---

## 4. Tại sao nó an toàn hơn hệ thống thường?

| Hệ thống thường (Web2) | Multi-Sig Treasury (Web3) |
|---|---|
| Admin A có thể tự ý in thêm token | Phải có ít nhất 2 người đồng ý |
| Dữ liệu lưu trong Database, có thể bị admin sửa | Dữ liệu ghi lên Blockchain, không ai sửa được |
| Nếu tài khoản Admin bị hack → mất kiểm soát | Hacker chỉ chiếm được 1 ví → vẫn không đủ ngưỡng |
| Không có bằng chứng ai đã phê duyệt gì | Mọi chữ ký đều công khai và có thể kiểm chứng |

---

## 5. Kiến trúc kỹ thuật (Tóm tắt)

```
Frontend (React)
    ↕ gọi API
Backend (Express.js)
    ↕ lưu thông tin bổ sung (lý do, người tạo...)
Database (PostgreSQL)
    
Frontend (React)
    ↕ ký giao dịch trực tiếp (qua ethers.js)
Smart Contract (UGC_Treasury.sol)
    ↕ gọi khi đủ chữ ký
Token Contract (ULSAGreenCredit.sol)
    → Mint / Burn token thật
```

**Lưu ý:** Chữ ký và việc thực thi token KHÔNG đi qua Backend. Chúng đi trực tiếp từ ví của Admin → Smart Contract trên Blockchain. Backend chỉ lưu thêm thông tin phụ (lý do, timestamp...) để hiển thị đẹp hơn trên UI.

---

## 6. Ghi chú khi test (Môi trường Local)

- **Blockchain:** Hardhat đang chạy tại `http://127.0.0.1:8545`
- **Threshold hiện tại:** 2 (cần 2 Admin ký)
- **Private Key Admin #0:** `0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80`
- **Private Key Admin #1:** `0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d`
- Để test full quy trình: dùng 2 Key trên thay nhau đăng nhập để ký lần lượt.