# AIDO Smart Contract — Dokumentasi untuk Frontend

**Chain:** Monad Testnet (Chain ID `10143`)
**RPC:** `https://testnet-rpc.monad.xyz`
**Library:** Gunakan `viem` + `wagmi` (sudah terinstall di aido-web)

> Contract addresses akan diisi setelah deployment ke Monad Testnet.

## Contract Addresses

```ts
export const CONTRACTS = {
  AIDO_TOKEN: "0xAb0B7eB85F36979DAc40C31C5B37E9fB624C4456",           // AidoToken (ERC20Votes)
  AIDO_GOVERNOR: "0xBDf0868adFA79d88381903a9FDf82B2Ed4c15237",        // AidoGovernor
  MONAD_VOTER_REGISTRY: "0x1E9759aC11e4B5b4e39FC9Cda49364fb2ADee7FC", // MonadVoterRegistry
} as const;
```

---

## 1. AidoToken (ERC20Votes)

Governance token. User harus `delegate()` dulu sebelum bisa voting.

### ABI (minimal untuk FE)

```ts
export const aidoTokenAbi = [
  // ── Read ──
  {
    type: "function",
    name: "name",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "string" }],
  },
  {
    type: "function",
    name: "symbol",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "string" }],
  },
  {
    type: "function",
    name: "decimals",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "uint8" }],
  },
  {
    type: "function",
    name: "totalSupply",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "uint256" }],
  },
  {
    type: "function",
    name: "balanceOf",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ type: "uint256" }],
  },
  {
    type: "function",
    name: "getVotes",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ type: "uint256" }],
  },
  {
    type: "function",
    name: "delegates",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ type: "address" }],
  },
  // ── Write ──
  {
    type: "function",
    name: "delegate",
    stateMutability: "nonpayable",
    inputs: [{ name: "delegatee", type: "address" }],
    outputs: [],
  },
  {
    type: "function",
    name: "transfer",
    stateMutability: "nonpayable",
    inputs: [
      { name: "to", type: "address" },
      { name: "value", type: "uint256" },
    ],
    outputs: [{ type: "bool" }],
  },
  // ── Events ──
  {
    type: "event",
    name: "DelegateChanged",
    inputs: [
      { name: "delegator", type: "address", indexed: true },
      { name: "fromDelegate", type: "address", indexed: true },
      { name: "toDelegate", type: "address", indexed: true },
    ],
  },
  {
    type: "event",
    name: "Transfer",
    inputs: [
      { name: "from", type: "address", indexed: true },
      { name: "to", type: "address", indexed: true },
      { name: "value", type: "uint256", indexed: false },
    ],
  },
] as const;
```

### Fungsi Penting untuk FE

| Fungsi | Tipe | Kapan Dipakai |
|--------|------|---------------|
| `balanceOf(address)` | Read | Tampilkan saldo token user |
| `getVotes(address)` | Read | Tampilkan voting power aktif |
| `delegates(address)` | Read | Cek ke siapa user delegate |
| `delegate(address)` | Write | User delegate ke diri sendiri atau agent |
| `transfer(to, amount)` | Write | Transfer token ke user lain |

### Penting: Delegation

Token balance ≠ voting power. User **harus** call `delegate()` dulu:

```ts
// User delegate ke diri sendiri (aktifkan voting power)
await writeContract({
  address: CONTRACTS.AIDO_TOKEN,
  abi: aidoTokenAbi,
  functionName: "delegate",
  args: [userAddress], // delegate ke diri sendiri
});

// Atau delegate ke AI agent
await writeContract({
  address: CONTRACTS.AIDO_TOKEN,
  abi: aidoTokenAbi,
  functionName: "delegate",
  args: [agentAddress], // delegate ke agent
});
```

---

## 2. AidoGovernor

DAO Governor — create proposal, vote, execute.

### Settings

| Parameter | Value | Keterangan |
|-----------|-------|------------|
| Voting Delay | 1 block | ~1 detik di Monad |
| Voting Period | 50 blocks | ~50 detik di Monad |
| Proposal Threshold | 0 | Siapapun bisa propose |
| Quorum | 4% | Dari total supply |

### Proposal State (uint8)

```ts
enum ProposalState {
  Pending = 0,
  Active = 1,
  Canceled = 2,
  Defeated = 3,
  Succeeded = 4,
  Queued = 5,
  Expired = 6,
  Executed = 7,
}
```

### Vote Support (uint8)

```ts
enum VoteSupport {
  Against = 0,
  For = 1,
  Abstain = 2,
}
```

