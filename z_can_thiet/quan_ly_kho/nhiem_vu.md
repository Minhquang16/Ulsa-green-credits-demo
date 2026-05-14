MASTER PROMPT: MULTI-SIG TREASURY IMPLEMENTATION
Context:
Tôi đang phát triển hệ thống ULSA Green Credit. Hiện tại hệ thống đã có token ERC-20 (UGC). Tôi cần nâng cấp hệ thống này lên cơ chế Multi-signature Treasury (Đa chữ ký) để quản lý việc Mint và Burn token.

Technical Stack:

Blockchain: Solidity, Hardhat, Ethers.js.

Backend: Node.js, Express.

Frontend: React (Vite/Next.js), Tailwind CSS.

Wallet: Metamask.

PHẦN 1: SMART CONTRACT (SOLIDITY)
Hãy tạo/nâng cấp Contract UGC_Treasury.sol với các yêu cầu sau:

Quản trị: Lưu danh sách admins (array) và biến threshold (số chữ ký cần thiết, ví dụ: 2).

Cấu trúc dữ liệu:

struct Proposal: gồm id, proposer, targetAddress, amount, transactionType (Mint/Burn), signatureCount, executed (bool).

mapping(uint256 => mapping(address => bool)) isConfirmed: Để kiểm tra xem một Admin đã ký cho Proposal đó chưa.

Hàm chính:

submitProposal: Cho phép một Admin tạo lệnh Mint/Burn.

confirmProposal: Cho phép các Admin khác vào ký tên.

executeProposal: Khi đủ signatureCount >= threshold, thực hiện hàm _mint hoặc _burn thực tế trên token UGC.

Sự kiện (Events): Emit các event ProposalCreated, ProposalConfirmed, ProposalExecuted.

PHẦN 2: BACKEND (NODE.JS & DATABASE)
API Endpoints:

POST /api/treasury/proposals: Lưu thông tin bổ sung của proposal (ví dụ: reason - lý do Mint, description) vào Database.

GET /api/treasury/proposals: Lấy danh sách tất cả proposal kèm trạng thái (Pending/Executed).

Blockchain Watcher:

Viết một script sử dụng ethers.js để lắng nghe các Event từ Smart Contract. Khi có Event ProposalExecuted, hãy cập nhật trạng thái trong Database thành "Successful".

PHẦN 3: FRONTEND (REACT UI)
Trang Quản lý Kho quỹ (Treasury Management):

Form "Yêu cầu Mint/Burn": Nhập địa chỉ ví nhận, số lượng và lý do.

Dashboard Danh sách Proposal: Hiển thị dưới dạng các Card.

Mỗi Card hiện: Loại (Mint/Burn), Số lượng, Lý do, Người tạo.

Thanh tiến trình (Progress Bar): Hiển thị trực quan ví dụ 1/2 signatures hoặc 2/3 signatures.

Logic Nút bấm:

Nếu Admin chưa ký: Hiện nút "Ký xác nhận (Confirm)".

Nếu đã đủ chữ ký và chưa thực thi: Hiện nút "Thực thi (Execute)".

Nếu đã thực thi: Hiện nhãn "Hoàn thành (Success)" kèm TX Hash.

Tích hợp Web3: Sử dụng useAccount, useContractWrite (từ wagmi) hoặc ethers.js để kết nối Metamask.

CHI TIẾT GIAO DIỆN (UI/UX)
Sử dụng màu Emerald-600 làm màu chủ đạo (giống bản demo).

Các thẻ Proposal phải có thiết kế Card-based, bo góc rounded-lg, đổ bóng nhẹ.

Thêm icon ShieldCheck cho các giao dịch đã an toàn và Hourglass cho các giao dịch đang chờ.

Yêu cầu Agent: Hãy bắt đầu bằng việc viết Smart Contract trước, sau đó là Backend và cuối cùng là hoàn thiện giao diện React. Đảm bảo code sạch, có comment giải thích từng bước.