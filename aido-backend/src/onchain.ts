import {
  createPublicClient,
  createWalletClient,
  defineChain,
  getAddress,
  http,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { aidoGovernorAbi } from "./abi/aidoGovernorAbi.js";
import { appEnv } from "./config.js";
import type { OnchainVoteRecord, RecommendedVote, StoredProposal } from "./types.js";

const monadTestnet = defineChain({
  id: appEnv.monadChainId,
  name: "Monad Testnet",
  network: "monad-testnet",
  nativeCurrency: {
    name: "MON",
    symbol: "MON",
    decimals: 18,
  },
  rpcUrls: {
    default: {
      http: [appEnv.monadRpcUrl],
    },
  },
  blockExplorers: {
    default: {
      name: "Monad Explorer",
      url: "https://testnet.monadexplorer.com",
    },
  },
  testnet: true,
});

function requireOnchainConfig(): {
  account: ReturnType<typeof privateKeyToAccount>;
} {
  if (!appEnv.agentPrivateKey) {
    throw new Error("AGENT_PRIVATE_KEY is not configured.");
  }

  const normalizedKey = appEnv.agentPrivateKey.startsWith("0x")
    ? appEnv.agentPrivateKey
    : `0x${appEnv.agentPrivateKey}`;

  return {
    account: privateKeyToAccount(normalizedKey as `0x${string}`),
  };
}

function getClients() {
  const config = requireOnchainConfig();
  const publicClient = createPublicClient({
    chain: monadTestnet,
    transport: http(appEnv.monadRpcUrl),
  });
  const walletClient = createWalletClient({
    account: config.account,
    chain: monadTestnet,
    transport: http(appEnv.monadRpcUrl),
  });

  return {
    ...config,
    publicClient,
    walletClient,
  };
}

export function supportToUint8(support: RecommendedVote): number {
  if (support === "FOR") {
    return 1;
  }

  if (support === "AGAINST") {
    return 0;
  }

  return 2;
}

export async function castGovernorVote(options: {
  proposal: StoredProposal;
  support: RecommendedVote;
  reason: string;
}): Promise<OnchainVoteRecord> {
  if (!options.proposal.contractAddress) {
    throw new Error("Proposal does not have a governor contract address.");
  }

  const {
    account,
    publicClient,
    walletClient,
  } = getClients();

  const governorAddress = getAddress(options.proposal.contractAddress);
  const proposalId = BigInt(options.proposal.proposalId);
  const voter = getAddress(account.address);

  const hasVoted = await publicClient.readContract({
    address: governorAddress,
    abi: aidoGovernorAbi,
    functionName: "hasVoted",
    args: [proposalId, voter],
  });

  if (hasVoted) {
    throw new Error("Agent wallet has already voted on this proposal.");
  }

  const support = supportToUint8(options.support);
  const txHash = options.reason
    ? await walletClient.writeContract({
        address: governorAddress,
        abi: aidoGovernorAbi,
        functionName: "castVoteWithReason",
        args: [proposalId, support, options.reason],
      })
    : await walletClient.writeContract({
        address: governorAddress,
        abi: aidoGovernorAbi,
        functionName: "castVote",
        args: [proposalId, support],
      });

  await publicClient.waitForTransactionReceipt({ hash: txHash });

  return {
    voter,
    governorAddress,
    proposalId: options.proposal.proposalId,
    proposalKey: options.proposal.proposalKey,
    support: options.support,
    reason: options.reason,
    txHash,
    castAt: new Date().toISOString(),
  };
}
