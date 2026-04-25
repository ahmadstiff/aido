// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {AidoToken} from "../src/AidoToken.sol";

contract MintAidoScript is Script {
    AidoToken constant TOKEN = AidoToken(0x8a2CF47167EBC346d88B29c69d6C384945B3f63f);

    function run() public {
        // ── Configure recipient and amount here ──
        address recipient = 0x0000000000000000000000000000000000000001; // <-- ganti address tujuan
        uint256 amount = 100_000 ether; // 100,000 AIDO

        vm.startBroadcast();
        TOKEN.mint(recipient, amount);
        console.log("Minted", amount / 1 ether, "AIDO to", recipient);
        vm.stopBroadcast();
    }
}
