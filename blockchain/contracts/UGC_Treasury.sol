// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./ULSAGreenCredit.sol";

contract UGC_Treasury {
    ULSAGreenCredit public token;
    
    address[] public admins;
    mapping(address => bool) public isAdmin;
    uint256 public threshold;
    
    enum TransactionType { MINT, BURN }
    
    struct Proposal {
        uint256 id;
        address proposer;
        address targetAddress;
        uint256 amount;
        TransactionType transactionType;
        uint256 signatureCount;
        bool executed;
    }
    
    mapping(uint256 => Proposal) public proposals;
    uint256 public proposalCount;
    
    // mapping proposalId => (admin address => hasConfirmed)
    mapping(uint256 => mapping(address => bool)) public isConfirmed;
    
    event ProposalCreated(uint256 indexed id, address indexed proposer, address targetAddress, uint256 amount, TransactionType transactionType);
    event ProposalConfirmed(uint256 indexed id, address indexed admin);
    event ProposalExecuted(uint256 indexed id);
    
    modifier onlyAdmin() {
        require(isAdmin[msg.sender], "UGC_Treasury: Not an admin");
        _;
    }
    
    constructor(address _tokenAddress, address[] memory _admins, uint256 _threshold) {
        require(_admins.length > 0, "UGC_Treasury: Admins required");
        require(_threshold > 0 && _threshold <= _admins.length, "UGC_Treasury: Invalid threshold");
        
        token = ULSAGreenCredit(_tokenAddress);
        for (uint i = 0; i < _admins.length; i++) {
            require(!isAdmin[_admins[i]], "UGC_Treasury: Duplicate admin");
            isAdmin[_admins[i]] = true;
            admins.push(_admins[i]);
        }
        threshold = _threshold;
    }
    
    function submitProposal(address _targetAddress, uint256 _amount, TransactionType _transactionType) external onlyAdmin returns (uint256) {
        uint256 id = proposalCount++;
        Proposal storage p = proposals[id];
        p.id = id;
        p.proposer = msg.sender;
        p.targetAddress = _targetAddress;
        p.amount = _amount;
        p.transactionType = _transactionType;
        p.signatureCount = 0;
        p.executed = false;
        
        emit ProposalCreated(id, msg.sender, _targetAddress, _amount, _transactionType);
        
        // Người tạo tự động xác nhận
        confirmProposal(id);
        
        return id;
    }
    
    function confirmProposal(uint256 _id) public onlyAdmin {
        Proposal storage p = proposals[_id];
        require(_id < proposalCount, "UGC_Treasury: Proposal does not exist");
        require(!p.executed, "UGC_Treasury: Already executed");
        require(!isConfirmed[_id][msg.sender], "UGC_Treasury: Already confirmed");
        
        isConfirmed[_id][msg.sender] = true;
        p.signatureCount++;
        
        emit ProposalConfirmed(_id, msg.sender);
    }
    
    function executeProposal(uint256 _id) external onlyAdmin {
        Proposal storage p = proposals[_id];
        require(_id < proposalCount, "UGC_Treasury: Proposal does not exist");
        require(!p.executed, "UGC_Treasury: Already executed");
        require(p.signatureCount >= threshold, "UGC_Treasury: Not enough signatures");
        
        p.executed = true;
        
        if (p.transactionType == TransactionType.MINT) {
            token.issue(p.targetAddress, p.amount, bytes32(0), bytes32(0));
        } else {
            token.burn(p.targetAddress, p.amount, ULSAGreenCredit.BurnType.RETIRE, bytes32(0), bytes32(0));
        }
        
        emit ProposalExecuted(_id);
    }

    function getAdmins() external view returns (address[] memory) {
        return admins;
    }
}
