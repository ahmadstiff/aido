// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ConfigModule} from "./ConfigModule.sol";

/// @title TreasuryModule
contract TreasuryModule is ConfigModule {
    constructor(address _owner) ConfigModule(_owner) {}
}

/// @title RiskModule
contract RiskModule is ConfigModule {
    constructor(address _owner) ConfigModule(_owner) {}
}

/// @title GovernanceModule
contract GovernanceModule is ConfigModule {
    constructor(address _owner) ConfigModule(_owner) {}
}

/// @title OperationsModule
contract OperationsModule is ConfigModule {
    constructor(address _owner) ConfigModule(_owner) {}
}

/// @title EmissionsModule
contract EmissionsModule is ConfigModule {
    constructor(address _owner) ConfigModule(_owner) {}
}

/// @title GrowthModule
contract GrowthModule is ConfigModule {
    constructor(address _owner) ConfigModule(_owner) {}
}

/// @title PartnershipsModule
contract PartnershipsModule is ConfigModule {
    constructor(address _owner) ConfigModule(_owner) {}
}
