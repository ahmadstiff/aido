// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {AidoToken} from "../src/AidoToken.sol";
import {AidoGovernor} from "../src/AidoGovernor.sol";
import {MonadVoterRegistry} from "../src/MonadVoterRegistry.sol";
import {IVotes} from "@openzeppelin/contracts/governance/utils/IVotes.sol";

contract DeployScript is Script {
    function run() public {
        vm.startBroadcast();

        // 1. Deploy governance token — 1 million AIDO (18 decimals)
        AidoToken token = new AidoToken(1_000_000 ether);
        console.log("AidoToken deployed at:", address(token));

        // 2. Deploy Governor
        AidoGovernor governor = new AidoGovernor(IVotes(address(token)));
        console.log("AidoGovernor deployed at:", address(governor));

        // 3. Deploy MonadVoter Registry
        MonadVoterRegistry registry = new MonadVoterRegistry(address(governor));
        console.log("MonadVoterRegistry deployed at:", address(registry));

        // 4. Deployer self-delegates to activate voting power
        token.delegate(msg.sender);
        console.log("Deployer self-delegated voting power");

        vm.stopBroadcast();
    }
}
