"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useAccount, useReadContract } from "wagmi";
import { createPublicClient, formatEther, http, parseAbiItem } from "viem";
import { monadTestnet } from "@/config";
import {
  CONTRACTS,
  DEPLOY_BLOCK,
  ProposalStateLabels,
  aidoDaoRegistryAbi,
  aidoGovernorAbi,
} from "@/lib/contracts";
import { IconChart, IconPlus, IconProposal } from "@/components/icons";

type Proposal = {
  proposalId: bigint;
  proposer: string;
  description: string;
  voteStart: bigint;
  voteEnd: bigint;
};

const client = createPublicClient({
  chain: monadTestnet,
  transport: http(),
});

function shortAddress(value?: string) {
  if (!value) return "—";
  return `${value.slice(0, 6)}...${value.slice(-4)}`;
}

export default function ProposalsPage() {
  const { isConnected } = useAccount();
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { data: daoInfo } = useReadContract({
    address: CONTRACTS.AIDO_DAO_REGISTRY,
    abi: aidoDaoRegistryAbi,
    functionName: "getDao",
    args: [CONTRACTS.AIDO_GOVERNOR],
  });

  const { data: votingDelay } = useReadContract({
    address: CONTRACTS.AIDO_GOVERNOR,
    abi: aidoGovernorAbi,
    functionName: "votingDelay",
  });

  const { data: votingPeriod } = useReadContract({
    address: CONTRACTS.AIDO_GOVERNOR,
    abi: aidoGovernorAbi,
    functionName: "votingPeriod",
  });

  const { data: proposalThreshold } = useReadContract({
    address: CONTRACTS.AIDO_GOVERNOR,
    abi: aidoGovernorAbi,
    functionName: "proposalThreshold",
  });

  useEffect(() => {
    async function fetchProposals() {
      setLoading(true);
      setError(null);

      try {
        const currentBlock = await client.getBlockNumber();
        const batchSize = 99n;

        const event = parseAbiItem(
          "event ProposalCreated(uint256 proposalId, address proposer, address[] targets, uint256[] values, string[] signatures, bytes[] calldatas, uint256 voteStart, uint256 voteEnd, string description)",
        );

        const allLogs = [];
        for (let from = DEPLOY_BLOCK; from <= currentBlock; from += batchSize + 1n) {
          const to = from + batchSize > currentBlock ? currentBlock : from + batchSize;
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
        setError("Failed to load on-chain proposals. Try refreshing again in a moment.");
      } finally {
        setLoading(false);
      }
    }

    fetchProposals();
  }, []);

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-[#1A1625]">Proposals</h1>
          <p className="mt-0.5 text-sm text-[#4F4862]">
            Browse governance proposals created directly on Monad.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          {isConnected && (
            <Link
              href="/proposals/create"
              className="inline-flex items-center gap-2 rounded-xl border border-[#DEDCE6] bg-white px-5 py-2.5 text-sm font-semibold text-[#1A1625] transition-all hover:bg-[#EEEDF4]"
            >
              <IconPlus className="h-4 w-4" />
              New Proposal
            </Link>
          )}
          <Link
            href="/dao/create"
            className="rounded-xl bg-[#6C5CE7] px-5 py-2.5 text-sm font-semibold text-white shadow-sm shadow-[#6C5CE7]/20 transition-all hover:bg-[#5B4FDB]"
          >
            Create DAO
          </Link>
        </div>
      </div>

      <div className="mt-8 grid gap-5 lg:grid-cols-[1.2fr_1fr]">
        <div className="rounded-2xl border border-[#DEDCE6] bg-white p-6 shadow-sm">
          <div className="flex items-center gap-2">
            <IconProposal className="h-4 w-4 text-[#6C5CE7]" />
            <h2 className="text-base font-bold text-[#1A1625]">DAO Overview</h2>
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <InfoRow label="DAO Name" value={daoInfo?.name ?? "AIDO Demo DAO"} />
            <InfoRow label="Governor" value={shortAddress(daoInfo?.governor ?? CONTRACTS.AIDO_GOVERNOR)} mono />
            <InfoRow label="Timelock" value={shortAddress(daoInfo?.timelock ?? CONTRACTS.TIMELOCK)} mono />
            <InfoRow label="Token" value={shortAddress(daoInfo?.token ?? CONTRACTS.AIDO_TOKEN)} mono />
            <InfoRow label="Creator" value={shortAddress(daoInfo?.creator)} mono />
            <InfoRow label="Metadata" value={daoInfo?.metadataURI || "Not set"} />
          </div>
        </div>

        <div className="rounded-2xl border border-[#DEDCE6] bg-white p-6 shadow-sm">
          <div className="flex items-center gap-2">
            <IconChart className="h-4 w-4 text-[#6C5CE7]" />
            <h2 className="text-base font-bold text-[#1A1625]">Governance Settings</h2>
          </div>
          <div className="mt-5 space-y-3">
            <InfoRow label="Voting delay" value={`${votingDelay?.toString() ?? "—"} blocks`} />
            <InfoRow label="Voting period" value={`${votingPeriod?.toString() ?? "—"} blocks`} />
            <InfoRow label="Proposal threshold" value={proposalThreshold?.toString() ?? "0"} />
            <InfoRow label="Proposals indexed" value={loading ? "Loading..." : proposals.length.toString()} />
          </div>
        </div>
      </div>

      <div className="mt-8 space-y-4">
        {loading ? (
          <div className="rounded-2xl border border-[#DEDCE6] bg-white p-10 text-center shadow-sm">
            <p className="text-[#4F4862]">Loading proposals from Monad testnet...</p>
          </div>
        ) : error ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">
            {error}
          </div>
        ) : proposals.length === 0 ? (
          <div className="rounded-2xl border border-[#DEDCE6] bg-white p-8 shadow-sm">
            <h3 className="text-lg font-bold text-[#1A1625]">No on-chain proposals yet</h3>
            <p className="mt-2 text-sm leading-relaxed text-[#4F4862]">
              The DAO is live, but this governor has not emitted any <code className="rounded bg-[#EEEDF4] px-1.5 py-0.5 text-[11px] text-[#1A1625]">ProposalCreated</code> events yet.
              You can create the first proposal from the dashboard.
            </p>

            <div className="mt-5 flex flex-wrap gap-3">
              <Link
                href="/proposals/create"
                className="rounded-xl bg-[#6C5CE7] px-5 py-2.5 text-sm font-semibold text-white shadow-sm shadow-[#6C5CE7]/20 transition-all hover:bg-[#5B4FDB]"
              >
                Create First Proposal
              </Link>
              <Link
                href="/profile"
                className="rounded-xl border border-[#DEDCE6] bg-white px-5 py-2.5 text-sm font-semibold text-[#1A1625] transition-all hover:bg-[#EEEDF4]"
              >
                Setup Profile
              </Link>
            </div>

            <div className="mt-6 rounded-xl bg-[#F8F7F4] p-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-[#4F4862]">
                Available governance modules
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {[
                  ["Treasury", CONTRACTS.TREASURY_MODULE],
                  ["Risk", CONTRACTS.RISK_MODULE],
                  ["Governance", CONTRACTS.GOVERNANCE_MODULE],
                  ["Operations", CONTRACTS.OPERATIONS_MODULE],
                  ["Emissions", CONTRACTS.EMISSIONS_MODULE],
                  ["Growth", CONTRACTS.GROWTH_MODULE],
                  ["Partnerships", CONTRACTS.PARTNERSHIPS_MODULE],
                ].map(([label, value]) => (
                  <div
                    key={label}
                    className="rounded-lg border border-[#DEDCE6] bg-white px-3 py-2 text-xs"
                  >
                    <p className="font-semibold text-[#1A1625]">{label}</p>
                    <p className="mt-1 font-mono text-[#4F4862]">{shortAddress(value)}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          proposals.map((proposal) => (
            <ProposalCard key={proposal.proposalId.toString()} proposal={proposal} />
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

  const stateLabel = state !== undefined ? ProposalStateLabels[Number(state)] ?? "Unknown" : "...";
  const stateColor: Record<string, string> = {
    Active: "bg-emerald-50 text-emerald-700 border border-emerald-200",
    Succeeded: "bg-blue-50 text-blue-700 border border-blue-200",
    Defeated: "bg-red-50 text-red-700 border border-red-200",
    Pending: "bg-amber-50 text-amber-700 border border-amber-200",
    Executed: "bg-[#EDE8FF] text-[#6C5CE7] border border-[#6C5CE7]/20",
    Queued: "bg-sky-50 text-sky-700 border border-sky-200",
  };

  return (
    <Link
      href={`/proposals/${proposal.proposalId.toString()}`}
      className="block rounded-2xl border border-[#DEDCE6] bg-white p-6 shadow-sm transition-all hover:border-[#6C5CE7]/30 hover:shadow-md"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <p className="font-bold text-[#1A1625]">{proposal.description}</p>
          <div className="mt-2 flex flex-wrap gap-3 text-xs text-[#4F4862]">
            <span>Proposal #{proposal.proposalId.toString()}</span>
            <span>By {shortAddress(proposal.proposer)}</span>
            <span>Start {proposal.voteStart.toString()}</span>
            <span>End {proposal.voteEnd.toString()}</span>
          </div>
        </div>
        <span
          className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
            stateColor[stateLabel] ?? "bg-[#EEEDF4] text-[#4F4862]"
          }`}
        >
          {stateLabel}
        </span>
      </div>

      {votes && (
        <div className="mt-4 flex flex-wrap gap-4 text-xs font-medium text-[#4F4862]">
          <span className="text-emerald-600">
            For: {Number(formatEther(votes[1])).toLocaleString()}
          </span>
          <span className="text-red-500">
            Against: {Number(formatEther(votes[0])).toLocaleString()}
          </span>
          <span>Abstain: {Number(formatEther(votes[2])).toLocaleString()}</span>
        </div>
      )}
    </Link>
  );
}

function InfoRow({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="rounded-xl bg-[#F8F7F4] px-4 py-3">
      <p className="text-xs font-semibold uppercase tracking-wider text-[#4F4862]">{label}</p>
      <p className={`mt-1 text-sm text-[#1A1625] ${mono ? "font-mono" : ""}`}>{value}</p>
    </div>
  );
}
