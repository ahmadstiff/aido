// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/// @title AidoDaoRegistry
/// @notice On-chain catalogue of AIDO DAOs. Only the factory or admin can register
///         new DAOs. Frontend, backend, and indexer use this as the source of truth.
contract AidoDaoRegistry is Ownable {
    // ──── Types ────

    struct DaoInfo {
        bool exists;
        address governor;
        address timelock;
        address token;
        address creator;
        string name;
        string metadataURI;
        uint64 createdAt;
    }

    // ──── State ────

    mapping(address governor => DaoInfo) private _daos;
    address[] private _daoList;
    mapping(address => bool) public authorizedRegistrars;

    // ──── Events ────

    event DaoRegistered(
        address indexed governor,
        address indexed creator,
        address token,
        string name,
        string metadataURI
    );

    event MetadataUpdated(address indexed governor, string metadataURI);
    event RegistrarUpdated(address indexed registrar, bool authorized);

    // ──── Errors ────

    error NotAuthorized();
    error DaoAlreadyRegistered();
    error DaoNotFound();
    error ZeroAddress();

    // ──── Modifiers ────

    modifier onlyRegistrar() {
        if (!authorizedRegistrars[msg.sender] && msg.sender != owner()) revert NotAuthorized();
        _;
    }

    // ──── Constructor ────

    constructor() Ownable(msg.sender) {}

    // ──── Admin ────

    /// @notice Authorize or revoke a registrar (typically the factory).
    function setRegistrar(address registrar, bool authorized) external onlyOwner {
        if (registrar == address(0)) revert ZeroAddress();
        authorizedRegistrars[registrar] = authorized;
        emit RegistrarUpdated(registrar, authorized);
    }

    // ──── Registration ────

    /// @notice Register a new DAO. Only callable by factory or admin.
    function registerDao(
        address governor,
        address timelock,
        address token,
        address creator,
        string calldata name,
        string calldata metadataURI
    ) external onlyRegistrar {
        if (governor == address(0)) revert ZeroAddress();
        if (_daos[governor].exists) revert DaoAlreadyRegistered();

        _daos[governor] = DaoInfo({
            exists: true,
            governor: governor,
            timelock: timelock,
            token: token,
            creator: creator,
            name: name,
            metadataURI: metadataURI,
            createdAt: uint64(block.timestamp)
        });

        _daoList.push(governor);

        emit DaoRegistered(governor, creator, token, name, metadataURI);
    }

    // ──── Metadata ────

    /// @notice Update DAO metadata. Only creator, DAO owner, or admin.
    function updateMetadata(address governor, string calldata metadataURI) external {
        DaoInfo storage dao = _daos[governor];
        if (!dao.exists) revert DaoNotFound();
        if (msg.sender != dao.creator && msg.sender != owner()) revert NotAuthorized();

        dao.metadataURI = metadataURI;
        emit MetadataUpdated(governor, metadataURI);
    }

    // ──── View ────

    function isRegisteredDao(address governor) external view returns (bool) {
        return _daos[governor].exists;
    }

    function getDao(address governor) external view returns (DaoInfo memory) {
        if (!_daos[governor].exists) revert DaoNotFound();
        return _daos[governor];
    }

    /// @notice Paginated list of DAO governors.
    function listDaos(uint256 offset, uint256 limit) external view returns (address[] memory governors) {
        uint256 total = _daoList.length;
        if (offset >= total) return new address[](0);

        uint256 end = offset + limit;
        if (end > total) end = total;
        uint256 count = end - offset;

        governors = new address[](count);
        for (uint256 i = 0; i < count; i++) {
            governors[i] = _daoList[offset + i];
        }
    }

    function daoCount() external view returns (uint256) {
        return _daoList.length;
    }
}
