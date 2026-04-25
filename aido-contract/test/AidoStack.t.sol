// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test, console} from "forge-std/Test.sol";
import {IVotes} from "@openzeppelin/contracts/governance/utils/IVotes.sol";
import {IGovernor} from "@openzeppelin/contracts/governance/IGovernor.sol";
import {TimelockController} from "@openzeppelin/contracts/governance/TimelockController.sol";

import {AidoToken} from "../src/AidoToken.sol";
import {AidoDaoRegistry} from "../src/AidoDaoRegistry.sol";
import {AidoDaoFactory} from "../src/AidoDaoFactory.sol";
import {AidoGovernorTemplate} from "../src/AidoGovernorTemplate.sol";
import {AidoTimelockTemplate} from "../src/AidoTimelockTemplate.sol";
import {TreasuryModule, RiskModule} from "../src/modules/SeedModules.sol";

contract AidoStackTest is Test {
    AidoToken public token;
    AidoDaoRegistry public registry;
    AidoDaoFactory public factory;

    address public deployer = address(1);
    address public user = address(2);
    address public stranger = address(3);

    uint256 constant INITIAL_SUPPLY = 1_000_000 ether;

    // DAO outputs
    address public governor;
    address public timelock;

    function setUp() public {
        vm.startPrank(deployer);

        token = new AidoToken(INITIAL_SUPPLY);
        registry = new AidoDaoRegistry();
        factory = new AidoDaoFactory(address(registry));
        registry.setRegistrar(address(factory), true);

        // Create a demo DAO
        (governor, timelock) = factory.createDao(
            "Test DAO",
            address(token),
            1,    // votingDelay
            50,   // votingPeriod
            0,    // proposalThreshold
            4,    // quorum 4%
            deployer,
            "ipfs://test-metadata"
        );

        // Self-delegate + give user tokens
        token.delegate(deployer);
        token.transfer(user, 100_000 ether);

        vm.stopPrank();

        vm.prank(user);
        token.delegate(user);
    }

    // ════════════════════════════════════════════
    // Registry Tests
    // ════════════════════════════════════════════

    function test_DaoIsRegistered() public view {
        assertTrue(registry.isRegisteredDao(governor));
    }

    function test_GetDaoInfo() public view {
        AidoDaoRegistry.DaoInfo memory info = registry.getDao(governor);
        assertTrue(info.exists);
        assertEq(info.governor, governor);
        assertEq(info.timelock, timelock);
        assertEq(info.token, address(token));
        assertEq(info.creator, deployer);
        assertEq(info.name, "Test DAO");
        assertEq(info.metadataURI, "ipfs://test-metadata");
    }

    function test_DaoCount() public view {
        assertEq(registry.daoCount(), 1);
    }

    function test_ListDaos() public view {
        address[] memory list = registry.listDaos(0, 10);
        assertEq(list.length, 1);
        assertEq(list[0], governor);
    }

    function test_UpdateMetadata() public {
        vm.prank(deployer); // deployer is the creator
        registry.updateMetadata(governor, "ipfs://new-metadata");

        AidoDaoRegistry.DaoInfo memory info = registry.getDao(governor);
        assertEq(info.metadataURI, "ipfs://new-metadata");
    }

    function test_RevertUpdateMetadataUnauthorized() public {
        vm.prank(stranger);
        vm.expectRevert(AidoDaoRegistry.NotAuthorized.selector);
        registry.updateMetadata(governor, "ipfs://hacked");
    }

    function test_RevertRegisterUnauthorized() public {
        vm.prank(stranger);
        vm.expectRevert(AidoDaoRegistry.NotAuthorized.selector);
        registry.registerDao(address(0x999), address(0), address(0), stranger, "x", "");
    }

    function test_RevertDuplicateRegister() public {
        vm.prank(deployer);
        vm.expectRevert(AidoDaoRegistry.DaoAlreadyRegistered.selector);
        registry.registerDao(governor, timelock, address(token), deployer, "x", "");
    }

    // ════════════════════════════════════════════
    // Factory Tests
    // ════════════════════════════════════════════

    function test_FactoryCreatesValidDao() public view {
        assertTrue(governor != address(0));
        assertTrue(timelock != address(0));
        assertTrue(governor != timelock);
    }

    function test_FactoryRevertZeroToken() public {
        vm.prank(deployer);
        vm.expectRevert(AidoDaoFactory.ZeroAddress.selector);
        factory.createDao("Bad", address(0), 1, 50, 0, 4, deployer, "");
    }

    function test_FactoryRevertZeroQuorum() public {
        vm.prank(deployer);
        vm.expectRevert(AidoDaoFactory.InvalidQuorum.selector);
        factory.createDao("Bad", address(token), 1, 50, 0, 0, deployer, "");
    }

    function test_FactoryRevertWhenPaused() public {
        vm.prank(deployer);
        factory.pauseFactory(true);

        vm.prank(user);
        vm.expectRevert(AidoDaoFactory.FactoryPaused.selector);
        factory.createDao("Bad", address(token), 1, 50, 0, 4, deployer, "");
    }

    function test_MultipleDAOs() public {
        vm.prank(user);
        (address gov2,) = factory.createDao("DAO 2", address(token), 1, 100, 0, 10, user, "");
        assertTrue(registry.isRegisteredDao(gov2));
        assertEq(registry.daoCount(), 2);
    }

    // ════════════════════════════════════════════
    // Governor Template Tests
    // ════════════════════════════════════════════

    function test_GovernorSettings() public view {
        AidoGovernorTemplate gov = AidoGovernorTemplate(payable(governor));
        assertEq(gov.votingDelay(), 1);
        assertEq(gov.votingPeriod(), 50);
        assertEq(gov.proposalThreshold(), 0);
        assertEq(gov.name(), "Test DAO");
    }

    function test_GovernorTimelockConnected() public view {
        AidoGovernorTemplate gov = AidoGovernorTemplate(payable(governor));
        assertEq(gov.timelock(), timelock);
    }

    function test_ProposeAndVote() public {
        AidoGovernorTemplate gov = AidoGovernorTemplate(payable(governor));

        address[] memory targets = new address[](1);
        targets[0] = address(0);
        uint256[] memory values = new uint256[](1);
        bytes[] memory calldatas = new bytes[](1);
        calldatas[0] = "";

        vm.prank(deployer);
        uint256 proposalId = gov.propose(targets, values, calldatas, "Test proposal");

        // Roll past voting delay
        vm.roll(block.number + 2);

        // Vote
        vm.prank(deployer);
        gov.castVote(proposalId, 1); // FOR

        assertTrue(gov.hasVoted(proposalId, deployer));
    }

    function test_CastVoteWithReason() public {
        AidoGovernorTemplate gov = AidoGovernorTemplate(payable(governor));

        address[] memory targets = new address[](1);
        targets[0] = address(0);
        uint256[] memory values = new uint256[](1);
        bytes[] memory calldatas = new bytes[](1);
        calldatas[0] = "";

        vm.prank(deployer);
        uint256 proposalId = gov.propose(targets, values, calldatas, "Test with reason");

        vm.roll(block.number + 2);

        vm.prank(deployer);
        gov.castVoteWithReason(proposalId, 1, "AI analysis: looks good");

        assertTrue(gov.hasVoted(proposalId, deployer));
    }

    // ════════════════════════════════════════════
    // Config Module Tests
    // ════════════════════════════════════════════

    function test_ConfigModuleSetUint() public {
        TreasuryModule treasury = new TreasuryModule(deployer);

        vm.prank(deployer);
        treasury.setUint(keccak256("BUDGET"), 1000);

        assertEq(treasury.uintValues(keccak256("BUDGET")), 1000);
    }

    function test_ConfigModuleSetBool() public {
        RiskModule risk = new RiskModule(deployer);

        vm.prank(deployer);
        risk.setBool(keccak256("ENABLED"), true);

        assertTrue(risk.boolValues(keccak256("ENABLED")));
    }

    function test_ConfigModuleSetString() public {
        TreasuryModule treasury = new TreasuryModule(deployer);

        vm.prank(deployer);
        treasury.setString(keccak256("LABEL"), "test-label");

        assertEq(treasury.stringValues(keccak256("LABEL")), "test-label");
    }

    function test_ConfigModuleSetAddress() public {
        TreasuryModule treasury = new TreasuryModule(deployer);

        vm.prank(deployer);
        treasury.setAddress(keccak256("RECIPIENT"), user);

        assertEq(treasury.addressValues(keccak256("RECIPIENT")), user);
    }

    function test_ConfigModuleRevertUnauthorized() public {
        TreasuryModule treasury = new TreasuryModule(deployer);

        vm.prank(stranger);
        vm.expectRevert();
        treasury.setUint(keccak256("BUDGET"), 999);
    }

    // ════════════════════════════════════════════
    // Integration: Full Governance Flow
    // ════════════════════════════════════════════

    function test_FullGovernanceFlow() public {
        AidoGovernorTemplate gov = AidoGovernorTemplate(payable(governor));

        // Deploy a module owned by the timelock
        TreasuryModule treasury = new TreasuryModule(timelock);

        // Create proposal to set a value on treasury module
        address[] memory targets = new address[](1);
        targets[0] = address(treasury);
        uint256[] memory values = new uint256[](1);
        bytes[] memory calldatas = new bytes[](1);
        calldatas[0] = abi.encodeWithSignature(
            "setUint(bytes32,uint256)",
            keccak256("BUDGET"),
            50000
        );

        vm.prank(deployer);
        uint256 proposalId = gov.propose(targets, values, calldatas, "Set budget to 50k");

        // Roll past voting delay
        vm.roll(block.number + 2);

        // Both deployer and user vote FOR
        vm.prank(deployer);
        gov.castVote(proposalId, 1);

        vm.prank(user);
        gov.castVote(proposalId, 1);

        // Roll past voting period
        vm.roll(block.number + 51);

        // Queue the proposal
        bytes32 descHash = keccak256(bytes("Set budget to 50k"));
        vm.prank(deployer);
        gov.queue(targets, values, calldatas, descHash);

        // Warp past timelock delay
        vm.warp(block.timestamp + 2);

        // Execute
        vm.prank(deployer);
        gov.execute(targets, values, calldatas, descHash);

        // Verify the treasury module value was set
        assertEq(treasury.uintValues(keccak256("BUDGET")), 50000);
    }
}
