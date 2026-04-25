// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {AidoToken} from "../src/AidoToken.sol";

contract TransferAidoScript is Script {
    AidoToken constant TOKEN = AidoToken(0x8a2CF47167EBC346d88B29c69d6C384945B3f63f);

    function run() public {
        // ── Configure recipients and amounts here ──
        address[] memory recipients = new address[](2);
        uint256[] memory amounts = new uint256[](2);

        // Recipient 1
        recipients[0] = 0x0000000000000000000000000000000000000001; // <-- ganti address teman 1
        amounts[0]    = 50_000 ether; // 50,000 AIDO

        // Recipient 2
        recipients[1] = 0x0000000000000000000000000000000000000002; // <-- ganti address teman 2
        amounts[1]    = 50_000 ether; // 50,000 AIDO

        // ── Execute transfers ──
        vm.startBroadcast();

        for (uint256 i = 0; i < recipients.length; i++) {
            TOKEN.transfer(recipients[i], amounts[i]);
            console.log("Sent", amounts[i] / 1 ether, "AIDO to", recipients[i]);
        }

        console.log("Done! Remaining balance:", TOKEN.balanceOf(msg.sender) / 1 ether, "AIDO");

        vm.stopBroadcast();
    }
}
