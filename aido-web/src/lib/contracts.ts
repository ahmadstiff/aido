// ─── Contract Addresses (Monad Testnet) ───

export const CONTRACTS = {
  // Core
  AIDO_TOKEN: "0x8a2CF47167EBC346d88B29c69d6C384945B3f63f" as const,
  AIDO_GOVERNOR: "0x5D5d646a5Fdc86f578aCB9cC8f42C91b0C7b647B" as const,
  MONAD_VOTER_REGISTRY: "0x0F3752932c00F7cD471F183b419684D5BbdEA492" as const,
  // Factory & Registry
  AIDO_DAO_FACTORY: "0x19DfE2f666106E9eA84508FC37FA9725D2A187b6" as const,
  AIDO_DAO_REGISTRY: "0xae4Ba05f50DD3080722fea59c8C9CBD4FE22127d" as const,
  TIMELOCK: "0xff512B03fCF978cD183d0635c4Be9FFd9e0647A9" as const,
  // Seed Modules
  TREASURY_MODULE: "0x265Def4579Db17D375042426FDa1f674114AEe23" as const,
  RISK_MODULE: "0x1dF4c3b00cCe33c3Da83473F87B692CCDB932b4a" as const,
  GOVERNANCE_MODULE: "0x14938CFa2713f34486aDC28ec9D999f11d1F427A" as const,
  OPERATIONS_MODULE: "0xff3dea86623abd0827157FA80598d2205C1bF117" as const,
  EMISSIONS_MODULE: "0xD6d601a326292C9C118cE452d8668e5ca08B9994" as const,
  GROWTH_MODULE: "0x52526bFE8BCf86F87a388099737676e5171F8142" as const,
  PARTNERSHIPS_MODULE: "0x5586bf0FBBfC3BB0347ebef0EDdD60809a29739A" as const,
};

export const DEPLOY_BLOCK = 27695764n;

// ─── Enums ───

export const RiskProfile = { CONSERVATIVE: 0, NEUTRAL: 1, AGGRESSIVE: 2 } as const;
export const RiskProfileLabels = ["Conservative", "Neutral", "Aggressive"] as const;

export const ProposalState = {
  Pending: 0, Active: 1, Canceled: 2, Defeated: 3,
  Succeeded: 4, Queued: 5, Expired: 6, Executed: 7,
} as const;

export const ProposalStateLabels: Record<number, string> = {
  0: "Pending", 1: "Active", 2: "Canceled", 3: "Defeated",
  4: "Succeeded", 5: "Queued", 6: "Expired", 7: "Executed",
};

export const VoteSupport = { Against: 0, For: 1, Abstain: 2 } as const;

// ─── AidoToken ABI ───