### ABI (minimal untuk FE)

```ts
export const aidoGovernorAbi = [
  // ── Read ──
  {
    type: "function",
    name: "name",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "string" }],
  },
  {
    type: "function",
    name: "votingDelay",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "uint256" }],
  },
  {
    type: "function",
    name: "votingPeriod",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "uint256" }],
  },
  {
    type: "function",
    name: "proposalThreshold",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "uint256" }],
  },
  {
    type: "function",
    name: "quorum",
    stateMutability: "view",
    inputs: [{ name: "timepoint", type: "uint256" }],
    outputs: [{ type: "uint256" }],
  },
  {
    type: "function",
    name: "state",
    stateMutability: "view",
    inputs: [{ name: "proposalId", type: "uint256" }],
    outputs: [{ type: "uint8" }],
  },
  {
    type: "function",
    name: "proposalSnapshot",
    stateMutability: "view",
    inputs: [{ name: "proposalId", type: "uint256" }],
    outputs: [{ type: "uint256" }],
  },
  {
    type: "function",
    name: "proposalDeadline",
    stateMutability: "view",
    inputs: [{ name: "proposalId", type: "uint256" }],
    outputs: [{ type: "uint256" }],
  },
  {
    type: "function",
    name: "proposalProposer",
    stateMutability: "view",
    inputs: [{ name: "proposalId", type: "uint256" }],
    outputs: [{ type: "address" }],
  },
  {
    type: "function",
    name: "hasVoted",
    stateMutability: "view",
    inputs: [
      { name: "proposalId", type: "uint256" },
      { name: "account", type: "address" },
    ],
    outputs: [{ type: "bool" }],
  },
  {
    type: "function",
    name: "proposalVotes",
    stateMutability: "view",
    inputs: [{ name: "proposalId", type: "uint256" }],
    outputs: [
      { name: "againstVotes", type: "uint256" },
      { name: "forVotes", type: "uint256" },
      { name: "abstainVotes", type: "uint256" },
    ],
  },
  {
    type: "function",
    name: "hashProposal",
    stateMutability: "pure",
    inputs: [
      { name: "targets", type: "address[]" },
      { name: "values", type: "uint256[]" },
      { name: "calldatas", type: "bytes[]" },
      { name: "descriptionHash", type: "bytes32" },
    ],
    outputs: [{ type: "uint256" }],
  },
  // ── Write ──
  {
    type: "function",
    name: "propose",
    stateMutability: "nonpayable",
    inputs: [
      { name: "targets", type: "address[]" },
      { name: "values", type: "uint256[]" },
      { name: "calldatas", type: "bytes[]" },
      { name: "description", type: "string" },
    ],
    outputs: [{ type: "uint256" }],
  },
  {
    type: "function",
    name: "castVote",
    stateMutability: "nonpayable",
    inputs: [
      { name: "proposalId", type: "uint256" },
      { name: "support", type: "uint8" },
    ],
    outputs: [{ type: "uint256" }],
  },
  {
    type: "function",
    name: "castVoteWithReason",
    stateMutability: "nonpayable",
    inputs: [
      { name: "proposalId", type: "uint256" },
      { name: "support", type: "uint8" },
      { name: "reason", type: "string" },
    ],
    outputs: [{ type: "uint256" }],
  },
  {
    type: "function",
    name: "execute",
    stateMutability: "payable",
    inputs: [
      { name: "targets", type: "address[]" },
      { name: "values", type: "uint256[]" },
      { name: "calldatas", type: "bytes[]" },
      { name: "descriptionHash", type: "bytes32" },
    ],
    outputs: [{ type: "uint256" }],
  },
  // ── Events ──
  {
    type: "event",
    name: "ProposalCreated",
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
    type: "event",
    name: "VoteCast",
    inputs: [
      { name: "voter", type: "address", indexed: true },
      { name: "proposalId", type: "uint256", indexed: false },
      { name: "support", type: "uint8", indexed: false },
      { name: "weight", type: "uint256", indexed: false },
      { name: "reason", type: "string", indexed: false },
    ],
  },
  {
    type: "event",
    name: "ProposalExecuted",
    inputs: [
      { name: "proposalId", type: "uint256", indexed: false },
    ],
  },
] as const;
```

### Cara Create Proposal dari FE

