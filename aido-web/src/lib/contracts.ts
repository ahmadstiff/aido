// ─── Contract Addresses (Monad Testnet) ───

export const CONTRACTS = {
  AIDO_TOKEN: "0xAb0B7eB85F36979DAc40C31C5B37E9fB624C4456" as const,
  AIDO_GOVERNOR: "0xBDf0868adFA79d88381903a9FDf82B2Ed4c15237" as const,
  MONAD_VOTER_REGISTRY: "0x1E9759aC11e4B5b4e39FC9Cda49364fb2ADee7FC" as const,
};

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