export const aidoTokenAbi = [
  {
    type: "function", name: "name", stateMutability: "view",
    inputs: [], outputs: [{ type: "string" }],
  },
  {
    type: "function", name: "symbol", stateMutability: "view",
    inputs: [], outputs: [{ type: "string" }],
  },
  {
    type: "function", name: "decimals", stateMutability: "view",
    inputs: [], outputs: [{ type: "uint8" }],
  },
  {
    type: "function", name: "totalSupply", stateMutability: "view",
    inputs: [], outputs: [{ type: "uint256" }],
  },
  {
    type: "function", name: "balanceOf", stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ type: "uint256" }],
  },
  {
    type: "function", name: "getVotes", stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ type: "uint256" }],
  },
  {
    type: "function", name: "delegates", stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ type: "address" }],
  },
  {
    type: "function", name: "owner", stateMutability: "view",
    inputs: [], outputs: [{ type: "address" }],
  },
  {
    type: "function", name: "delegate", stateMutability: "nonpayable",
    inputs: [{ name: "delegatee", type: "address" }],
    outputs: [],
  },
  {
    type: "function", name: "transfer", stateMutability: "nonpayable",
    inputs: [{ name: "to", type: "address" }, { name: "value", type: "uint256" }],
    outputs: [{ type: "bool" }],
  },
  {
    type: "function", name: "mint", stateMutability: "nonpayable",
    inputs: [
      { name: "to", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [],
  },
  {
    type: "function", name: "faucet", stateMutability: "nonpayable",
    inputs: [], outputs: [],
  },
  {
    type: "function", name: "hasClaimed", stateMutability: "view",
    inputs: [{ name: "", type: "address" }],
    outputs: [{ type: "bool" }],
  },
  {
    type: "function", name: "FAUCET_AMOUNT", stateMutability: "view",
    inputs: [], outputs: [{ type: "uint256" }],
  },
  {
    type: "event", name: "DelegateChanged",
    inputs: [
      { name: "delegator", type: "address", indexed: true },
      { name: "fromDelegate", type: "address", indexed: true },
      { name: "toDelegate", type: "address", indexed: true },
    ],
  },
  {
    type: "event", name: "Transfer",
    inputs: [
      { name: "from", type: "address", indexed: true },
      { name: "to", type: "address", indexed: true },
      { name: "value", type: "uint256", indexed: false },
    ],
  },
] as const;

// ─── AidoGovernor ABI ───

export const aidoGovernorAbi = [
  {
    type: "function", name: "name", stateMutability: "view",
    inputs: [], outputs: [{ type: "string" }],
  },
  {
    type: "function", name: "votingDelay", stateMutability: "view",
    inputs: [], outputs: [{ type: "uint256" }],
  },
  {
    type: "function", name: "votingPeriod", stateMutability: "view",
    inputs: [], outputs: [{ type: "uint256" }],
  },
  {
    type: "function", name: "proposalThreshold", stateMutability: "view",
    inputs: [], outputs: [{ type: "uint256" }],
  },
  {
    type: "function", name: "state", stateMutability: "view",
    inputs: [{ name: "proposalId", type: "uint256" }],
    outputs: [{ type: "uint8" }],
  },
  {
    type: "function", name: "proposalSnapshot", stateMutability: "view",
    inputs: [{ name: "proposalId", type: "uint256" }],
    outputs: [{ type: "uint256" }],
  },
  {
    type: "function", name: "proposalDeadline", stateMutability: "view",
    inputs: [{ name: "proposalId", type: "uint256" }],
    outputs: [{ type: "uint256" }],
  },
  {
    type: "function", name: "proposalProposer", stateMutability: "view",
    inputs: [{ name: "proposalId", type: "uint256" }],
    outputs: [{ type: "address" }],
  },
  {
    type: "function", name: "hasVoted", stateMutability: "view",
    inputs: [
      { name: "proposalId", type: "uint256" },
      { name: "account", type: "address" },
    ],
    outputs: [{ type: "bool" }],
  },
  {
    type: "function", name: "proposalVotes", stateMutability: "view",
    inputs: [{ name: "proposalId", type: "uint256" }],
    outputs: [
      { name: "againstVotes", type: "uint256" },
      { name: "forVotes", type: "uint256" },
      { name: "abstainVotes", type: "uint256" },
    ],
  },
  {
    type: "function", name: "hashProposal", stateMutability: "pure",
    inputs: [
      { name: "targets", type: "address[]" },
      { name: "values", type: "uint256[]" },
      { name: "calldatas", type: "bytes[]" },
      { name: "descriptionHash", type: "bytes32" },
    ],
    outputs: [{ type: "uint256" }],
  },
  {
    type: "function", name: "propose", stateMutability: "nonpayable",
    inputs: [
      { name: "targets", type: "address[]" },
      { name: "values", type: "uint256[]" },
      { name: "calldatas", type: "bytes[]" },
      { name: "description", type: "string" },
    ],
    outputs: [{ type: "uint256" }],
  },
  {
    type: "function", name: "castVote", stateMutability: "nonpayable",
    inputs: [
      { name: "proposalId", type: "uint256" },
      { name: "support", type: "uint8" },
    ],
    outputs: [{ type: "uint256" }],
  },
  {
    type: "function", name: "castVoteWithReason", stateMutability: "nonpayable",
    inputs: [
      { name: "proposalId", type: "uint256" },
      { name: "support", type: "uint8" },
      { name: "reason", type: "string" },
    ],
    outputs: [{ type: "uint256" }],
  },
  {
    type: "function", name: "execute", stateMutability: "payable",
    inputs: [
      { name: "targets", type: "address[]" },
      { name: "values", type: "uint256[]" },
      { name: "calldatas", type: "bytes[]" },
      { name: "descriptionHash", type: "bytes32" },
    ],
    outputs: [{ type: "uint256" }],
  },
  {
    type: "event", name: "ProposalCreated",
    inputs: [
      { name: "proposalId", type: "uint256", indexed: false },
      { name: "proposer", type: "address", indexed: false },
      { name: "targets", type: "address[]", indexed: false },
      { name: "values", type: "uint256[]", indexed: false },
      { name: "signatures", type: "string[]", indexed: false },
      { name: "calldatas", type: "bytes[]", indexed: false },
      { name: "voteStart", type: "uint256", indexed: false },
      { name: "voteEnd", type: "uint256", indexed: false },
      { name: "description", type: "string", indexed: false },
    ],
  },
  {
    type: "event", name: "VoteCast",
    inputs: [
      { name: "voter", type: "address", indexed: true },
      { name: "proposalId", type: "uint256", indexed: false },
      { name: "support", type: "uint8", indexed: false },
      { name: "weight", type: "uint256", indexed: false },
      { name: "reason", type: "string", indexed: false },
    ],
  },
  {
    type: "event", name: "ProposalExecuted",
    inputs: [{ name: "proposalId", type: "uint256", indexed: false }],
  },
] as const;

// ─── MonadVoterRegistry ABI ───

export const monadVoterRegistryAbi = [
  {
    type: "function", name: "governor", stateMutability: "view",
    inputs: [], outputs: [{ type: "address" }],
  },
  {
    type: "function", name: "getUserConfig", stateMutability: "view",
    inputs: [{ name: "_user", type: "address" }],
    outputs: [{
      type: "tuple",
      components: [
        { name: "riskProfile", type: "uint8" },
        { name: "isAutoPilot", type: "bool" },
        { name: "delegatedAgent", type: "address" },
      ],
    }],
  },
  {
    type: "function", name: "isUserRegistered", stateMutability: "view",
    inputs: [{ name: "_user", type: "address" }],
    outputs: [{ type: "bool" }],
  },
  {
    type: "function", name: "getRegisteredUsersCount", stateMutability: "view",
    inputs: [], outputs: [{ type: "uint256" }],
  },
  {
    type: "function", name: "setConfig", stateMutability: "nonpayable",
    inputs: [
      { name: "_risk", type: "uint8" },
      { name: "_autoPilot", type: "bool" },
      { name: "_agent", type: "address" },
    ],
    outputs: [],
  },
  {
    type: "function", name: "recordAgentVote", stateMutability: "nonpayable",
    inputs: [
      { name: "_user", type: "address" },
      { name: "_proposalId", type: "uint256" },
      { name: "_support", type: "uint8" },
      { name: "_reason", type: "string" },
    ],
    outputs: [],
  },
  {
    type: "event", name: "ConfigUpdated",
    inputs: [
      { name: "user", type: "address", indexed: true },
      { name: "risk", type: "uint8", indexed: false },
      { name: "autoPilot", type: "bool", indexed: false },
      { name: "agent", type: "address", indexed: false },
    ],
  },
  {
    type: "event", name: "VoteExecutedByAgent",
    inputs: [
      { name: "user", type: "address", indexed: true },
      { name: "proposalId", type: "uint256", indexed: true },
      { name: "support", type: "uint8", indexed: false },
      { name: "reason", type: "string", indexed: false },
    ],
  },
] as const;

// ─── AidoDaoFactory ABI ───

export const aidoDaoFactoryAbi = [
  {
    type: "function", name: "createDao", stateMutability: "nonpayable",
    inputs: [
      { name: "name", type: "string" },
      { name: "token", type: "address" },
      { name: "votingDelay", type: "uint48" },
      { name: "votingPeriod", type: "uint32" },
      { name: "proposalThreshold", type: "uint256" },
      { name: "quorumNumerator", type: "uint256" },
      { name: "initialOwner", type: "address" },
      { name: "metadataURI", type: "string" },
    ],
    outputs: [
      { name: "governor", type: "address" },
      { name: "timelock", type: "address" },
    ],
  },
  {
    type: "function", name: "registry", stateMutability: "view",
    inputs: [], outputs: [{ type: "address" }],
  },
  {
    type: "function", name: "paused", stateMutability: "view",
    inputs: [], outputs: [{ type: "bool" }],
  },
  {
    type: "event", name: "DaoCreated",
    inputs: [
      { name: "creator", type: "address", indexed: true },
      { name: "governor", type: "address", indexed: true },
      { name: "timelock", type: "address", indexed: true },
      { name: "token", type: "address", indexed: false },
      { name: "name", type: "string", indexed: false },
      { name: "metadataURI", type: "string", indexed: false },
    ],
  },
] as const;

// ─── AidoDaoRegistry ABI ───

export const aidoDaoRegistryAbi = [
  {
    type: "function", name: "isRegisteredDao", stateMutability: "view",
    inputs: [{ name: "governor", type: "address" }],
    outputs: [{ type: "bool" }],
  },
  {
    type: "function", name: "getDao", stateMutability: "view",
    inputs: [{ name: "governor", type: "address" }],
    outputs: [{
      type: "tuple",
      components: [
        { name: "exists", type: "bool" },
        { name: "governor", type: "address" },
        { name: "timelock", type: "address" },
        { name: "token", type: "address" },
        { name: "creator", type: "address" },
        { name: "name", type: "string" },
        { name: "metadataURI", type: "string" },
        { name: "createdAt", type: "uint64" },
      ],
    }],
  },
  {
    type: "function", name: "daoCount", stateMutability: "view",
    inputs: [], outputs: [{ type: "uint256" }],
  },
  {
    type: "function", name: "listDaos", stateMutability: "view",
    inputs: [
      { name: "offset", type: "uint256" },
      { name: "limit", type: "uint256" },
    ],
    outputs: [{ name: "governors", type: "address[]" }],
  },
  {
    type: "event", name: "DaoRegistered",
    inputs: [
      { name: "governor", type: "address", indexed: true },
      { name: "creator", type: "address", indexed: true },
      { name: "token", type: "address", indexed: false },
      { name: "name", type: "string", indexed: false },
      { name: "metadataURI", type: "string", indexed: false },
    ],
  },
] as const;
