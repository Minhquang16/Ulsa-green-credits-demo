# Giải pháp triển khai Quét mã QR Check-in (Web App)

Tài liệu này mô tả cách tích hợp tính năng quét mã QR để xác thực sự hiện diện của sinh viên trước khi cấp tín chỉ xanh.

---

## 1. Công nghệ sử dụng
- **Frontend (Người dùng quét)**: Sử dụng thư viện `html5-qrcode`. Đây là thư viện JavaScript mạnh mẽ cho phép truy cập camera trực tiếp từ trình duyệt web (Chrome, Safari, Firefox).
- **Frontend (Người quản lý tạo mã)**: Sử dụng thư viện `qrcode.react` để chuyển đổi các token thành hình ảnh mã QR.
- **Backend**: Bổ sung các endpoint xử lý logic check-in và xác thực token.

---

## 2. Quy trình nghiệp vụ (Workflow)

### Bước 1: Tạo mã QR (Dành cho Verifier/Admin)
1. Verifier chọn một sự kiện đang diễn ra.
2. Hệ thống tạo ra một **Dynamic Token**. Token này bao gồm:
   - `eventId`: ID của sự kiện.
   - `timestamp`: Thời gian tạo.
   - `nonce`: Một chuỗi ngẫu nhiên.
   - `signature`: Chữ ký số để đảm bảo token không bị giả mạo.
3. Mã QR hiển thị trên màn hình máy tính của Verifier và tự động làm mới sau mỗi 30-60 giây.

### Bước 2: Quét mã QR (Dành cho Sinh viên)
1. Sinh viên đăng nhập vào web app trên điện thoại.
2. Truy cập mục **"Check-in"** -> Hệ thống yêu cầu quyền truy cập Camera.
3. Sinh viên đưa điện thoại lên quét mã QR đang hiển thị.
4. Trình duyệt trích xuất dữ liệu từ mã QR và gửi về Backend kèm theo tọa độ GPS (nếu cần).

### Bước 3: Xác thực và Ghi nhận (Backend)
1. Backend kiểm tra tính hợp lệ của Token (chữ ký, thời gian hết hạn).
2. Kiểm tra xem sinh viên đã check-in sự kiện này chưa.
3. Nếu hợp lệ, ghi nhận trạng thái `checked_in` cho sinh viên đó trong cơ sở dữ liệu.
4. Trả về kết quả thành công cho Frontend.

---

## 3. Các thay đổi kỹ thuật cần thực hiện

### A. Backend (`backend/src/index.js`)
- Thêm endpoint `GET /api/events/:id/qr`: Tạo token và trả về dữ liệu QR.
- Thêm endpoint `POST /api/checkin`: Tiếp nhận dữ liệu quét từ sinh viên và xác thực.

### B. Frontend (`web/frontend/`)
- Cài đặt thư viện: `npm install html5-qrcode qrcode.react`
- Tạo Component `Scanner`: Giao diện mở camera và xử lý quét.
- Tạo Component `QRGenerator`: Giao diện hiển thị mã QR cho Verifier.
- Cập nhật trang `EventsPage`: Thêm nút "Quét QR" cho Sinh viên và "Quản lý QR" cho Verifier.

---

## 4. Lợi ích đối với dự án Blockchain
- **Chống gian lận**: Đảm bảo sinh viên thực sự có mặt tại địa điểm trước khi được phép nộp minh chứng (Claim).
- **Dữ liệu sạch (Clean Data)**: Khi Verifier nhấn nút "Approve" trên Dashboard, họ có thể tin tưởng hoàn toàn vào bằng chứng check-in đã được hệ thống xác thực tự động.
- **Tính minh bạch**: Trạng thái check-in thành công có thể được ghi kèm vào metadata khi lưu hash bằng chứng lên Blockchain.
