// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {ERC20Permit} from "@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol";
import {ERC20Votes} from "@openzeppelin/contracts/token/ERC20/extensions/ERC20Votes.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Nonces} from "@openzeppelin/contracts/utils/Nonces.sol";

/// @title AidoToken
/// @notice ERC20 governance token with voting power for AIDO DAO.
///         Users must delegate to themselves (or an agent) to activate voting power.
///         Owner can mint. Anyone can claim via faucet (once per address, 10k AIDO).
contract AidoToken is ERC20, ERC20Permit, ERC20Votes, Ownable {
    uint256 public constant FAUCET_AMOUNT = 10_000 ether;
    mapping(address => bool) public hasClaimed;

    constructor(uint256 initialSupply)
        ERC20("AIDO Governance", "AIDO")
        ERC20Permit("AIDO Governance")
        Ownable(msg.sender)
    {
        _mint(msg.sender, initialSupply);
    }

    // ──── Mint (owner only) ────

    /// @notice Owner can mint tokens to any address.
    function mint(address to, uint256 amount) external onlyOwner {
        _mint(to, amount);
    }

    // ──── Faucet (public, once per address) ────

    /// @notice Anyone can claim 10,000 AIDO once.
    function faucet() external {
        require(!hasClaimed[msg.sender], "Already claimed");
        hasClaimed[msg.sender] = true;
        _mint(msg.sender, FAUCET_AMOUNT);
    }

    // ──── Required Overrides ────

    function _update(address from, address to, uint256 value) internal override(ERC20, ERC20Votes) {
        super._update(from, to, value);
    }

    function nonces(address owner_) public view override(ERC20Permit, Nonces) returns (uint256) {
        return super.nonces(owner_);
    }
}
