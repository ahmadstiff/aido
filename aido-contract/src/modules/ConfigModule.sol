// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/// @title ConfigModule
/// @notice Base generic config module for AIDO governance proposals.
///         Owned by the DAO timelock so that only governance can mutate values.
///         Stores arbitrary key-value pairs and emits events for indexing.
abstract contract ConfigModule is Ownable {
    // ──── Storage ────

    mapping(bytes32 => uint256) public uintValues;
    mapping(bytes32 => bool) public boolValues;
    mapping(bytes32 => string) public stringValues;
    mapping(bytes32 => address) public addressValues;

    // ──── Events ────

    event UintSet(bytes32 indexed key, uint256 value);
    event BoolSet(bytes32 indexed key, bool value);
    event StringSet(bytes32 indexed key, string value);
    event AddressSet(bytes32 indexed key, address value);

    // ──── Constructor ────

    constructor(address _owner) Ownable(_owner) {}

    // ──── Setters (only owner / timelock) ────

    function setUint(bytes32 key, uint256 value) external onlyOwner {
        uintValues[key] = value;
        emit UintSet(key, value);
    }

    function setBool(bytes32 key, bool value) external onlyOwner {
        boolValues[key] = value;
        emit BoolSet(key, value);
    }

    function setString(bytes32 key, string calldata value) external onlyOwner {
        stringValues[key] = value;
        emit StringSet(key, value);
    }

    function setAddress(bytes32 key, address value) external onlyOwner {
        addressValues[key] = value;
        emit AddressSet(key, value);
    }
}
