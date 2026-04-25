// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test, console} from "forge-std/Test.sol";
import {AidoToken} from "../src/AidoToken.sol";
import {AidoGovernor} from "../src/AidoGovernor.sol";
import {MonadVoterRegistry} from "../src/MonadVoterRegistry.sol";
import {IGovernor} from "@openzeppelin/contracts/governance/IGovernor.sol";
import {IVotes} from "@openzeppelin/contracts/governance/utils/IVotes.sol";

contract AidoTest is Test {
    AidoToken public token;
    AidoGovernor public governor;
    MonadVoterRegistry public registry;

    address public deployer = address(1);
    address public user = address(2);
    address public agent = address(3);
    address public stranger = address(4);

    uint256 constant INITIAL_SUPPLY = 1_000_000 ether;

    function setUp() public {
        vm.startPrank(deployer);

        token = new AidoToken(INITIAL_SUPPLY);
        governor = new AidoGovernor(IVotes(address(token)));
        registry = new MonadVoterRegistry(address(governor));

        // Deployer self-delegates
        token.delegate(deployer);

        // Give user some tokens
        token.transfer(user, 100_000 ether);

        vm.stopPrank();

        // User self-delegates to activate voting power
        vm.prank(user);
        token.delegate(user);
    }

    // ════════════════════════════════════════════
    // AidoToken Tests
    // ════════════════════════════════════════════

    function test_TokenName() public view {
        assertEq(token.name(), "AIDO Governance");
        assertEq(token.symbol(), "AIDO");
    }

    function test_InitialSupply() public view {
        assertEq(token.totalSupply(), INITIAL_SUPPLY);
    }

    function test_DeployerBalance() public view {
        assertEq(token.balanceOf(deployer), INITIAL_SUPPLY - 100_000 ether);
    }

    function test_VotingPowerAfterDelegate() public view {
        // Need to roll 1 block for checkpoint to be queryable
        assertGt(token.getVotes(user), 0);
    }

    function test_DelegateToAgent() public {
        vm.prank(user);
        token.delegate(agent);

        // After delegation, agent should have user's voting power
        assertEq(token.getVotes(agent), 100_000 ether);
        assertEq(token.getVotes(user), 0);
    }

    // ════════════════════════════════════════════
    // AidoGovernor Tests
    // ════════════════════════════════════════════

    function test_GovernorSettings() public view {
        assertEq(governor.votingDelay(), 1);
        assertEq(governor.votingPeriod(), 50);
        assertEq(governor.proposalThreshold(), 0);
    }

    function test_GovernorName() public view {
        assertEq(governor.name(), "AidoGovernor");
    }

    function test_ProposeAndVote() public {
        // Create a dummy proposal
        address[] memory targets = new address[](1);
        targets[0] = address(0);
        uint256[] memory values = new uint256[](1);
        values[0] = 0;
        bytes[] memory calldatas = new bytes[](1);
        calldatas[0] = "";

        vm.prank(deployer);
        uint256 proposalId = governor.propose(targets, values, calldatas, "Test proposal: transfer 100 MON");

        // Roll past voting delay
        vm.roll(block.number + 2);

        // Deployer votes FOR
        vm.prank(deployer);
        governor.castVote(proposalId, 1); // 1 = For

        // Check vote was recorded
        assertTrue(governor.hasVoted(proposalId, deployer));
    }

    // ════════════════════════════════════════════
    // MonadVoterRegistry Tests
    // ════════════════════════════════════════════

    function test_SetConfig() public {
        vm.prank(user);
        registry.setConfig(MonadVoterRegistry.RiskProfile.CONSERVATIVE, true, agent);

        MonadVoterRegistry.UserConfig memory config = registry.getUserConfig(user);
        assertEq(uint8(config.riskProfile), uint8(MonadVoterRegistry.RiskProfile.CONSERVATIVE));
        assertTrue(config.isAutoPilot);
        assertEq(config.delegatedAgent, agent);
    }

    function test_SetConfigRegistersUser() public {
        assertFalse(registry.isUserRegistered(user));

        vm.prank(user);
        registry.setConfig(MonadVoterRegistry.RiskProfile.NEUTRAL, false, address(0));

        assertTrue(registry.isUserRegistered(user));
        assertEq(registry.getRegisteredUsersCount(), 1);
    }

    function test_SetConfigEmitsEvent() public {
        vm.expectEmit(true, false, false, true);
        emit MonadVoterRegistry.ConfigUpdated(user, MonadVoterRegistry.RiskProfile.AGGRESSIVE, true, agent);

        vm.prank(user);
        registry.setConfig(MonadVoterRegistry.RiskProfile.AGGRESSIVE, true, agent);
    }

    function test_RevertUnauthorizedAgent() public {
        // User sets agent
        vm.prank(user);
        registry.setConfig(MonadVoterRegistry.RiskProfile.NEUTRAL, true, agent);

        // Stranger tries to vote — should revert
        vm.prank(stranger);
        vm.expectRevert(MonadVoterRegistry.NotAuthorizedAgent.selector);
        registry.recordAgentVote(user, 1, 1, "test reason");
    }

    function test_RevertAutoPilotDisabled() public {
        // User sets agent but disables auto-pilot
        vm.prank(user);
        registry.setConfig(MonadVoterRegistry.RiskProfile.NEUTRAL, false, agent);

        // Agent tries to vote — should revert because auto-pilot is off
        vm.prank(agent);
        vm.expectRevert(MonadVoterRegistry.AutoPilotDisabled.selector);
        registry.recordAgentVote(user, 1, 1, "test reason");
    }

    function test_RegistryRevertZeroGovernor() public {
        vm.expectRevert(MonadVoterRegistry.ZeroAddress.selector);
        new MonadVoterRegistry(address(0));
    }

    // ════════════════════════════════════════════
    // Integration: Full Flow
    // ════════════════════════════════════════════

    function test_FullFlow_AgentVotesOnBehalf() public {
        // 1. User delegates token voting power to agent
        vm.prank(user);
        token.delegate(agent);

        // 2. User configures registry: auto-pilot ON, agent set
        vm.prank(user);
        registry.setConfig(MonadVoterRegistry.RiskProfile.CONSERVATIVE, true, agent);

        // 3. Deployer creates a proposal
        address[] memory targets = new address[](1);
        targets[0] = address(0);
        uint256[] memory values = new uint256[](1);
        values[0] = 0;
        bytes[] memory calldatas = new bytes[](1);
        calldatas[0] = "";

        vm.prank(deployer);
        uint256 proposalId = governor.propose(targets, values, calldatas, "Proposal: Allocate 50k MON to marketing");

        // 4. Roll past voting delay
        vm.roll(block.number + 2);

        // 5. Agent calls recordAgentVote — this should cast vote on Governor
        vm.prank(agent);
        registry.recordAgentVote(
            user,
            proposalId,
            1, // FOR
            "AI Analysis: Proposal aligns with conservative risk profile. Marketing spend is within budget."
        );

        // 6. Verify vote was recorded on Governor
        //    Note: the vote is recorded under the registry's address since registry calls governor
        assertTrue(governor.hasVoted(proposalId, address(registry)));
    }
}
