# Ý tưởng mở rộng hệ thống ULSA Green Credit (Cảm hứng từ mô hình AgUnity)

Tài liệu này trình bày các định hướng phát triển và mở rộng hệ thống tín chỉ xanh **ULSA Green Credit** bằng cách kế thừa và áp dụng các triết lý cốt lõi từ **AgUnity** — một dự án blockchain trong nông nghiệp vô cùng thành công trên thế giới về việc giải quyết bài toán niềm tin và chuỗi cung ứng.

---

## 1. So sánh mô hình đối chiếu

| Tính năng cốt lõi của AgUnity | Chuyển đổi tương ứng trong ULSA Green Credit | Giá trị mang lại |
| :--- | :--- | :--- |
| **Traceability** (Truy xuất nguồn gốc nông sản từ trang trại đến bàn ăn) | **Credit Provenance** (Truy xuất nguồn gốc minh chứng và quy trình tạo ra tín chỉ xanh) | Đảm bảo tính trung thực tuyệt đối của tín chỉ xanh, chống làm giả hoặc thổi phồng số liệu. |
| **Offline Transaction** (Giao dịch ngoại tuyến tại vùng sâu vùng xa) | **Offline Check-in Queue** (Hàng đợi quét mã QR check-in ngoại tuyến khi không có mạng) | Khắc phục giới hạn kết nối Internet chập chờn tại các sự kiện đông người hoặc đi tình nguyện ngoài trời. |
| **Digital Credit History** (Hồ sơ tín dụng số thay thế giúp nông dân tiếp cận tài chính) | **Green CV & ESG Profile** (Hồ sơ năng lực xanh và điểm uy tín xanh tích lũy của sinh viên) | Kết nối kết quả rèn luyện của sinh viên với các quyền lợi thực tế (học bổng, việc làm). |
| **Impact Carbon Tracking** (Đo lường mức độ giảm phát thải carbon và phủ xanh) | **CO₂ & ESG Metrics** (Định lượng hóa tác động môi trường từ các hoạt động của trường) | Chuyển đổi số liệu thô sang các chỉ số tác động xã hội (ESG) trực quan cho toàn trường. |

---

## 2. Chi tiết các giải pháp đề xuất

### 2.1. "Truy xuất nguồn gốc" Tín chỉ xanh (Green Credit Provenance)
* **Đặt vấn đề**: Tín chỉ xanh sau khi phát hành cần chứng minh được giá trị thực tế của nó, tránh việc các tài khoản admin/verifier tự ý cấp khống tín chỉ cho sinh viên.
* **Giải pháp**: Mỗi Tín chỉ Xanh (UGC) phát hành trên blockchain sẽ liên kết trực tiếp với một mã băm (`evidenceHash` và `referenceId`). Chuỗi dữ liệu này bao gồm:
  1. **Nguồn gốc ban đầu**: Mã sự kiện, thời gian diễn ra và người tổ chức.
  2. **Xác thực sự hiện diện**: Tọa độ GPS và thời gian quét mã QR check-in thành công.
  3. **Minh chứng đính kèm**: Ảnh chụp minh chứng tham gia (được AI phân tích hoặc lưu trữ bản ghi hash).
  4. **Chữ ký xác thực**: Khóa công khai của Verifier trực tiếp phê duyệt.
* **Lợi ích**: Bất kỳ bên thứ ba nào (nhà tài trợ, doanh nghiệp) cũng có thể kiểm tra chéo (traceback) on-chain để xác thực độ tin cậy của toàn bộ số dư tín chỉ mà sinh viên sở hữu.

### 2.2. Hàng đợi quét mã QR ngoại tuyến (Offline Check-in Queue)
* **Đặt vấn đề**: Khi sinh viên tập trung quét mã QR tại các hội trường lớn, tầng hầm hoặc các khu vực tình nguyện xa xôi, kết nối 3G/4G/Wifi thường bị nghẽn mạng hoặc mất sóng.
* **Giải pháp**: Tích hợp công nghệ lưu trữ tạm thời tại phía client (LocalStorage hoặc IndexedDB trên trình duyệt điện thoại sinh viên):
  1. Khi quét mã QR sự kiện trong trạng thái offline, ứng dụng sẽ ghi nhận chữ ký thời gian (`timestamp`) và token của mã QR vào hàng đợi.
  2. Mã hóa dữ liệu này kèm theo một chữ ký tạm thời của ví sinh viên.
  3. Khi phát hiện thiết bị khôi phục kết nối mạng, ứng dụng sẽ chạy một service ngầm (background sync) để tự động gửi toàn bộ gói tin check-in trong hàng đợi lên Backend để xác thực on-chain.
* **Lợi ích**: Tối ưu hóa trải nghiệm người dùng, đảm bảo không bỏ sót bất kỳ ghi nhận hoạt động nào của sinh viên kể cả trong điều kiện hạ tầng mạng yếu.

### 2.3. Xây dựng Hồ sơ năng lực xanh (Green CV & ESG Profile)
* **Đặt vấn đề**: Tín chỉ xanh cần có giá trị ứng dụng thực tế để tạo động lực lâu dài cho sinh viên tham gia rèn luyện, thay vì chỉ là điểm số tích lũy nội bộ.
* **Giải pháp**: Sử dụng lịch sử hoạt động được lưu vĩnh viễn trên blockchain để xây dựng **Green CV**:
  * Điểm uy tín xanh được đánh giá qua: *Tần suất tham gia hoạt động, tỷ lệ claims được duyệt thành công ngay lập tức và tính đa dạng của các hoạt động bảo vệ môi trường*.
  * Sinh viên có thể xuất "Green CV" đã được xác thực mã hóa bằng blockchain để nộp kèm hồ sơ xin việc.
  * Các doanh nghiệp tuyển dụng quan tâm đến chỉ số phát triển bền vững (ESG) sẽ đánh giá cao các ứng viên có lịch sử đóng góp môi trường minh bạch được chứng thực bởi nhà trường.
* **Lợi ích**: Gia tăng giá trị đầu ra cho sinh viên, thúc đẩy sự liên kết chặt chẽ giữa Nhà trường - Sinh viên - Doanh nghiệp.

### 2.4. Tích hợp chỉ số giảm thiểu Carbon (CO₂ Offset & ESG Dashboard)
* **Đặt vấn đề**: Cần định lượng rõ ràng đóng góp của tập thể sinh viên đối với môi trường toàn cầu thay vì chỉ đếm số lượng người tham gia sự kiện.
* **Giải pháp**: Gán hệ số quy đổi môi trường thực tế cho từng nhóm hoạt động trong cơ sở dữ liệu:
  * *Trồng 1 cây xanh* = Cắt giảm **22 kg CO₂ / năm**.
  * *Thu gom 1 kg giấy vụn* = Tiết kiệm **26 lít nước** và giảm **0.9 kg CO₂**.
  * *Tình nguyện dọn rác 1 giờ* = Làm sạch **10 m²** cảnh quan môi trường.
  * Trên Dashboard quản trị của nhà trường sẽ hiển thị một widget **ESG impact** hiển thị tổng số lượng cây xanh đã trồng, tổng khối lượng CO₂ đã cắt giảm và lượng nước đã tiết kiệm được nhờ các chiến dịch của sinh viên.
* **Lợi ích**: Giúp nhà trường có báo cáo số liệu ESG chính xác, minh bạch để làm việc với các tổ chức quốc tế hoặc các quỹ tài trợ bảo vệ môi trường.
