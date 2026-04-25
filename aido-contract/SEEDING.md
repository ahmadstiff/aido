# Seeding 30 DAO Proposals on Monad Testnet

This document explains how to use the 30-proposal governance seed pack for the AIDO demo DAO on Monad testnet.

Provided seed files:

- [seeds/monad-testnet-30-proposals.json](/Users/danuste/Desktop/hackaton/monad/aido/aido-contract/seeds/monad-testnet-30-proposals.json:1)
- [seeds/monad-testnet-demo-addresses.json](/Users/danuste/Desktop/hackaton/monad/aido/aido-contract/seeds/monad-testnet-demo-addresses.json:1)

## Goal

The seed pack is designed to help you:

1. create 30 onchain demo proposals,
2. emit 30 `ProposalCreated` events for the indexer,
3. populate the backend with enough proposal volume for AI analysis,
4. and demonstrate an end-to-end governance flow on Monad testnet.

## Assumptions

The seed pack assumes:

1. a DAO has already been created through `AidoDaoFactory`, or a compatible governor address already exists,
2. the governor supports the following proposal shape:

```solidity
function propose(
    address[] memory targets,
    uint256[] memory values,
    string[] memory signatures,
    bytes[] memory calldatas,
    string memory description
) external returns (uint256 proposalId);
```

3. proposal targets are generic config modules such as:

```solidity
function setUint(bytes32 key, uint256 value) external;
function setBool(bytes32 key, bool value) external;
function setString(bytes32 key, string calldata value) external;
function setAddress(bytes32 key, address value) external;
```

4. the target modules used by proposals are already owned by the `Timelock`, or otherwise only accept governance-controlled calls.

If your final governor uses the OpenZeppelin-style proposal function:

```solidity
function propose(
    address[] memory targets,
    uint256[] memory values,
    bytes[] memory calldatas,
    string memory description
) external returns (uint256 proposalId);
```

you can still use this seed file. The seeder only needs to:

- ignore the `signatures` array,
- ABI encode each `arguments[i]` into `calldatas[i]`,
- and call the OpenZeppelin-style `propose(...)`.

Important compatibility note:

- the current indexer in this repo assumes a Governor Bravo-compatible `ProposalCreated` event shape,
- so if your final governor emits a different event shape, the indexer ABI must be updated as well.

## Required Addresses

Before running the seed, you need:

- `DAO_GOVERNOR_ADDRESS`
- `TREASURY_MODULE_ADDRESS`
- `RISK_MODULE_ADDRESS`
- `GOVERNANCE_MODULE_ADDRESS`
- `OPERATIONS_MODULE_ADDRESS`
- `EMISSIONS_MODULE_ADDRESS`
- `GROWTH_MODULE_ADDRESS`
- `PARTNERSHIPS_MODULE_ADDRESS`

All target placeholders in the seed file use the `$ENV_NAME` format.

## Ready-to-Use Demo Addresses

These are the Monad testnet addresses already provided for the demo environment:

```bash
DAO_GOVERNOR_ADDRESS=0xd0b2617883e9d925bc581F95cF2d806b8155Dd0f
DAO_TIMELOCK_ADDRESS=0x8Acb8aC5A12C2ceaE8Da17Df361E24a7fC3988cD
AIDO_TOKEN_ADDRESS=0x32Dfb6F14949d4CdAf4f225D8ad9E02dEdC08545
AIDO_DAO_REGISTRY_ADDRESS=0x134b005958e7505fECe7aC1AC11d0078C6A17246
AIDO_DAO_FACTORY_ADDRESS=0xC37Ee98C30Dca390652a358eE435d21580172382
TREASURY_MODULE_ADDRESS=0x8c89795c67174c3B795B2fc9f68126A0638FBb75
RISK_MODULE_ADDRESS=0xAc3b77F4592803ADEEB10B6DF94186A467601dc8
GOVERNANCE_MODULE_ADDRESS=0x2580c857E60966969b5d94c08F26B78aedB969B1
OPERATIONS_MODULE_ADDRESS=0xc2a0A6262fe19B9419C843a181bfEf39CA3b0148
EMISSIONS_MODULE_ADDRESS=0x4797D2559F26d5908d037B5D28223F1934a42297
GROWTH_MODULE_ADDRESS=0xC869D41d096C2bAAf00011273ce3C5722a3c9286
PARTNERSHIPS_MODULE_ADDRESS=0x4033f7aF5Cc67d1Bf7A83340C71B280845ee4339
```

These addresses can be used directly to resolve the placeholders in the proposal seed file.

## Seed File Format

Each proposal entry uses the following fields:

- `proposalNumber`
- `seedKey`
- `title`
- `category`
- `description`
- `targets`
- `values`
- `signatures`
- `arguments`

Execution field meanings:

- `targets[i]`
  The target contract address for action `i`, usually a placeholder such as `$TREASURY_MODULE_ADDRESS`
- `values[i]`
  The native token amount sent with action `i`, usually `0`
- `signatures[i]`
  The function signature for action `i`
- `arguments[i]`
  The typed argument list that must be ABI encoded into `calldatas[i]`

Argument encoding rules used by this seed pack:

- `bytes32` values are stored as human-readable ASCII keys such as `MARKETING_BUDGET_Q2`
- the seeder should convert those to `bytes32` using `stringToBytes32` / `formatBytes32String`, unless the value already starts with `0x` and is a full 32-byte hex string
- numeric values are stored as strings to avoid JSON precision loss
- booleans are stored as native JSON booleans

Example action:

```json
{
  "targets": ["$TREASURY_MODULE_ADDRESS"],
  "values": ["0"],
  "signatures": ["setUint(bytes32,uint256)"],
  "arguments": [
    [
      {
        "type": "bytes32",
        "value": "MARKETING_BUDGET_Q2",
        "encoding": "stringToBytes32"
      },
      {
        "type": "uint256",
        "value": "25000000000000000000000"
      }
    ]
  ]
}
```

## How to Execute the Seed

Recommended execution order:

1. deploy the DAO stack on Monad testnet,
2. deploy the target modules used by the seed proposals,
3. fill all required environment variables,
4. load the JSON seed file,
5. for each proposal:
   - resolve placeholder targets,
   - ABI encode each `arguments[i]` into `calldatas[i]`,
   - submit `propose(...)` to the governor,
6. wait for the `ProposalCreated` event for each submission,
7. run the AIDO indexer so the backend ingests all proposals.

With the current demo deployment, the environment is already close to ready:

- the governor exists,
- the timelock exists,
- and all seed target module addresses are already available.

## Important Notes

- The seed file does not contain `proposalId` values because `proposalId` is generated onchain by the governor when `propose(...)` succeeds.
- Every proposal description is written in English so the backend AI can analyze them directly without translation.
- All proposals use safe demo governance actions based on generic config setter modules.
- If you want a zero-risk demo environment, those modules can be implemented as governance-owned config stores that only persist values and emit events.

## Suggested Verification

After the seed is complete, verify:

1. the governor emitted 30 `ProposalCreated` events,
2. the indexer forwarded 30 proposal payloads to the backend,
3. `GET /api/proposals` returns the newly created proposals from the same governor.

## Expected Outcome

If executed correctly:

- the demo DAO will have 30 onchain proposals,
- the AIDO indexer will ingest them,
- the backend will analyze them,
- and the frontend will have enough live governance data for a strong demo.