```ts
import { keccak256, toHex, encodeFunctionData } from "viem";

// Proposal sederhana (no-op, hanya untuk voting)
const targets = ["0x0000000000000000000000000000000000000000"];
const values = [0n];
const calldatas = ["0x"];
const description = "Proposal #1: Allocate 50,000 MON to marketing wallet";

const tx = await writeContract({
  address: CONTRACTS.AIDO_GOVERNOR,
  abi: aidoGovernorAbi,
  functionName: "propose",
  args: [targets, values, calldatas, description],
});

// Untuk mendapatkan proposalId setelah tx berhasil:
const proposalId = await readContract({
  address: CONTRACTS.AIDO_GOVERNOR,
  abi: aidoGovernorAbi,
  functionName: "hashProposal",
  args: [targets, values, calldatas, keccak256(toHex(description))],
});
```

### Cara Vote dari FE (Manual Mode)

```ts
// User manual vote
await writeContract({
  address: CONTRACTS.AIDO_GOVERNOR,
  abi: aidoGovernorAbi,
  functionName: "castVoteWithReason",
  args: [proposalId, 1, "I support this proposal because..."], // 1 = For
});
```

---

## 3. MonadVoterRegistry

Registry AIDO — user config + agent orchestration.

### RiskProfile (uint8)

```ts
enum RiskProfile {
  CONSERVATIVE = 0,
  NEUTRAL = 1,
  AGGRESSIVE = 2,
}
```

### ABI

```ts
export const monadVoterRegistryAbi = [
  // ── Read ──
  {
    type: "function",
    name: "governor",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "address" }],
  },
  {
    type: "function",
    name: "getUserConfig",
    stateMutability: "view",
    inputs: [{ name: "_user", type: "address" }],
    outputs: [
      {
        type: "tuple",
        components: [
          { name: "riskProfile", type: "uint8" },
          { name: "isAutoPilot", type: "bool" },
          { name: "delegatedAgent", type: "address" },
        ],
      },
    ],
  },
  {
    type: "function",
    name: "isUserRegistered",
    stateMutability: "view",
    inputs: [{ name: "_user", type: "address" }],
    outputs: [{ type: "bool" }],
  },
  {
    type: "function",
    name: "getRegisteredUsersCount",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "uint256" }],
  },
  {
    type: "function",
    name: "registeredUsers",
    stateMutability: "view",
    inputs: [{ name: "", type: "uint256" }],
    outputs: [{ type: "address" }],
  },
  // ── Write ──
  {
    type: "function",
    name: "setConfig",
    stateMutability: "nonpayable",
    inputs: [
      { name: "_risk", type: "uint8" },
      { name: "_autoPilot", type: "bool" },
      { name: "_agent", type: "address" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "recordAgentVote",
    stateMutability: "nonpayable",
    inputs: [
      { name: "_user", type: "address" },
      { name: "_proposalId", type: "uint256" },
      { name: "_support", type: "uint8" },
      { name: "_reason", type: "string" },
    ],
    outputs: [],
  },
  // ── Events ──
  {
    type: "event",
    name: "ConfigUpdated",
    inputs: [
      { name: "user", type: "address", indexed: true },
      { name: "risk", type: "uint8", indexed: false },
      { name: "autoPilot", type: "bool", indexed: false },
      { name: "agent", type: "address", indexed: false },
    ],
  },
  {
    type: "event",
    name: "VoteExecutedByAgent",
    inputs: [
      { name: "user", type: "address", indexed: true },
      { name: "proposalId", type: "uint256", indexed: true },
      { name: "support", type: "uint8", indexed: false },
      { name: "reason", type: "string", indexed: false },
    ],
  },
  // ── Errors ──
  {
    type: "error",
    name: "NotAuthorizedAgent",
    inputs: [],
  },
  {
    type: "error",
    name: "AutoPilotDisabled",
    inputs: [],
  },
  {
    type: "error",
    name: "ZeroAddress",
    inputs: [],
  },
] as const;
```

### Cara Set Config dari FE

```ts
// User set profil governance
await writeContract({
  address: CONTRACTS.MONAD_VOTER_REGISTRY,
  abi: monadVoterRegistryAbi,
  functionName: "setConfig",
  args: [
    0,             // RiskProfile: 0=CONSERVATIVE, 1=NEUTRAL, 2=AGGRESSIVE
    true,          // isAutoPilot: enable auto-voting by agent
    agentAddress,  // delegatedAgent address
  ],
});
```

### Cara Baca Config dari FE

```ts
const config = await readContract({
  address: CONTRACTS.MONAD_VOTER_REGISTRY,
  abi: monadVoterRegistryAbi,
  functionName: "getUserConfig",
  args: [userAddress],
});

// config.riskProfile  → 0 | 1 | 2
// config.isAutoPilot  → true | false
// config.delegatedAgent → "0x..."
```

