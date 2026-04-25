"use client";

import Link from "next/link";
import { useState } from "react";
import { useAccount, useReadContract } from "wagmi";
import { formatEther } from "viem";
import {
  CONTRACTS,
  ProposalStateLabels,
  aidoDaoRegistryAbi,
  aidoGovernorAbi,
} from "@/lib/contracts";
import { IconChart, IconPlus, IconProposal, IconSparkle } from "@/components/icons";
import { useProposals, type Proposal } from "@/hooks/use-proposals";

const PAGE_SIZE = 10;

function shortAddress(value?: string) {
  if (!value) return "—";
  return `${value.slice(0, 6)}...${value.slice(-4)}`;
}

export default function ProposalsPage() {
  const { isConnected } = useAccount();
  const { data, isLoading: loading, error: queryError } = useProposals();
  const proposals = data?.proposals ?? [];
  const error = queryError ? "Failed to load proposals. Try refreshing." : null;

  const [page, setPage] = useState(0);
  const totalPages = Math.max(1, Math.ceil(proposals.length / PAGE_SIZE));
  const paged = proposals.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

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

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-[#EEEDF6]">Proposals</h1>
          <p className="mt-0.5 text-sm text-[#A8A3BC]">
            Browse governance proposals created directly on Monad.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          {isConnected && (
            <Link
              href="/proposals/create"
              className="inline-flex items-center gap-2 rounded-xl border border-[#2D2842] bg-[#161229] px-5 py-2.5 text-sm font-semibold text-[#EEEDF6] transition-all hover:bg-[#251D3F]"
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
        <div className="rounded-2xl border border-[#2D2842] bg-[#161229] p-6 shadow-sm">
          <div className="flex items-center gap-2">
            <IconProposal className="h-4 w-4 text-[#6C5CE7]" />
            <h2 className="text-base font-bold text-[#EEEDF6]">DAO Overview</h2>
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

        <div className="rounded-2xl border border-[#2D2842] bg-[#161229] p-6 shadow-sm">
          <div className="flex items-center gap-2">
            <IconChart className="h-4 w-4 text-[#6C5CE7]" />
            <h2 className="text-base font-bold text-[#EEEDF6]">Governance Settings</h2>
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
          <div className="rounded-2xl border border-[#2D2842] bg-[#161229] p-10 text-center shadow-sm">
            <p className="text-[#A8A3BC]">Loading proposals from Monad testnet...</p>
          </div>
        ) : error ? (
          <div className="rounded-2xl border border-red-500/25 bg-red-500/10 p-6 text-sm text-red-300">
            {error}
          </div>
        ) : proposals.length === 0 ? (
          <div className="rounded-2xl border border-[#2D2842] bg-[#161229] p-8 shadow-sm">
            <h3 className="text-lg font-bold text-[#EEEDF6]">No on-chain proposals yet</h3>
            <p className="mt-2 text-sm leading-relaxed text-[#A8A3BC]">
              The DAO is live, but this governor has not emitted any <code className="rounded bg-[#251D3F] px-1.5 py-0.5 text-[11px] text-[#EEEDF6]">ProposalCreated</code> events yet.
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
                className="rounded-xl border border-[#2D2842] bg-[#161229] px-5 py-2.5 text-sm font-semibold text-[#EEEDF6] transition-all hover:bg-[#251D3F]"
              >
                Setup Profile
              </Link>
            </div>

            <div className="mt-6 rounded-xl bg-[#1F1933] p-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-[#A8A3BC]">
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
                    className="rounded-lg border border-[#2D2842] bg-[#161229] px-3 py-2 text-xs"
                  >
                    <p className="font-semibold text-[#EEEDF6]">{label}</p>
                    <p className="mt-1 font-mono text-[#A8A3BC]">{shortAddress(value)}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <>
            {paged.map((proposal) => (
              <ProposalCard key={proposal.proposalId.toString()} proposal={proposal} />
            ))}

            {proposals.length > PAGE_SIZE && (
              <div className="flex items-center justify-center gap-3 pt-2">
                <button
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  disabled={page === 0}
                  className="rounded-lg border border-[#2D2842] bg-[#161229] px-3 py-1.5 text-xs font-semibold text-[#EEEDF6] transition-all hover:bg-[#251D3F] disabled:opacity-30"
                >
                  ← Prev
                </button>
                <span className="text-xs text-[#A8A3BC]">
                  Page {page + 1} of {totalPages}
                </span>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                  disabled={page >= totalPages - 1}
                  className="rounded-lg border border-[#2D2842] bg-[#161229] px-3 py-1.5 text-xs font-semibold text-[#EEEDF6] transition-all hover:bg-[#251D3F] disabled:opacity-30"
                >
                  Next →
                </button>
              </div>
            )}
          </>
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
    Active: "bg-emerald-500/10 text-emerald-300 border border-emerald-500/25",
    Succeeded: "bg-blue-500/10 text-blue-300 border border-blue-500/25",
    Defeated: "bg-red-500/10 text-red-300 border border-red-500/25",
    Pending: "bg-amber-500/10 text-amber-300 border border-amber-500/25",
    Executed: "bg-[#2A1F4D] text-[#6C5CE7] border border-[#6C5CE7]/20",
    Queued: "bg-sky-500/10 text-sky-300 border border-sky-500/25",
  };

  return (
    <Link
      href={`/proposals/${encodeURIComponent(proposal.proposalKey)}`}
      className="block rounded-2xl border border-[#2D2842] bg-[#161229] p-6 shadow-sm transition-all hover:border-[#6C5CE7]/30 hover:shadow-md"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <p className="font-bold text-[#EEEDF6]">{proposal.description}</p>
          <div className="mt-2 flex flex-wrap gap-3 text-xs text-[#A8A3BC]">
            <span>Proposal #{proposal.proposalId.toString()}</span>
            <span>By {shortAddress(proposal.proposer)}</span>
            <span>Start {proposal.voteStart.toString()}</span>
            <span>End {proposal.voteEnd.toString()}</span>
          </div>
        </div>
        <span
          className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
            stateColor[stateLabel] ?? "bg-[#251D3F] text-[#A8A3BC]"
          }`}
        >
          {stateLabel}
        </span>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-4 text-xs font-medium text-[#A8A3BC]">
        {votes && (
          <>
            <span className="text-emerald-300">
              For: {Number(formatEther(votes[1])).toLocaleString()}
            </span>
            <span className="text-red-500">
              Against: {Number(formatEther(votes[0])).toLocaleString()}
            </span>
            <span>Abstain: {Number(formatEther(votes[2])).toLocaleString()}</span>
          </>
        )}
        {proposal.analysis && (
          <span className="ml-auto inline-flex items-center gap-1 rounded-lg bg-[#6C5CE7]/10 px-2 py-0.5 text-[#6C5CE7]">
            <IconSparkle className="h-3 w-3" />
            AI: {proposal.analysis.recommendedVote}
            <span className={`ml-1 rounded px-1 py-px text-[9px] uppercase ${
              proposal.analysis.mode === "openai" ? "bg-emerald-500/15 text-emerald-300" : "bg-[#251D3F] text-[#A8A3BC]"
            }`}>
              {proposal.analysis.mode === "openai" ? "Live" : "Mock"}
            </span>
          </span>
        )}
      </div>
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
    <div className="rounded-xl bg-[#1F1933] px-4 py-3">
      <p className="text-xs font-semibold uppercase tracking-wider text-[#A8A3BC]">{label}</p>
      <p className={`mt-1 text-sm text-[#EEEDF6] ${mono ? "font-mono" : ""}`}>{value}</p>
    </div>
  );
}
