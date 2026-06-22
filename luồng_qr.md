Luồng hoạt động Fullstack (Từ lúc bấm đến lúc thành công)
1. Giai đoạn 1: Khởi tạo (Trigger & Permission)

Người dùng: Bấm nút "Quét QR Check-in" ở màn hình chính.

Hệ thống (Frontend): * Mở Modal/Dialog lên.

Kích hoạt thư viện quét QR (ví dụ @yudiel/react-qr-scanner).

Xin quyền truy cập Camera của trình duyệt.

Nút xác nhận bên dưới hiển thị trạng thái ban đầu (ví dụ: Hủy và đóng).

2. Giai đoạn 2: Trạng thái Đang quét (Scanning Mode)

Hệ thống (Frontend): * Camera bật lên. Hiển thị khung Overlay bo góc có hiệu ứng vạch xanh chạy lên xuống (Scanning animation).

Nút bấm chuyển sang màu xanh lá: Đang quét mã... và bị vô hiệu hóa (disabled) để tránh click nhầm.

Xử lý ảnh mờ/lệch khung: Thư viện sẽ liên tục chụp các khung hình (frame) để giải mã. Nếu quá 3-5 giây mà chưa quét được (do mờ, rung, hoặc đưa lệch khung), hệ thống sẽ hiển thị một dòng thông báo nhỏ (Toast hoặc Text Overlay): "Căn chỉnh mã QR vào khung để quét" (như trong ảnh của bạn).

3. Giai đoạn 3: Trạng thái Xử lý (Processing / Fullstack Request)

Hệ thống (Frontend): * Bắt được chuỗi Text từ QR Code (ví dụ: USER_TICKET_12345).

Lập tức "đóng băng" camera (tạm dừng quét tiếp) để tránh call API liên tục.

Đổi trạng thái nút bấm thành Đang xử lý... kèm icon xoay (loading spinner).

Gửi một HTTP POST Request (chứa mã QR) xuống Backend.

Hệ thống (Backend - Node.js/PHP):

Nhận mã QR, kiểm tra trong Database (MySQL).

Validate: Mã này hợp lệ không? Đã check-in chưa? Có đúng sự kiện không?

Trả về response (JSON) cho Frontend: success: true hoặc success: false kèm message.

4. Giai đoạn 4: Trạng thái Thành công / Thất bại (Result)

Hệ thống (Frontend):

Nếu Thất bại: Hiển thị lỗi (Toast màu đỏ "Mã không hợp lệ"). Mở khóa lại Camera để quét tiếp, nút trở về Đang quét mã....

Nếu Thành công: Nút bấm chuyển sang màu xanh dương hoặc xanh lá đậm: Thành công!. Phát ra âm thanh "Ting" (tùy chọn). Sau đó 1.5 giây, Modal tự động đóng lại và cập nhật lại giao diện bên ngoài (tăng điểm UGC, đổi trạng thái điểm danh).