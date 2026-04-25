// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {IVotes} from "@openzeppelin/contracts/governance/utils/IVotes.sol";
import {TimelockController} from "@openzeppelin/contracts/governance/TimelockController.sol";
import {AidoGovernorTemplate} from "./AidoGovernorTemplate.sol";
import {AidoTimelockTemplate} from "./AidoTimelockTemplate.sol";
import {AidoDaoRegistry} from "./AidoDaoRegistry.sol";

/// @title AidoDaoFactory
/// @notice Deploys a new DAO (governor + timelock) in one transaction and
///         registers it in the AidoDaoRegistry. Any user can call `createDao`.
contract AidoDaoFactory is Ownable {
    // ──── Types ────

    struct CreateDaoParams {
        string name;
        address token;
        uint48 votingDelay;
        uint32 votingPeriod;
        uint256 proposalThreshold;
        uint256 quorumNumerator;
        address initialOwner;
        string metadataURI;
    }

    // ──── State ────

    AidoDaoRegistry public registry;
    bool public paused;

    /// @notice Minimum timelock delay applied to every new DAO (in seconds).
    ///         Kept short for hackathon/demo; adjust for production.
    uint256 public constant TIMELOCK_MIN_DELAY = 1;

    // ──── Events ────

    event DaoCreated(
        address indexed creator,
        address indexed governor,
        address indexed timelock,
        address token,
        string name,
        string metadataURI
    );

    // ──── Errors ────

    error FactoryPaused();
    error ZeroAddress();
    error InvalidQuorum();
    error VotingPeriodTooShort();
    error RegistryNotSet();

    // ──── Constructor ────

    constructor(address _registry) Ownable(msg.sender) {
        if (_registry == address(0)) revert ZeroAddress();
        registry = AidoDaoRegistry(_registry);
    }

    // ──── Admin ────

    function setRegistry(address _registry) external onlyOwner {
        if (_registry == address(0)) revert ZeroAddress();
        registry = AidoDaoRegistry(_registry);
    }

    function pauseFactory(bool _paused) external onlyOwner {
        paused = _paused;
    }

    // ──── Create DAO ────

    /// @notice Deploy a new DAO. Anyone can call this.
    function createDao(
        string calldata name,
        address token,
        uint48 votingDelay,
        uint32 votingPeriod,
        uint256 proposalThreshold,
        uint256 quorumNumerator,
        address initialOwner,
        string calldata metadataURI
    ) external returns (address governor, address timelock) {
        CreateDaoParams memory p = CreateDaoParams({
            name: name,
            token: token,
            votingDelay: votingDelay,
            votingPeriod: votingPeriod,
            proposalThreshold: proposalThreshold,
            quorumNumerator: quorumNumerator,
            initialOwner: initialOwner,
            metadataURI: metadataURI
        });
        return _createDao(p);
    }

    function _createDao(CreateDaoParams memory p) internal returns (address governor, address timelock) {
        if (paused) revert FactoryPaused();
        if (p.token == address(0)) revert ZeroAddress();
        if (p.quorumNumerator == 0) revert InvalidQuorum();
        if (p.votingPeriod < 1) revert VotingPeriodTooShort();
        if (address(registry) == address(0)) revert RegistryNotSet();

        // 1. Deploy timelock
        timelock = _deployTimelock();

        // 2. Deploy governor connected to timelock
        governor = _deployGovernor(p, timelock);

        // 3. Configure timelock roles
        _configureTimelock(AidoTimelockTemplate(payable(timelock)), governor, p.initialOwner);

        // 4. Register DAO in registry
        registry.registerDao(governor, timelock, p.token, msg.sender, p.name, p.metadataURI);

        emit DaoCreated(msg.sender, governor, timelock, p.token, p.name, p.metadataURI);
    }

    function _deployTimelock() internal returns (address) {
        address[] memory emptyArray = new address[](0);
        AidoTimelockTemplate tl = new AidoTimelockTemplate(
            TIMELOCK_MIN_DELAY,
            emptyArray,
            emptyArray,
            address(this)
        );
        return address(tl);
    }

    function _deployGovernor(CreateDaoParams memory p, address _timelock) internal returns (address) {
        AidoGovernorTemplate gov = new AidoGovernorTemplate(
            p.name,
            IVotes(p.token),
            TimelockController(payable(_timelock)),
            p.votingDelay,
            p.votingPeriod,
            p.proposalThreshold,
            p.quorumNumerator
        );
        return address(gov);
    }

    function _configureTimelock(AidoTimelockTemplate tl, address _governor, address _initialOwner) internal {
        tl.grantRole(tl.PROPOSER_ROLE(), _governor);
        tl.grantRole(tl.CANCELLER_ROLE(), _governor);
        tl.grantRole(tl.EXECUTOR_ROLE(), address(0)); // open executor

        if (_initialOwner != address(0)) {
            tl.grantRole(tl.DEFAULT_ADMIN_ROLE(), _initialOwner);
        }
        tl.revokeRole(tl.DEFAULT_ADMIN_ROLE(), address(this));
    }
}
