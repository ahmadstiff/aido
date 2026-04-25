"use client";

import Link from "next/link";
import { useAccount, useReadContract } from "wagmi";
import { useEffect, useState } from "react";
import { createPublicClient, http, parseAbiItem, formatEther } from "viem";
import { CONTRACTS, aidoGovernorAbi, ProposalStateLabels } from "@/lib/contracts";
import { monadTestnet } from "@/config";

type Proposal = {
  proposalId: bigint;
  proposer: string;
  description: string;
  voteStart: bigint;
  voteEnd: bigint;
};

const client = createPublicClient({
  chain: {
    id: 10143,
    name: "Monad Testnet",
    nativeCurrency: { name: "MON", symbol: "MON", decimals: 18 },
    rpcUrls: { default: { http: ["https://testnet-rpc.monad.xyz"] } },
  },
  transport: http(),
});

export default function ProposalsPage() {
  const { isConnected } = useAccount();
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchProposals() {
      try {
        const DEPLOY_BLOCK = 27682170n;
        const BATCH_SIZE = 99n; // Monad RPC limits eth_getLogs to 100 block range
        const currentBlock = await client.getBlockNumber();

        const event = parseAbiItem(
          "event ProposalCreated(uint256 proposalId, address proposer, address[] targets, uint256[] values, string[] signatures, bytes[] calldatas, uint256 voteStart, uint256 voteEnd, string description)"
        );

        const allLogs = [];
        for (let from = DEPLOY_BLOCK; from <= currentBlock; from += BATCH_SIZE + 1n) {
          const to = from + BATCH_SIZE > currentBlock ? currentBlock : from + BATCH_SIZE;
          const logs = await client.getLogs({
            address: CONTRACTS.AIDO_GOVERNOR,
            event,
            fromBlock: from,
            toBlock: to,
          });
          allLogs.push(...logs);
        }

        const parsed = allLogs.map((log) => ({
          proposalId: log.args.proposalId!,
          proposer: log.args.proposer!,
          description: log.args.description!,
          voteStart: log.args.voteStart!,
          voteEnd: log.args.voteEnd!,
        }));

        setProposals(parsed.reverse());
      } catch (err) {
        console.error("Failed to fetch proposals:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchProposals();
  }, []);

  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-6 py-10">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-[#1A1613]">Proposals</h1>
          <p className="mt-0.5 text-sm text-[#8C8680]">Active and past governance proposals</p>
        </div>
        {isConnected && (
          <Link
            href="/proposals/create"
            className="rounded-xl bg-[#6C5CE7] px-5 py-2.5 text-sm font-semibold text-white shadow-sm shadow-[#6C5CE7]/20 hover:bg-[#5B4FDB] transition-all"
          >
            New Proposal
          </Link>
        )}
      </div>

      <div className="mt-8 space-y-4">
        {loading ? (
          <p className="text-[#8C8680]">Loading proposals...</p>
        ) : proposals.length === 0 ? (
          <div className="rounded-2xl bg-white border border-[#E2DFD9] p-10 text-center shadow-sm">
            <p className="text-[#8C8680]">No proposals yet. Be the first to create one!</p>
          </div>
        ) : (
          proposals.map((p) => (
            <ProposalCard key={p.proposalId.toString()} proposal={p} />
          ))
        )}
      </div>
    </div>
  );
}

function ProposalCard({ proposal }: { proposal: Proposal }) {
  const { data: state } = useReadContract({
    address: CONTRACTS.AIDO_GOVERNOR,
    abi: aidoGovernorAbi,
    functionName: "state",
    args: [proposal.proposalId],
  });

  const { data: votes } = useReadContract({
    address: CONTRACTS.AIDO_GOVERNOR,
    abi: aidoGovernorAbi,
    functionName: "proposalVotes",
    args: [proposal.proposalId],
  });

  const stateLabel = state !== undefined ? ProposalStateLabels[state] ?? "Unknown" : "...";
  const stateColor: Record<string, string> = {
    Active: "bg-emerald-50 text-emerald-700 border border-emerald-200",
    Succeeded: "bg-blue-50 text-blue-700 border border-blue-200",
    Defeated: "bg-red-50 text-red-700 border border-red-200",
    Pending: "bg-amber-50 text-amber-700 border border-amber-200",
    Executed: "bg-[#EDE8FF] text-[#6C5CE7] border border-[#6C5CE7]/20",
  };

  return (
    <Link
      href={`/proposals/${proposal.proposalId.toString()}`}
      className="block rounded-2xl bg-white border border-[#E2DFD9] p-6 shadow-sm transition-all hover:shadow-md hover:border-[#6C5CE7]/30"
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="font-bold text-[#1A1613]">{proposal.description}</p>
          <p className="mt-1 text-xs text-[#8C8680]">
            by {proposal.proposer.slice(0, 6)}...{proposal.proposer.slice(-4)}
          </p>
        </div>
        <span className={`ml-3 shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold ${stateColor[stateLabel] ?? "bg-[#F0EEEB] text-[#8C8680]"}`}>
          {stateLabel}
        </span>
      </div>
      {votes && (
        <div className="mt-4 flex gap-4 text-xs font-medium text-[#8C8680]">
          <span className="text-emerald-600">For: {Number(formatEther(votes[1])).toLocaleString()}</span>
          <span className="text-red-500">Against: {Number(formatEther(votes[0])).toLocaleString()}</span>
          <span>Abstain: {Number(formatEther(votes[2])).toLocaleString()}</span>
        </div>
      )}
    </Link>
  );
}
