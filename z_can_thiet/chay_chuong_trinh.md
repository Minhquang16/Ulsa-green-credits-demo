# Hướng dẫn chạy chương trình ULSA Green Credit (Thủ công)

Tài liệu này tổng hợp toàn bộ các lệnh cần thiết để chạy hệ thống bằng tay từng phần (không dùng Docker Compose toàn bộ) để phục vụ việc phát triển hoặc demo chi tiết.

---

## ⚠️ Lưu ý quan trọng
Trước khi chạy, hãy đảm bảo bạn đã dừng tất cả các container Docker đang chạy để tránh trùng cổng:
```bash
docker compose down
```

---

## 1. Chạy Mạng Blockchain (Hardhat)
Mở **Terminal 1**:
```bash
cd blockchain
npm install
npx hardhat node
```
*Giữ Terminal này chạy xuyên suốt.*

Mở **Terminal 2** (Chỉ chạy 1 lần để cài đặt hợp đồng lên mạng lưới):
```bash
cd blockchain
npx hardhat run scripts/deploy.js --network localhost
```

---

## 2. Chạy Cơ sở dữ liệu (PostgreSQL)
Mở **Terminal 3**:
Bạn có thể dùng Docker để chạy riêng Database (nhanh và sạch nhất):
```bash
docker compose up db -d
```
*Lưu ý: Database này sẽ mở cổng **5434** ở máy ngoài.*

---

## 3. Chạy Backend API
Mở **Terminal 4**:
```bash
cd backend
npm install

# Thiết lập kết nối tới DB Docker (Cổng 5434)
export DATABASE_URL=postgres://ugc:ugc@localhost:5434/ugc

# Chạy Backend
npm start
```

---

## 4. Chạy Frontend Web
Mở **Terminal 5**:
```bash
cd web/frontend
npm install
npm run dev
```
Truy cập web tại: **http://localhost:3000**

---

## 5. Thông tin đăng nhập Demo
| Vai trò | Username | Password |
| :--- | :--- | :--- |
| **Quản trị viên** | `admin` | `admin123` |
| **Người duyệt** | `verifier` | `verifier123` |
| **Sinh viên 1** | `student1` | `student123` |
| **Sinh viên 2** | `student2` | `student123` |

---

## 6. Xử lý lỗi thường gặp

### ❌ Lỗi: `TypeError: Cannot read properties of undefined (reading 'id')`
Backend crash khi khởi động do database có dữ liệu cũ không đồng bộ.
```bash
# Xoá volume cũ và khởi tạo lại Database sạch
docker compose down -v
docker compose up db -d
# Sau đó chạy lại Backend ở mục 3
```

### ❌ Lỗi: `column "image_url" of relation "rewards" does not exist`
Database cũ chưa có cột `image_url`. Đã được sửa trong file `db/init.sql`.
Cần reset lại Database để áp dụng cấu trúc mới:
```bash
docker compose down -v
docker compose up db -d
```

### ❌ Lỗi: `PayloadTooLargeError: request entity too large`
Frontend gửi dữ liệu quá lớn (ví dụ ảnh base64). Đã được sửa trong `backend/src/index.js`
bằng cách tăng giới hạn lên 50mb. Không cần làm gì thêm.

### ❌ Lỗi: `foreign key constraint "rewards_created_by_fkey"` hoặc web không đăng nhập được sau khi reset DB
Trình duyệt vẫn đang lưu JWT Token cũ từ lần đăng nhập trước. Cần xóa dữ liệu cũ:
1. Mở trình duyệt, nhấn `F12` → Tab **Console**.
2. Gõ lệnh sau rồi nhấn Enter:
```javascript
localStorage.clear(); location.reload();
```
3. Đăng nhập lại bình thường.

### ❌ Lỗi: `npm error Missing script: "start"`
Bạn đang chạy lệnh sai thư mục. Kiểm tra lại dòng đầu Terminal:
- `(base) 192:backend tho$` → Đúng, có thể chạy `npm start`.
- `(base) 192:blockchain tho$` → Sai thư mục, cần `cd ../backend` trước.

