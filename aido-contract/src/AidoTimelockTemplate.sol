// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {TimelockController} from "@openzeppelin/contracts/governance/TimelockController.sol";

/// @title AidoTimelockTemplate
/// @notice Timelock controller template for AIDO DAOs.
///         Deployed per-DAO by AidoDaoFactory. Governor becomes the proposer;
///         executor can be open (address(0)) for hackathon convenience.
contract AidoTimelockTemplate is TimelockController {
    /// @param minDelay   Minimum delay in seconds before execution
    /// @param proposers  Addresses granted proposer + canceller roles (governor)
    /// @param executors  Addresses granted executor role (address(0) = anyone)
    /// @param admin      Optional admin; use address(0) to disable
    constructor(
        uint256 minDelay,
        address[] memory proposers,
        address[] memory executors,
        address admin
    ) TimelockController(minDelay, proposers, executors, admin) {}
}
