// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";

/// @title Credit Provenance — Truy xuất nguồn gốc tín chỉ xanh
/// @notice Ghi nhận chuỗi nguồn gốc đầy đủ cho mỗi tín chỉ xanh được cấp phát.
/// @dev Mỗi bản ghi liên kết claim UUID (dạng bytes32 hash) với thông tin hoạt động,
///      minh chứng, người phê duyệt và sinh viên — tất cả được lưu vĩnh viễn trên chain.
contract CreditProvenance is AccessControl {
    bytes32 public constant RECORDER_ROLE = keccak256("RECORDER_ROLE");

    /// @notice Bản ghi nguồn gốc đầy đủ của một tín chỉ xanh
    struct ProvenanceRecord {
        bytes32 claimId;        // keccak256(claimId UUID string)
        bytes32 activityHash;   // keccak256(activity_name) — loại hoạt động
        bytes32 eventHash;      // keccak256(event_title)   — tên sự kiện
        bytes32 evidenceHash;   // SHA-256 của file minh chứng (32 bytes)
        address student;        // địa chỉ ví sinh viên nhận tín chỉ
        address approver;       // địa chỉ ví người phê duyệt (verifier/admin)
        uint256 timestamp;      // block.timestamp tại thời điểm ghi
        uint256 creditAmount;   // số tín chỉ xanh được cấp
        bool exists;            // sentinel: đã ghi hay chưa
    }

    /// @dev claimId hash => ProvenanceRecord
    mapping(bytes32 => ProvenanceRecord) private _records;

    /// @dev student address => danh sách claimId hash đã nhận tín chỉ
    mapping(address => bytes32[]) private _studentClaims;

    /// @dev Tổng số bản ghi provenance
    uint256 public totalRecords;

    // ─── Events ───────────────────────────────────────────────────────────────

    /// @notice Phát ra khi một bản ghi provenance mới được tạo thành công
    event ProvenanceRecorded(
        bytes32 indexed claimId,
        address indexed student,
        address indexed approver,
        uint256 creditAmount,
        uint256 timestamp
    );

    // ─── Constructor ──────────────────────────────────────────────────────────

    constructor(address admin) {
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(RECORDER_ROLE, admin);
    }

    // ─── Write ────────────────────────────────────────────────────────────────

    /// @notice Ghi nhận provenance cho một tín chỉ xanh vừa được cấp phát
    /// @param claimId      keccak256(claimId UUID) — tương ứng với refId trong ULSAGreenCredit
    /// @param activityHash keccak256(activity_name) — loại hoạt động
    /// @param eventHash    keccak256(event_title)   — tên sự kiện
    /// @param evidenceHash SHA-256 của file minh chứng (bytes32)
    /// @param student      Địa chỉ ví sinh viên
    /// @param creditAmount Số tín chỉ được cấp
    function record(
        bytes32 claimId,
        bytes32 activityHash,
        bytes32 eventHash,
        bytes32 evidenceHash,
        address student,
        uint256 creditAmount
    ) external onlyRole(RECORDER_ROLE) {
        require(!_records[claimId].exists, "CreditProvenance: Already recorded");
        require(student != address(0), "CreditProvenance: Invalid student address");

        _records[claimId] = ProvenanceRecord({
            claimId:      claimId,
            activityHash: activityHash,
            eventHash:    eventHash,
            evidenceHash: evidenceHash,
            student:      student,
            approver:     msg.sender,
            timestamp:    block.timestamp,
            creditAmount: creditAmount,
            exists:       true
        });

        _studentClaims[student].push(claimId);
        totalRecords++;

        emit ProvenanceRecorded(claimId, student, msg.sender, creditAmount, block.timestamp);
    }

    // ─── Read ─────────────────────────────────────────────────────────────────

    /// @notice Lấy bản ghi provenance theo claimId hash
    /// @param claimId keccak256(claimId UUID)
    function getRecord(bytes32 claimId)
        external
        view
        returns (ProvenanceRecord memory)
    {
        require(_records[claimId].exists, "CreditProvenance: Record not found");
        return _records[claimId];
    }

    /// @notice Kiểm tra một claimId đã có provenance chưa
    function hasRecord(bytes32 claimId) external view returns (bool) {
        return _records[claimId].exists;
    }

    /// @notice Lấy danh sách tất cả claimId hash mà một sinh viên đã nhận tín chỉ
    /// @param student Địa chỉ ví sinh viên
    function getStudentClaimIds(address student)
        external
        view
        returns (bytes32[] memory)
    {
        return _studentClaims[student];
    }

    /// @notice Verify: so sánh evidenceHash trên-chain với hash được cung cấp
    /// @return true nếu hash khớp
    function verifyEvidence(bytes32 claimId, bytes32 evidenceHash)
        external
        view
        returns (bool)
    {
        if (!_records[claimId].exists) return false;
        return _records[claimId].evidenceHash == evidenceHash;
    }
}
