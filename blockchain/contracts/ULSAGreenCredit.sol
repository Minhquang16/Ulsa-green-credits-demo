// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

/// @title ULSA Green Credit (demo)
/// @notice ERC20 token used as "tín chỉ xanh" (internal points). Not intended for speculation.
/// @dev Demo contract for the research project: "Ứng dụng Blockchain trong xây dựng hệ thống tín chỉ xanh tại ULSA".
contract ULSAGreenCredit is ERC20, AccessControl {
    bytes32 public constant ISSUER_ROLE = keccak256("ISSUER_ROLE");
    bytes32 public constant BURNER_ROLE = keccak256("BURNER_ROLE");

    enum BurnType { REDEEM, RETIRE }

    uint256 public totalIssued;
    uint256 public totalBurned;

    event CreditsIssued(address indexed to, uint256 amount, bytes32 indexed refId, bytes32 evidenceHash);
    event CreditsBurned(address indexed from, uint256 amount, BurnType burnType, bytes32 indexed refId, bytes32 reasonHash);

    constructor(address admin) ERC20("ULSA Green Credit", "UGC") {
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(ISSUER_ROLE, admin);
        _grantRole(BURNER_ROLE, admin);
    }

    /// @notice credits are integers (no decimals) for easier demo
    function decimals() public pure override returns (uint8) {
        return 0;
    }

    /// @notice Issue (mint) credits to a student when a claim is approved.
    /// @param to Student wallet address
    /// @param amount Number of credits
    /// @param refId Reference ID (e.g., claimId hashed to bytes32)
    /// @param evidenceHash Hash of evidence file (sha256) stored off-chain
    function issue(address to, uint256 amount, bytes32 refId, bytes32 evidenceHash) external onlyRole(ISSUER_ROLE) {
        _mint(to, amount);
        totalIssued += amount;
        emit CreditsIssued(to, amount, refId, evidenceHash);
    }

    /// @notice Burn credits for redeeming rewards or retiring credits.
    /// @param from Student wallet address
    /// @param amount Credits to burn
    /// @param burnType REDEEM or RETIRE
    /// @param refId Reference ID (e.g., redemptionId hashed to bytes32)
    /// @param reasonHash Optional reason hash (keccak256 of reason string)
    function burn(address from, uint256 amount, BurnType burnType, bytes32 refId, bytes32 reasonHash) external onlyRole(BURNER_ROLE) {
        _burn(from, amount);
        totalBurned += amount;
        emit CreditsBurned(from, amount, burnType, refId, reasonHash);
    }
}
