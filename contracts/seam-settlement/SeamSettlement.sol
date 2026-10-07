// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title SeamSettlement
/// @notice Tiny CrossVM demo contract. Not product logic.
contract SeamSettlement {
    mapping(bytes32 => uint256) public settlements;
    error AlreadySettled();
    error IntentionalRevert();

    function recordSettlement(bytes32 id, uint256 amount) external {
        if (settlements[id] != 0) revert AlreadySettled();
        settlements[id] = amount;
    }

    function getSettlement(bytes32 id) external view returns (uint256) {
        return settlements[id];
    }

    function revertSettlement(bytes32 id) external pure {
        id;
        revert IntentionalRevert();
    }
}