---

## User Flows untuk FE

### Flow 1: Onboarding (Pertama Kali)

```
1. User connect wallet
2. User receive/claim AIDO token (dari faucet atau transfer)
3. User call AidoToken.delegate(userAddress)  ← WAJIB, aktifkan voting power
4. User call MonadVoterRegistry.setConfig(risk, autoPilot, agentAddress)
```

### Flow 2: Manual Voting

```
1. FE fetch daftar proposal aktif (listen event ProposalCreated)
2. FE tampilkan proposal + AI analysis (dari backend API)
3. User klik "Vote For/Against/Abstain"
4. FE call AidoGovernor.castVoteWithReason(proposalId, support, reason)
5. FE update UI setelah tx confirm
```

### Flow 3: Auto-Pilot (Agent Vote)

```
1. User sudah setConfig dengan isAutoPilot=true dan delegatedAgent set
2. User call AidoToken.delegate(agentAddress) ← delegate voting power ke agent
3. Backend/agent detect proposal baru (via event atau indexer)
4. Backend/agent call MonadVoterRegistry.recordAgentVote(user, proposalId, support, reason)
5. FE listen event VoteExecutedByAgent untuk update UI
```

### Flow 4: View Proposal Status

```ts
// Get proposal state
const state = await readContract({
  address: CONTRACTS.AIDO_GOVERNOR,
  abi: aidoGovernorAbi,
  functionName: "state",
  args: [proposalId],
});
// 0=Pending, 1=Active, 2=Canceled, 3=Defeated, 4=Succeeded, 5=Queued, 6=Expired, 7=Executed

// Get vote counts
const [againstVotes, forVotes, abstainVotes] = await readContract({
  address: CONTRACTS.AIDO_GOVERNOR,
  abi: aidoGovernorAbi,
  functionName: "proposalVotes",
  args: [proposalId],
});

// Check if user already voted
const hasVoted = await readContract({
  address: CONTRACTS.AIDO_GOVERNOR,
  abi: aidoGovernorAbi,
  functionName: "hasVoted",
  args: [proposalId, userAddress],
});
```

---

## Events yang Perlu Di-listen FE

| Contract | Event | Kapan | Data Penting |
|----------|-------|-------|--------------|
| `AidoGovernor` | `ProposalCreated` | Proposal baru dibuat | proposalId, proposer, description, voteStart, voteEnd |
| `AidoGovernor` | `VoteCast` | Ada yang vote | voter, proposalId, support, weight, reason |
| `AidoGovernor` | `ProposalExecuted` | Proposal dieksekusi | proposalId |
| `MonadVoterRegistry` | `ConfigUpdated` | User update config | user, risk, autoPilot, agent |
| `MonadVoterRegistry` | `VoteExecutedByAgent` | Agent vote untuk user | user, proposalId, support, reason |
| `AidoToken` | `DelegateChanged` | User ganti delegate | delegator, fromDelegate, toDelegate |

### Contoh Listen Event dengan wagmi

```ts
import { useWatchContractEvent } from "wagmi";

// Listen proposal baru
useWatchContractEvent({
  address: CONTRACTS.AIDO_GOVERNOR,
  abi: aidoGovernorAbi,
  eventName: "ProposalCreated",
  onLogs(logs) {
    // Update state dengan proposal baru
    const { proposalId, description, voteStart, voteEnd } = logs[0].args;
  },
});

// Listen agent votes
useWatchContractEvent({
  address: CONTRACTS.MONAD_VOTER_REGISTRY,
  abi: monadVoterRegistryAbi,
  eventName: "VoteExecutedByAgent",
  onLogs(logs) {
    const { user, proposalId, support, reason } = logs[0].args;
    // Show notification: "AI Agent voted FOR on Proposal #X"
  },
});
```

---

## Catatan Penting

1. **Delegation harus dilakukan sebelum vote.** Jika user belum `delegate()`, voting power = 0 meskipun punya token.
2. **Voting power di-snapshot saat proposal dibuat.** Token yang didapat setelah proposal dibuat tidak bisa dipakai untuk vote di proposal tersebut.
3. **Agent vote melalui Registry**, bukan langsung ke Governor. Ini supaya ada access control (cek autoPilot + authorized agent).
4. **Semua amount dalam 18 decimals.** `1 AIDO = 1000000000000000000` (1e18).
5. **Proposal ID bisa di-compute di FE** menggunakan `hashProposal(targets, values, calldatas, keccak256(description))`.
