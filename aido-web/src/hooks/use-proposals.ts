"use client";

import { useQuery } from "@tanstack/react-query";
import { createPublicClient, http, parseAbiItem } from "viem";
import { monadTestnet } from "@/config";
import { CONTRACTS, DEPLOY_BLOCK } from "@/lib/contracts";
import {
  fetchProposals as fetchBackendProposals,
  isBackendAvailable,
  type ProposalAnalysis,
} from "@/lib/api";

export type Proposal = {
  proposalKey: string;
  proposalId: bigint;
  proposer: string;
  description: string;
  voteStart?: bigint;
  voteEnd?: bigint;
  analysis?: ProposalAnalysis;
};

export type ProposalsResult = {
  proposals: Proposal[];
  source: "backend" | "onchain";
};

const client = createPublicClient({
  chain: monadTestnet,
  transport: http(),
});

async function loadFromBackend(): Promise<ProposalsResult | null> {
  const backendUp = await isBackendAvailable();
  if (!backendUp) return null;

  const { proposals: bp } = await fetchBackendProposals(
    CONTRACTS.AIDO_GOVERNOR,
  );

  return {
    proposals: bp.map((p) => ({
      proposalKey: p.proposalKey,
      proposalId: BigInt(p.proposalId),
      proposer: p.proposer ?? "",
      description: p.title ?? p.description,
      voteStart: p.startBlock ? BigInt(p.startBlock) : undefined,
      voteEnd: p.endBlock ? BigInt(p.endBlock) : undefined,
      analysis: p.analysis,
    })),
    source: "backend",
  };
}

async function loadFromOnchain(): Promise<ProposalsResult> {
  const currentBlock = await client.getBlockNumber();
  const batchSize = 99n;

  const event = parseAbiItem(
    "event ProposalCreated(uint256 proposalId, address proposer, address[] targets, uint256[] values, string[] signatures, bytes[] calldatas, uint256 voteStart, uint256 voteEnd, string description)",
  );

  const allLogs = [];
  for (
    let from = DEPLOY_BLOCK;
    from <= currentBlock;
    from += batchSize + 1n
  ) {
    const to =
      from + batchSize > currentBlock ? currentBlock : from + batchSize;
    const logs = await client.getLogs({
      address: CONTRACTS.AIDO_GOVERNOR,
      event,
      fromBlock: from,
      toBlock: to,
    });
    allLogs.push(...logs);
  }

  return {
    proposals: allLogs
      .map((log) => ({
        proposalKey: `${CONTRACTS.AIDO_GOVERNOR.toLowerCase()}:${log.args.proposalId!.toString()}`,
        proposalId: log.args.proposalId!,
        proposer: log.args.proposer!,
        description: log.args.description!,
        voteStart: log.args.voteStart!,
        voteEnd: log.args.voteEnd!,
      }))
      .reverse(),
    source: "onchain",
  };
}

async function fetchAllProposals(): Promise<ProposalsResult> {
  // Try backend first, fallback to on-chain
  try {
    const result = await loadFromBackend();
    if (result) return result;
  } catch {
    // fall through
  }

  return loadFromOnchain();
}

/**
 * Cached proposal fetcher. Data survives page navigation
 * and only refetches after staleTime (60s) or on manual invalidation.
 */
export function useProposals() {
  return useQuery<ProposalsResult>({
    queryKey: ["proposals", CONTRACTS.AIDO_GOVERNOR],
    queryFn: fetchAllProposals,
    staleTime: 60_000, // 60s before considered stale
    gcTime: 5 * 60_000, // 5 min cache lifetime
    refetchOnWindowFocus: false,
  });
}
