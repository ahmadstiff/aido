// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IGovernor} from "@openzeppelin/contracts/governance/IGovernor.sol";

/// @title MonadVoterRegistry
/// @notice Stores user governance preferences and orchestrates AI agent voting
///         through the AidoGovernor contract.
contract MonadVoterRegistry {
    // ──── Types ────

    enum RiskProfile {
        CONSERVATIVE,
        NEUTRAL,
        AGGRESSIVE
    }

    struct UserConfig {
        RiskProfile riskProfile;
        bool isAutoPilot;
        address delegatedAgent; // executor bot address
    }

    // ──── State ────

    IGovernor public immutable governor;
    mapping(address => UserConfig) public userConfigs;
    address[] public registeredUsers;
    mapping(address => bool) private _isRegistered;

    // ──── Events ────

    event ConfigUpdated(address indexed user, RiskProfile risk, bool autoPilot, address agent);
    event VoteExecutedByAgent(address indexed user, uint256 indexed proposalId, uint8 support, string reason);

    // ──── Errors ────

    error NotAuthorizedAgent();
    error AutoPilotDisabled();
    error ZeroAddress();

    // ──── Constructor ────

    constructor(address _governor) {
        if (_governor == address(0)) revert ZeroAddress();
        governor = IGovernor(_governor);
    }

    // ──── User Functions ────

    /// @notice Set governance preferences and delegate agent
    /// @param _risk      Risk tolerance profile
    /// @param _autoPilot Whether the AI agent can vote autonomously
    /// @param _agent     Address of the delegated AI agent (can be address(0) for manual-only)
    function setConfig(RiskProfile _risk, bool _autoPilot, address _agent) external {
        userConfigs[msg.sender] = UserConfig(_risk, _autoPilot, _agent);

        if (!_isRegistered[msg.sender]) {
            registeredUsers.push(msg.sender);
            _isRegistered[msg.sender] = true;
        }

        emit ConfigUpdated(msg.sender, _risk, _autoPilot, _agent);
    }

    // ──── Agent Functions ────

    /// @notice Called by the delegated AI agent to cast a vote on behalf of a user.
    ///         The user must have delegated their token voting power to this agent address
    ///         via AidoToken.delegate(agent) AND enabled Auto-Pilot in this registry.
    /// @param _user       The user on whose behalf the agent votes
    /// @param _proposalId Governor proposal ID
    /// @param _support    0 = Against, 1 = For, 2 = Abstain
    /// @param _reason     AI-generated reasoning for the vote
    function recordAgentVote(
        address _user,
        uint256 _proposalId,
        uint8 _support,
        string calldata _reason
    ) external {
        UserConfig storage config = userConfigs[_user];

        if (msg.sender != config.delegatedAgent) revert NotAuthorizedAgent();
        if (!config.isAutoPilot) revert AutoPilotDisabled();

        // Agent casts the vote directly on Governor.
        // This works because the user delegated their token voting power
        // to the agent address via AidoToken.delegate(agent).
        governor.castVoteWithReason(_proposalId, _support, _reason);

        emit VoteExecutedByAgent(_user, _proposalId, _support, _reason);
    }

    // ──── View Functions ────

    function getUserConfig(address _user) external view returns (UserConfig memory) {
        return userConfigs[_user];
    }

    function getRegisteredUsersCount() external view returns (uint256) {
        return registeredUsers.length;
    }

    function isUserRegistered(address _user) external view returns (bool) {
        return _isRegistered[_user];
    }
}
