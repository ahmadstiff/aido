"use client";

import { use, useEffect, useState } from "react";
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { createPublicClient, formatEther, http, parseAbiItem } from "viem";
import { monadTestnet } from "@/config";
import { CONTRACTS, DEPLOY_BLOCK, aidoGovernorAbi, ProposalStateLabels } from "@/lib/contracts";
import { IconVoteFor, IconVoteAgainst, IconAbstain, IconSparkle, IconChart, IconAgent } from "@/components/icons";
import {
  fetchProposal as fetchBackendProposal,
  reanalyzeProposal,
  voteOnchain,
  explorerTxUrl,
  type ProposalAnalysis,
  type OnchainVoteRecord,
  type RecommendedVote,
  type BackendProposal,
} from "@/lib/api";

export default function ProposalDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: rawId } = use(params);
  const proposalKey = decodeURIComponent(rawId);
  const numericId = proposalKey.includes(":") ? proposalKey.split(":")[1] : proposalKey;
  const proposalId = BigInt(numericId);

  const { address, isConnected } = useAccount();
  const { writeContract, data: txHash, isPending } = useWriteContract();
  const { isSuccess: txConfirmed } = useWaitForTransactionReceipt({ hash: txHash });

  const { data: state } = useReadContract({
    address: CONTRACTS.AIDO_GOVERNOR, abi: aidoGovernorAbi,
    functionName: "state", args: [proposalId],
  });
  const { data: votes } = useReadContract({
    address: CONTRACTS.AIDO_GOVERNOR, abi: aidoGovernorAbi,
    functionName: "proposalVotes", args: [proposalId],
  });
  const { data: hasVoted } = useReadContract({
    address: CONTRACTS.AIDO_GOVERNOR, abi: aidoGovernorAbi,
    functionName: "hasVoted",
    args: address ? [proposalId, address] : undefined,
    query: { enabled: !!address },
  });
  const { data: onchainProposer } = useReadContract({
    address: CONTRACTS.AIDO_GOVERNOR, abi: aidoGovernorAbi,
    functionName: "proposalProposer", args: [proposalId],
  });
  const { data: deadline } = useReadContract({
    address: CONTRACTS.AIDO_GOVERNOR, abi: aidoGovernorAbi,
    functionName: "proposalDeadline", args: [proposalId],
  });

  type VoteCastEntry = { voter: string; support: number; weight: bigint; reason: string; txHash: string };
  const [voteHistory, setVoteHistory] = useState<VoteCastEntry[]>([]);
  const [voteHistoryLoading, setVoteHistoryLoading] = useState(true);
  const [backendData, setBackendData] = useState<BackendProposal | null>(null);
  const [analysis, setAnalysis] = useState<ProposalAnalysis | null>(null);
  const [agentVotes, setAgentVotes] = useState<OnchainVoteRecord[]>([]);
  const [analysisLoading, setAnalysisLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshError, setRefreshError] = useState<string | null>(null);
  const [agentVoting, setAgentVoting] = useState(false);
  const [agentVoteResult, setAgentVoteResult] = useState<string | null>(null);
  const [agentVoteError, setAgentVoteError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const bp = await fetchBackendProposal(proposalKey);
        setBackendData(bp);
        if (bp?.analysis) setAnalysis(bp.analysis);
        if (bp?.onchainVotes) setAgentVotes(bp.onchainVotes);
      } catch { /* backend unavailable */ }
      finally { setAnalysisLoading(false); }
    })();
  }, [proposalKey]);

  // Fetch on-chain VoteCast events for this proposal
  useEffect(() => {
    const rpcClient = createPublicClient({ chain: monadTestnet, transport: http() });
    const event = parseAbiItem(
      "event VoteCast(address indexed voter, uint256 proposalId, uint8 support, uint256 weight, string reason)",
    );
    (async () => {
      try {
        const currentBlock = await rpcClient.getBlockNumber();
        const batchSize = 99n;
        const all: VoteCastEntry[] = [];
        for (let from = DEPLOY_BLOCK; from <= currentBlock; from += batchSize + 1n) {
          const to = from + batchSize > currentBlock ? currentBlock : from + batchSize;
          const logs = await rpcClient.getLogs({
            address: CONTRACTS.AIDO_GOVERNOR,
            event,
            fromBlock: from,
            toBlock: to,
          });
          for (const log of logs) {
            if (log.args.proposalId?.toString() === numericId) {
              all.push({
                voter: log.args.voter!,
                support: Number(log.args.support!),
                weight: log.args.weight!,
                reason: log.args.reason ?? "",
                txHash: log.transactionHash ?? "",
              });
            }
          }
        }
        setVoteHistory(all);
      } catch { /* RPC error */ }
      finally { setVoteHistoryLoading(false); }
    })();
  }, [numericId]);

  const handleRefreshAI = async () => {
    setRefreshing(true); setRefreshError(null);
    try {
      const u = await reanalyzeProposal(proposalKey, { requireLive: true });
      setAnalysis(u.analysis);
      if (u.onchainVotes) setAgentVotes(u.onchainVotes);
    } catch (e) { setRefreshError(e instanceof Error ? e.message : "AI refresh failed"); }
    finally { setRefreshing(false); }
  };

  const handleAgentVote = async (support: RecommendedVote) => {
    setAgentVoting(true); setAgentVoteError(null); setAgentVoteResult(null);
    try {
      const r = await voteOnchain({ proposalKey, proposalId: numericId, support });
      const last = r.onchainVotes?.at(-1);
      if (last?.txHash) setAgentVoteResult(last.txHash);
      if (r.onchainVotes) setAgentVotes(r.onchainVotes);
    } catch (e) { setAgentVoteError(e instanceof Error ? e.message : "Agent vote failed"); }
    finally { setAgentVoting(false); }
  };

  const handleUserVote = (support: number) => {
    writeContract({
      address: CONTRACTS.AIDO_GOVERNOR, abi: aidoGovernorAbi,
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
  const proposerAddr = backendData?.proposer ?? onchainProposer;

  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6 py-10 space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-[#A8A3BC]">Proposal</p>
          {backendData?.title && <h1 className="mt-1 text-lg font-bold text-[#EEEDF6]">{backendData.title}</h1>}
          <p className="mt-1 text-[11px] font-mono text-[#A8A3BC] break-all">{proposalKey}</p>
        </div>
        <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${
          isActive ? "bg-emerald-500/10 text-emerald-300 border border-emerald-500/25" : "bg-[#251D3F] text-[#A8A3BC]"
        }`}>{stateLabel}</span>
      </div>

      {proposerAddr && (
        <p className="text-sm text-[#A8A3BC]">
          Proposed by: <code className="rounded-md bg-[#251D3F] px-1.5 py-0.5 font-mono text-[11px] text-[#EEEDF6]">{proposerAddr}</code>
        </p>
      )}
      {deadline && <p className="text-sm text-[#A8A3BC]">Deadline block: {deadline.toString()}</p>}
      {backendData?.description && !backendData?.title && (
        <p className="text-sm text-[#EEEDF6]/80 leading-relaxed">{backendData.description}</p>
      )}

      {/* Vote Results */}
      <div className="rounded-2xl bg-[#161229] border border-[#2D2842] p-6 shadow-sm">
        <div className="flex items-center gap-2">
          <IconChart className="w-4 h-4 text-[#6C5CE7]" />
          <h2 className="text-base font-bold text-[#EEEDF6]">Vote Results</h2>
        </div>
        <div className="mt-5 space-y-4">
          <VoteBar label="For" votes={forVotes} total={totalVotes} color="bg-emerald-500" />
          <VoteBar label="Against" votes={againstVotes} total={totalVotes} color="bg-red-400" />
          <VoteBar label="Abstain" votes={abstainVotes} total={totalVotes} color="bg-[#8D86A3]" />
        </div>
        <p className="mt-4 text-xs text-[#A8A3BC]">Total votes: {totalVotes.toLocaleString()} AIDO</p>
      </div>

      {/* AI Analysis */}
      <div className="rounded-2xl border border-[#6C5CE7]/15 bg-[#2A1F4D]/40 p-6">
        <div className="flex items-center gap-2">
          <IconSparkle className="w-4 h-4 text-[#6C5CE7]" />
          <h2 className="text-base font-bold text-[#6C5CE7]">AI Agent Analysis</h2>
          {analysis && (
            <span className={`ml-auto rounded-md px-2 py-0.5 text-[10px] uppercase tracking-wider ${
              analysis.mode === "openai" ? "bg-emerald-500/15 text-emerald-300" : "bg-[#251D3F] text-[#A8A3BC]"
            }`}>{analysis.mode === "openai" ? "Live AI" : "Mock"}</span>
          )}
        </div>

        {analysisLoading ? (
          <p className="mt-3 text-sm text-[#6C5CE7]/50">Fetching AI analysis...</p>
        ) : analysis ? (
          <>
            <p className="mt-3 text-sm text-[#EEEDF6]/80 leading-relaxed">{analysis.summary}</p>
            <p className="mt-2 text-sm text-[#A8A3BC] leading-relaxed">{analysis.reasoning}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              <span className={`rounded-lg px-2.5 py-1 text-xs font-semibold ${
                analysis.recommendedVote === "FOR" ? "bg-emerald-500/10 text-emerald-300"
                  : analysis.recommendedVote === "AGAINST" ? "bg-red-500/10 text-red-300"
                    : "bg-[#251D3F] text-[#A8A3BC]"
              }`}>Recommendation: {analysis.recommendedVote}</span>
              <span className="rounded-lg bg-[#6C5CE7]/10 px-2.5 py-1 text-xs font-medium text-[#6C5CE7]">Risk: {analysis.riskScore}/10</span>
              <span className="rounded-lg bg-[#6C5CE7]/10 px-2.5 py-1 text-xs font-medium text-[#6C5CE7]">Alignment: {analysis.alignmentScore}/10</span>
            </div>
          </>
        ) : (
          <p className="mt-2 text-sm text-[#6C5CE7]/60 leading-relaxed">
            Connect backend to see AI analysis, recommendation, and risk assessment.
          </p>
        )}

        <button onClick={handleRefreshAI} disabled={refreshing}
          className="mt-4 rounded-xl border border-[#6C5CE7]/25 bg-[#6C5CE7]/10 px-4 py-2 text-xs font-semibold text-[#6C5CE7] transition-all hover:bg-[#6C5CE7]/20 disabled:opacity-40">
          {refreshing ? "Refreshing..." : "↻ Refresh AI Analysis"}
        </button>
        {refreshError && <p className="mt-2 text-xs text-red-400">{refreshError}</p>}
      </div>

      {/* Vote via Agent */}
      <div className="rounded-2xl bg-[#161229] border border-[#2D2842] p-6 shadow-sm">
        <div className="flex items-center gap-2">
          <IconAgent className="w-4 h-4 text-[#6C5CE7]" />
          <h2 className="text-base font-bold text-[#EEEDF6]">Vote via AI Agent</h2>
          {!isActive && <span className="ml-auto rounded-md bg-[#251D3F] px-2 py-0.5 text-[10px] uppercase text-[#A8A3BC]">Voting closed</span>}
        </div>
        <p className="mt-1 text-xs text-[#A8A3BC]">Executed by the backend agent wallet, not your connected wallet.</p>
        <div className="mt-4 flex gap-3">
          {(["FOR", "AGAINST", "ABSTAIN"] as RecommendedVote[]).map((s) => (
            <button key={s} onClick={() => handleAgentVote(s)} disabled={agentVoting || !isActive}
              className={`flex-1 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all disabled:opacity-40 ${
                s === "FOR" ? "bg-emerald-500 text-white hover:bg-emerald-600"
                  : s === "AGAINST" ? "bg-red-400 text-white hover:bg-red-500"
                    : "border border-[#2D2842] bg-[#161229] text-[#EEEDF6] hover:bg-[#251D3F]"
              }`}>
              {agentVoting ? "..." : `Agent: ${s}`}
            </button>
          ))}
        </div>
        {agentVoteResult && (
          <p className="mt-3 text-xs text-emerald-300">
            Agent voted! <a href={explorerTxUrl(agentVoteResult)} target="_blank" rel="noopener noreferrer" className="underline">View tx ↗</a>
          </p>
        )}
        {agentVoteError && <p className="mt-3 text-xs text-red-400">{agentVoteError}</p>}
      </div>

      {/* User Wallet Vote */}
      <div className="rounded-2xl bg-[#161229] border border-[#2D2842] p-6 shadow-sm">
        <div className="flex items-center gap-2">
          <IconVoteFor className="w-4 h-4 text-[#6C5CE7]" />
          <h2 className="text-base font-bold text-[#EEEDF6]">Vote from Your Wallet</h2>
          {!isActive && <span className="ml-auto rounded-md bg-[#251D3F] px-2 py-0.5 text-[10px] uppercase text-[#A8A3BC]">Voting closed</span>}
          {hasVoted && <span className="ml-auto rounded-md bg-emerald-500/10 px-2 py-0.5 text-[10px] uppercase text-emerald-300">Voted</span>}
        </div>
        <p className="mt-1 text-xs text-[#A8A3BC]">
          {!isConnected ? "Connect your wallet to vote." : hasVoted ? "You have already voted on this proposal." : "Sends a transaction directly from your connected wallet."}
        </p>
        <div className="mt-4 flex gap-3">
          <button onClick={() => handleUserVote(1)} disabled={isPending || !isActive || !isConnected || Boolean(hasVoted)}
            className="flex-1 rounded-xl bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-600 transition-all disabled:opacity-40">
            {isPending ? "..." : <><IconVoteFor className="w-4 h-4 inline mr-1.5" />For</>}
          </button>
          <button onClick={() => handleUserVote(0)} disabled={isPending || !isActive || !isConnected || Boolean(hasVoted)}
            className="flex-1 rounded-xl bg-red-400 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-500 transition-all disabled:opacity-40">
            {isPending ? "..." : <><IconVoteAgainst className="w-4 h-4 inline mr-1.5" />Against</>}
          </button>
          <button onClick={() => handleUserVote(2)} disabled={isPending || !isActive || !isConnected || Boolean(hasVoted)}
            className="flex-1 rounded-xl border border-[#2D2842] bg-[#161229] px-4 py-2.5 text-sm font-semibold text-[#EEEDF6] hover:bg-[#251D3F] transition-all disabled:opacity-40">
            {isPending ? "..." : <><IconAbstain className="w-4 h-4 inline mr-1.5" />Abstain</>}
          </button>
        </div>
        {txConfirmed && (
          <p className="mt-3 text-center text-sm font-medium text-emerald-300">
            Vote cast!{" "}{txHash && <a href={explorerTxUrl(txHash)} target="_blank" rel="noopener noreferrer" className="underline">View tx ↗</a>}
          </p>
        )}
      </div>

      {/* On-chain Vote History */}
      <div className="rounded-2xl bg-[#161229] border border-[#2D2842] p-6 shadow-sm">
        <div className="flex items-center gap-2">
          <IconChart className="w-4 h-4 text-[#6C5CE7]" />
          <h2 className="text-base font-bold text-[#EEEDF6]">Vote History</h2>
          <span className="ml-auto text-xs text-[#A8A3BC]">{voteHistory.length} votes</span>
        </div>
        {voteHistoryLoading ? (
          <p className="mt-4 text-sm text-[#A8A3BC]">Loading vote history...</p>
        ) : voteHistory.length === 0 ? (
          <p className="mt-4 text-sm text-[#A8A3BC]">No votes recorded yet.</p>
        ) : (
          <div className="mt-4 space-y-3">
            {voteHistory.map((v, i) => {
              const supportLabel = v.support === 1 ? "FOR" : v.support === 0 ? "AGAINST" : "ABSTAIN";
              const supportColor = v.support === 1 ? "text-emerald-300" : v.support === 0 ? "text-red-400" : "text-[#A8A3BC]";
              return (
                <div key={i} className="rounded-xl bg-[#1F1933] px-4 py-3 text-sm">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className={`font-semibold ${supportColor}`}>{supportLabel}</span>
                      <span className="text-xs text-[#A8A3BC]">{Number(formatEther(v.weight)).toLocaleString()} AIDO</span>
                    </div>
                    {v.txHash && (
                      <a href={explorerTxUrl(v.txHash)} target="_blank" rel="noopener noreferrer"
                        className="font-mono text-xs text-[#6C5CE7] hover:underline">
                        {v.txHash.slice(0, 10)}...{v.txHash.slice(-6)} ↗
                      </a>
                    )}
                  </div>
                  <p className="mt-1 text-[10px] font-mono text-[#A8A3BC]/60">{v.voter}</p>
                  {v.reason && <p className="mt-1 text-xs text-[#A8A3BC]">{v.reason}</p>}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function VoteBar({ label, votes, total, color }: { label: string; votes: number; total: number; color: string }) {
  const pct = total > 0 ? (votes / total) * 100 : 0;
  return (
    <div>
      <div className="flex justify-between text-sm">
        <span className="font-medium text-[#EEEDF6]">{label}</span>
        <span className="text-[#A8A3BC]">{votes.toLocaleString()} ({pct.toFixed(1)}%)</span>
      </div>
      <div className="mt-1.5 h-2 rounded-full bg-[#251D3F]">
        <div className={`h-2 rounded-full ${color} transition-all`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
