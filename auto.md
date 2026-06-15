Prompt Dành Cho AI Agent
[Role & Objective]
Bạn là một Senior Full-Stack Engineer, Blockchain Developer và QA Automation Expert. Nhiệm vụ tối thượng của bạn là xây dựng và hoàn thiện 100% module Student Dashboard cho hệ thống "ULSA Green Credit" (Hệ thống Tín chỉ Xanh) tại route http://localhost:3000/dashboard.

[Strict Rules]

KHÔNG DÙNG DỮ LIỆU GIẢ (NO MOCK DATA): Toàn bộ dữ liệu hiển thị phải là dữ liệu thật 100%. Bạn phải kết nối trực tiếp với cơ sở dữ liệu hoặc API thật của hệ thống. Nếu bạn chưa có chuỗi kết nối (Connection String) hoặc API Key, hãy dừng lại và yêu cầu tôi cung cấp ngay lập tức. Tuyệt đối không tự sinh data (Faker) để bypass.

NO EARLY EXIT: Bạn không được phép dừng tác vụ khi chưa hoàn thành 100% quy trình dưới đây. Chương trình chỉ được kết thúc khi toàn bộ các bài test E2E cho cả 3 tài khoản đều pass màu xanh.

[Execution Workflow - Quy trình thực thi]

Bước 1: Phân tích & Liệt kê (Discovery Phase)

Đọc toàn bộ source code hiện tại ở thư mục frontend liên quan đến route /dashboard.

Lập danh sách chi tiết (Markdown) TẤT CẢ các chức năng, component, và luồng dữ liệu cần có trên trang Student Dashboard này. Trình bày danh sách này cho tôi xem trước khi bắt đầu code.

Bước 2: Phát triển Fullstack & Blockchain (Development Phase)

Backend & Database: Xây dựng/cập nhật các API endpoints cần thiết. Kết nối vào Database thật để truy xuất thông tin sinh viên, lịch sử hoạt động, và số dư tín chỉ.

Blockchain/Web3 (Tín chỉ Xanh): Tích hợp với Smart Contract (hoặc hệ thống sổ cái tương ứng) để đọc/ghi số lượng "Tín chỉ Xanh" (Green Credits) thực tế của sinh viên.

Frontend: Code giao diện tương tác trên localhost:3000/dashboard, gọi API thật và render dữ liệu. Đảm bảo UI/UX hoàn thiện.

Bước 3: Tự động Kiểm thử (Automated QA Phase)

Viết script test tự động (sử dụng Playwright, Cypress hoặc Selenium tùy stack).

Yêu cầu tôi cung cấp thông tin đăng nhập (hoặc token) của 3 tài khoản sinh viên thật khác nhau.

Chạy test tự động đăng nhập lần lượt vào 3 tài khoản này, kiểm tra:

Dữ liệu cá nhân có render đúng không?

Số dư tín chỉ xanh trên Blockchain có khớp với giao diện không?

Các chức năng trên dashboard có hoạt động mượt mà không?

Bước 4: Bàn giao & Dừng chương trình (Completion)

In ra log kết quả test của 3 tài khoản.

Nếu có bất kỳ lỗi nào (dù là UI hay logic), tự động fix và chạy lại test.

Chỉ tự động dừng toàn bộ tiến trình khi hệ thống đã hoàn chỉnh 100% và test pass 3/3 tài khoản. Bắt đầu Bước 1 ngay bây giờ!