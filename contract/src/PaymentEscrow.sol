// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract PaymentEscrow {
    IERC20 public immutable token;

    struct Intent {
        address sender;
        uint256 amount;
        bool claimed;
    }

    mapping(bytes32 => Intent) public intents;

    event IntentLocked(bytes32 indexed intentId, address indexed sender, uint256 amount);
    event IntentClaimed(bytes32 indexed intentId, address indexed recipient);
    event IntentRefunded(bytes32 indexed intentId);

    constructor(address _token) {
        token = IERC20(_token);
    }

    function lock(bytes32 intentId, uint256 amount) external {
        require(intents[intentId].sender == address(0), "Intent exists");
        require(amount > 0, "Invalid amount");

        intents[intentId] = Intent({
            sender: msg.sender,
            amount: amount,
            claimed: false
        });

        require(
            token.transferFrom(msg.sender, address(this), amount),
            "Transfer failed"
        );

        emit IntentLocked(intentId, msg.sender, amount);
    }

    function claim(bytes32 intentId, address recipient) external {
        Intent storage intent = intents[intentId];
        require(intent.sender != address(0), "Invalid intent");
        require(!intent.claimed, "Already claimed");

        intent.claimed = true;

        require(
            token.transfer(recipient, intent.amount),
            "Transfer failed"
        );

        emit IntentClaimed(intentId, recipient);
    }

    function refund(bytes32 intentId) external {
        Intent memory intent = intents[intentId];
        require(intent.sender == msg.sender, "Not sender");
        require(!intent.claimed, "Already claimed");

        delete intents[intentId];

        require(
            token.transfer(msg.sender, intent.amount),
            "Transfer failed"
        );

        emit IntentRefunded(intentId);
    }
}
