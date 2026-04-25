// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {IVotes} from "@openzeppelin/contracts/governance/utils/IVotes.sol";

import {AidoToken} from "../src/AidoToken.sol";
import {AidoDaoRegistry} from "../src/AidoDaoRegistry.sol";
import {AidoDaoFactory} from "../src/AidoDaoFactory.sol";
import {TreasuryModule, RiskModule, GovernanceModule, OperationsModule, EmissionsModule, GrowthModule, PartnershipsModule} from "../src/modules/SeedModules.sol";

contract DeployScript is Script {
    function run() public {
        vm.startBroadcast();

        // ──── 1. Deploy governance token ────
        AidoToken token = new AidoToken(1_000_000 ether);
        console.log("AidoToken deployed at:", address(token));

        // ──── 2. Deploy DAO Registry ────
        AidoDaoRegistry registry = new AidoDaoRegistry();
        console.log("AidoDaoRegistry deployed at:", address(registry));

        // ──── 3. Deploy DAO Factory ────
        AidoDaoFactory factory = new AidoDaoFactory(address(registry));
        console.log("AidoDaoFactory deployed at:", address(factory));

        // ──── 4. Authorize factory as registrar ────
        registry.setRegistrar(address(factory), true);
        console.log("Factory authorized as registrar");

        // ──── 5. Create the first demo DAO via factory ────
        (address governor, address timelock) = factory.createDao(
            "AIDO Demo DAO",        // name
            address(token),          // token
            1,                       // votingDelay (1 block)
            50,                      // votingPeriod (50 blocks ~50s on Monad)
            0,                       // proposalThreshold
            4,                       // quorumNumerator (4%)
            msg.sender,              // initialOwner
            ""                       // metadataURI
        );
        console.log("Governor deployed at:", governor);
        console.log("Timelock deployed at:", timelock);

        // ──── 6. Deploy seed target modules (owned by timelock) ────
        TreasuryModule treasury = new TreasuryModule(timelock);
        console.log("TreasuryModule deployed at:", address(treasury));

        RiskModule risk = new RiskModule(timelock);
        console.log("RiskModule deployed at:", address(risk));

        GovernanceModule governance = new GovernanceModule(timelock);
        console.log("GovernanceModule deployed at:", address(governance));

        OperationsModule operations = new OperationsModule(timelock);
        console.log("OperationsModule deployed at:", address(operations));

        EmissionsModule emissions = new EmissionsModule(timelock);
        console.log("EmissionsModule deployed at:", address(emissions));

        GrowthModule growth = new GrowthModule(timelock);
        console.log("GrowthModule deployed at:", address(growth));

        PartnershipsModule partnerships = new PartnershipsModule(timelock);
        console.log("PartnershipsModule deployed at:", address(partnerships));

        // ──── 7. Deployer self-delegates to activate voting power ────
        token.delegate(msg.sender);
        console.log("Deployer self-delegated voting power");

        vm.stopBroadcast();
    }
}
