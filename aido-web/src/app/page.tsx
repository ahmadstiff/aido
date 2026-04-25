"use client";

import Link from "next/link";
import { useAccount, useReadContract } from "wagmi";
import { formatEther } from "viem";
import {
  CONTRACTS, aidoTokenAbi, monadVoterRegistryAbi,
  RiskProfileLabels,
} from "@/lib/contracts";
import { IconToken, IconVotePower, IconAgent, IconProposal, IconPlus, IconSparkle } from "@/components/icons";
import { DecoratedCard } from "@/components/decorated-card";

export default function Home() {
  const { address, isConnected } = useAccount();

  const { data: balance } = useReadContract({
    address: CONTRACTS.AIDO_TOKEN,
    abi: aidoTokenAbi,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  });

  const { data: votes } = useReadContract({
    address: CONTRACTS.AIDO_TOKEN,
    abi: aidoTokenAbi,
    functionName: "getVotes",
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  });

  const { data: delegates } = useReadContract({
    address: CONTRACTS.AIDO_TOKEN,
    abi: aidoTokenAbi,
    functionName: "delegates",
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  });

  const { data: userConfig } = useReadContract({
    address: CONTRACTS.MONAD_VOTER_REGISTRY,
    abi: monadVoterRegistryAbi,
    functionName: "getUserConfig",
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  });

  if (!isConnected) {
    return (
      <div className="flex flex-1 items-center justify-center px-4">
        <div className="text-center max-w-md">
          <div className="mx-auto mb-6 h-16 w-16 rounded-2xl bg-[#6C5CE7] flex items-center justify-center shadow-lg shadow-[#6C5CE7]/20">
            <IconSparkle className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-4xl font-extrabold tracking-tight text-[#1A1613]">
            Welcome to AIDO
          </h1>
          <p className="mt-3 text-[15px] leading-relaxed text-[#8C8680]">
            AI-Powered Governance Agent for Monad.
            Analyze proposals, set your risk profile, and let AI vote for you.
          </p>
          <div className="mt-8 flex justify-center">
            <appkit-button />
          </div>
        </div>
      </div>
    );
  }

  const hasDelegated = delegates && delegates !== "0x0000000000000000000000000000000000000000";
  const isRegistered = userConfig && userConfig.delegatedAgent !== "0x0000000000000000000000000000000000000000";

  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-6 py-10">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-[#1A1613]">Dashboard</h1>
          <p className="mt-0.5 text-sm text-[#8C8680]">Your governance overview</p>
        </div>
      </div>

      <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {/* Token Balance */}
        <DecoratedCard
          accent="violet"
          pattern="hexagon"
          secondaryPattern="shiny"
          contentClassName="p-6"
        >
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wider text-[#8C8680]">AIDO Balance</p>
            <div className="h-8 w-8 rounded-lg bg-[#6C5CE7]/10 flex items-center justify-center">
              <IconToken className="w-4 h-4 text-[#6C5CE7]" />
            </div>
          </div>
          <p className="mt-2 text-3xl font-extrabold text-[#1A1613]">
            {balance ? Number(formatEther(balance)).toLocaleString() : "0"}
          </p>
          <p className="mt-1 text-xs text-[#8C8680]">governance tokens</p>
        </DecoratedCard>

        {/* Voting Power */}
        <DecoratedCard
          accent="amber"
          pattern="meteor"
          secondaryPattern="shiny"
          contentClassName="p-6"
        >
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wider text-[#8C8680]">Voting Power</p>
            <div className="h-8 w-8 rounded-lg bg-[#FEF3E2] flex items-center justify-center">
              <IconVotePower className="w-4 h-4 text-[#D97706]" />
            </div>
          </div>
          <p className="mt-2 text-3xl font-extrabold text-[#1A1613]">
            {votes ? Number(formatEther(votes)).toLocaleString() : "0"}
          </p>
          {!hasDelegated && balance && balance > 0n ? (
            <p className="mt-1 text-xs font-medium text-[#B45309]">⚠ Delegate to activate</p>
          ) : (
            <p className="mt-1 text-xs text-[#8C8680]">active voting weight</p>
          )}
        </DecoratedCard>

        {/* AI Agent Status */}
        <DecoratedCard
          accent="emerald"
          pattern="wave"
          secondaryPattern="shiny"
          contentClassName="p-6"
        >
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wider text-[#8C8680]">AI Agent</p>
            <div className="h-8 w-8 rounded-lg bg-[#ECFAEF] flex items-center justify-center">
              <IconAgent className="w-4 h-4 text-[#059669]" />
            </div>
          </div>
          {isRegistered ? (
            <>
              <p className="mt-2 text-xl font-extrabold text-[#1A1613]">
                {RiskProfileLabels[userConfig.riskProfile] ?? "Unknown"}
              </p>
              <div className="mt-1.5 flex items-center gap-1.5">
                <span className={`h-2 w-2 rounded-full ${userConfig.isAutoPilot ? "bg-[#10B981]" : "bg-[#E2DFD9]"}`} />
                <span className="text-xs text-[#8C8680]">Auto-Pilot {userConfig.isAutoPilot ? "On" : "Off"}</span>
              </div>
            </>
          ) : (
            <>
              <p className="mt-2 text-xl font-extrabold text-[#C4BFB8]">Not Set</p>
              <p className="mt-1 text-xs text-[#8C8680]">configure your agent</p>
            </>
          )}
        </DecoratedCard>
      </div>

      {/* Actions */}
      <div className="mt-10 flex flex-wrap gap-3">
        <Link
          href="/profile"
          className="rounded-xl bg-[#6C5CE7] px-5 py-2.5 text-sm font-semibold text-white shadow-sm shadow-[#6C5CE7]/20 hover:bg-[#5B4FDB] transition-all"
        >
          {isRegistered ? "Edit Profile" : "Setup AI Agent"}
        </Link>
        <Link
          href="/proposals"
          className="inline-flex items-center gap-2 rounded-xl border border-[#E2DFD9] bg-white px-5 py-2.5 text-sm font-semibold text-[#1A1613] hover:bg-[#F0EEEB] transition-all"
        >
          <IconProposal className="w-4 h-4" />
          View Proposals
        </Link>
        <Link
          href="/proposals/create"
          className="inline-flex items-center gap-2 rounded-xl border border-[#E2DFD9] bg-white px-5 py-2.5 text-sm font-semibold text-[#1A1613] hover:bg-[#F0EEEB] transition-all"
        >
          <IconPlus className="w-4 h-4" />
          Create Proposal
        </Link>
      </div>
    </div>
  );
}
