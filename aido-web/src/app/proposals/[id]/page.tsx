"use client";

import { use } from "react";
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { formatEther } from "viem";
import { CONTRACTS, aidoGovernorAbi, ProposalStateLabels } from "@/lib/contracts";
import { IconVoteFor, IconVoteAgainst, IconAbstain, IconSparkle, IconChart } from "@/components/icons";

export default function ProposalDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const proposalId = BigInt(id);
  const { address, isConnected } = useAccount();
  const { writeContract, data: txHash, isPending } = useWriteContract();
  const { isSuccess: txConfirmed } = useWaitForTransactionReceipt({ hash: txHash });

  const { data: state } = useReadContract({
    address: CONTRACTS.AIDO_GOVERNOR,
    abi: aidoGovernorAbi,
    functionName: "state",
    args: [proposalId],
  });

  const { data: votes, refetch: refetchVotes } = useReadContract({
    address: CONTRACTS.AIDO_GOVERNOR,
    abi: aidoGovernorAbi,
    functionName: "proposalVotes",
    args: [proposalId],
  });

  const { data: hasVoted } = useReadContract({
    address: CONTRACTS.AIDO_GOVERNOR,
    abi: aidoGovernorAbi,
    functionName: "hasVoted",
    args: address ? [proposalId, address] : undefined,
    query: { enabled: !!address },
  });

  const { data: proposer } = useReadContract({
    address: CONTRACTS.AIDO_GOVERNOR,
    abi: aidoGovernorAbi,
    functionName: "proposalProposer",
    args: [proposalId],
  });

  const { data: deadline } = useReadContract({
    address: CONTRACTS.AIDO_GOVERNOR,
    abi: aidoGovernorAbi,
    functionName: "proposalDeadline",
    args: [proposalId],
  });

  const handleVote = (support: number) => {
    writeContract({
      address: CONTRACTS.AIDO_GOVERNOR,
      abi: aidoGovernorAbi,
      functionName: "castVoteWithReason",
      args: [proposalId, support, "Voted via AIDO dashboard"],
    });
  };

  const stateLabel = state !== undefined ? ProposalStateLabels[state] ?? "Unknown" : "Loading...";
  const isActive = state === 1;

  const forVotes = votes ? Number(formatEther(votes[1])) : 0;
  const againstVotes = votes ? Number(formatEther(votes[0])) : 0;
  const abstainVotes = votes ? Number(formatEther(votes[2])) : 0;
  const totalVotes = forVotes + againstVotes + abstainVotes;

  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6 py-10">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-[#8C8680]">Proposal ID</p>
          <p className="mt-1 text-[11px] font-mono text-[#8C8680] break-all">{id}</p>
        </div>
        <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${
          isActive ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-[#F0EEEB] text-[#8C8680]"
        }`}>
          {stateLabel}
        </span>
      </div>

      {proposer && (
        <p className="mt-4 text-sm text-[#8C8680]">
          Proposed by: <code className="rounded-md bg-[#F0EEEB] px-1.5 py-0.5 font-mono text-[11px] text-[#1A1613]">{proposer}</code>
        </p>
      )}
      {deadline && (
        <p className="text-sm text-[#8C8680]">
          Deadline block: {deadline.toString()}
        </p>
      )}

      {/* Vote Counts */}
      <div className="mt-6 rounded-2xl bg-white border border-[#E2DFD9] p-6 shadow-sm">
        <div className="flex items-center gap-2">
          <IconChart className="w-4 h-4 text-[#6C5CE7]" />
          <h2 className="text-base font-bold text-[#1A1613]">Vote Results</h2>
        </div>
        <div className="mt-5 space-y-4">
          <VoteBar label="For" votes={forVotes} total={totalVotes} color="bg-emerald-500" />
          <VoteBar label="Against" votes={againstVotes} total={totalVotes} color="bg-red-400" />
          <VoteBar label="Abstain" votes={abstainVotes} total={totalVotes} color="bg-[#C4BFB8]" />
        </div>
        <p className="mt-4 text-xs text-[#8C8680]">
          Total votes: {totalVotes.toLocaleString()} AIDO
        </p>
      </div>

      {/* AI Analysis Placeholder */}
      <div className="mt-4 rounded-2xl border border-[#6C5CE7]/15 bg-[#EDE8FF]/40 p-6">
        <div className="flex items-center gap-2">
          <IconSparkle className="w-4 h-4 text-[#6C5CE7]" />
          <h2 className="text-base font-bold text-[#6C5CE7]">AI Agent Analysis</h2>
        </div>
        <p className="mt-2 text-sm text-[#6C5CE7]/60 leading-relaxed">
          AI analysis will appear here when the backend is connected. The agent will analyze the proposal
          based on your risk profile and provide a recommendation.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <span className="rounded-lg bg-[#6C5CE7]/10 px-2.5 py-1 text-xs font-medium text-[#6C5CE7]">Risk Assessment: Pending</span>
          <span className="rounded-lg bg-[#6C5CE7]/10 px-2.5 py-1 text-xs font-medium text-[#6C5CE7]">Recommendation: Pending</span>
        </div>
      </div>

      {/* Vote Buttons */}
      {isConnected && isActive && !hasVoted && (
        <div className="mt-4 rounded-2xl bg-white border border-[#E2DFD9] p-6 shadow-sm">
          <h2 className="text-base font-bold text-[#1A1613]">Cast Your Vote</h2>
          <div className="mt-4 flex gap-3">
            <button
              onClick={() => handleVote(1)}
              disabled={isPending}
              className="flex-1 rounded-xl bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-600 transition-all disabled:opacity-40"
            >
              {isPending ? "..." : <><IconVoteFor className="w-4 h-4 inline mr-1.5" />Vote For</>}
            </button>
            <button
              onClick={() => handleVote(0)}
              disabled={isPending}
              className="flex-1 rounded-xl bg-red-400 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-500 transition-all disabled:opacity-40"
            >
              {isPending ? "..." : <><IconVoteAgainst className="w-4 h-4 inline mr-1.5" />Vote Against</>}
            </button>
            <button
              onClick={() => handleVote(2)}
              disabled={isPending}
              className="flex-1 rounded-xl border border-[#E2DFD9] bg-white px-4 py-2.5 text-sm font-semibold text-[#1A1613] hover:bg-[#F0EEEB] transition-all disabled:opacity-40"
            >
              {isPending ? "..." : <><IconAbstain className="w-4 h-4 inline mr-1.5" />Abstain</>}
            </button>
          </div>
          {txConfirmed && (
            <p className="mt-3 text-center text-sm font-medium text-emerald-600">Vote cast successfully!</p>
          )}
        </div>
      )}

      {hasVoted && (
        <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-center">
          <p className="text-sm font-medium text-emerald-700">You have already voted on this proposal.</p>
        </div>
      )}
    </div>
  );
}

function VoteBar({ label, votes, total, color }: { label: string; votes: number; total: number; color: string }) {
  const pct = total > 0 ? (votes / total) * 100 : 0;
  return (
    <div>
      <div className="flex justify-between text-sm">
        <span className="font-medium text-[#1A1613]">{label}</span>
        <span className="text-[#8C8680]">{votes.toLocaleString()} ({pct.toFixed(1)}%)</span>
      </div>
      <div className="mt-1.5 h-2 rounded-full bg-[#F0EEEB]">
        <div className={`h-2 rounded-full ${color} transition-all`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
