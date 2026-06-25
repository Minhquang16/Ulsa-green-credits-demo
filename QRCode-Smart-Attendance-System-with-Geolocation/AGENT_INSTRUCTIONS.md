# Hướng Dẫn Tích Hợp Module Điểm Danh Chống Gian Lận (Dành cho AI Agent)

**Mục tiêu:** Tích hợp module "QR Code & Geolocation Anti-Fraud" vào dự án chính (Hệ thống Green Credit). 

Agent hãy đọc kỹ quy trình dưới đây để thực hiện việc chuyển đổi code và kết nối API giữa Frontend và Backend.

---

## 1. Cấu trúc các file cần sao chép từ Module này sang Dự án chính
Agent cần bốc toàn bộ các file sau từ thư mục bóc tách ghép vào cấu trúc tương ứng của dự án chính:
- `src/page/Home.jsx` (Giao diện hiển thị QR cho Admin).
- `src/page/Attendance.jsx` (Logic 3 lớp bảo mật khi sinh viên quét mã).
- `src/utils/crypto.js` (Hàm mã hóa Token).
- `src/utils/distanceCalculation.js` (Hàm tính khoảng cách Haversine).

---

## 2. Nhiệm vụ 1: Xử lý Luồng Admin (Quản lý sự kiện)
**Yêu cầu logic:**
- Admin có tính năng tạo sự kiện: `[Tên, Ảnh, Thời gian bắt đầu, Thời gian kết thúc, Tọa độ Lat, Tọa độ Lng]`.
- Khi sự kiện diễn ra, Admin sẽ mở một trang "Trình chiếu QR".

**Hành động code (Refactor `Home.jsx`):**
1. Không dùng State nhập tay `lat`, `lng` tĩnh nữa. 
2. Viết hàm fetch API lấy chi tiết của Sự kiện hiện tại từ Backend.
3. Truyền biến `event.lat` và `event.lng` vào hàm `encryptData()`.
4. Mã QR phải tự động làm mới (refresh) mỗi 60 giây để sinh ra `timestamp` mới chống chụp ảnh.

---

## 3. Nhiệm vụ 2: Xử lý Luồng Sinh viên (Tham gia sự kiện)
**Yêu cầu logic:**
- Màn hình chi tiết sự kiện cho phép sinh viên bấm nút **"Tham gia"**. Bấm xong sẽ lưu database trạng thái "Đã đăng ký".
- Sinh viên quét mã QR do Admin trình chiếu để điểm danh.

**Hành động code (Refactor `Attendance.jsx`):**
Giữ nguyên luồng 3 lớp bảo mật hiện tại, nhưng bổ sung các ràng buộc thực tế:
1. **Validation 1 (Thời gian Event):** Sự kiện có thời lượng dài (VD: 8h sáng - 10h sáng). Trước khi chạy GPS, gọi API check xem thời gian hiện tại có nằm trong khung giờ `[start_time, end_time]` của sự kiện không. Nếu chưa tới giờ hoặc đã kết thúc -> Báo lỗi "Sự kiện không trong thời gian cho phép".
2. **Validation 2 (Lớp bảo mật 1 - Thời gian QR Động):** Đây là vòng đời ngắn của mã QR để chống gửi ảnh qua mạng. Giải mã Token bằng `crypto.js` để lấy `timestamp` (thời điểm admin tạo ra cái mã QR đó trên màn hình). Kiểm tra `Date.now() - timestamp <= 90000` (Mã QR chỉ sống đúng 90 giây. Quá 90s từ lúc hiển thị trên màn hình chiếu là hết hạn).
3. **Validation 3 (Lớp bảo mật 2 - GPS):** Chạy hàm `getCurrentPosition`. Từ chối nếu `accuracy > 500`. Dùng hàm `calculateDistance` đo khoảng cách, yêu cầu `<= 20m` (hoặc bán kính tùy chỉnh từ Database của sự kiện).
4. **Validation 4 (Device Fingerprint):** Giữ nguyên logic kiểm tra `localStorage` hoặc chuyển sang check Database xem `device_id` đã điểm danh cho sự kiện này chưa.
5. **Validation 5 (Lớp bảo mật 3 - Liveness):** Giữ nguyên cơ chế mở Camera, chớp màu màn hình 3 giây và tự động chụp lấy ảnh Base64.

---

## 4. Nhiệm vụ 3: Kết nối API Nộp Bằng Chứng (Hoàn Tất)
**Hành động code:**
Trong hàm `takePhoto()` của file `Attendance.jsx`, ngay sau khi có được biến `dataUrl` (ảnh Selfie) và tọa độ GPS hợp lệ:
1. Viết một API POST (ví dụ dùng Axios) gửi payload lên Backend bao gồm:
   ```json
   {
      "event_id": "ID của sự kiện",
      "student_id": "Lấy từ Context/Redux lúc user đăng nhập",
      "proof_image": "Chuỗi Base64 của ảnh chụp (dataUrl)",
      "checkin_lat": "Vĩ độ lúc đứng quét",
      "checkin_lng": "Kinh độ lúc đứng quét",
      "device_id": "Device Fingerprint UUID"
   }
   ```
2. Nếu Backend trả về Status 200 (Thành công cộng Green Credit), hiển thị UI "Điểm danh thành công" màu xanh lá.
3. Nếu Backend trả về Lỗi (Ví dụ: Đã điểm danh rồi), hiển thị UI Lỗi cảnh báo gian lận.

---
**Nhắn nhủ tới Agent:** 
*Hãy tuân thủ nghiêm ngặt luồng dữ liệu này. Không được bỏ bớt bất cứ lớp bảo vệ `accuracy` hay `timestamp` nào trong file `Attendance.jsx` vì đây là core chống gian lận. Chúc may mắn!*
