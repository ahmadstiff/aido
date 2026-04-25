"use client";

import Link from "next/link";
import { use } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchDao, fetchProposals, explorerAddressUrl, type BackendProposal } from "@/lib/api";
import { IconProposal, IconChart, IconSparkle } from "@/components/icons";

function shortAddress(value?: string) {
  if (!value) return "—";
  return `${value.slice(0, 6)}...${value.slice(-4)}`;
}

export default function DaoDetailPage({ params }: { params: Promise<{ governorAddress: string }> }) {
  const { governorAddress } = use(params);

  const { data: dao, isLoading: daoLoading, error: daoError } = useQuery({
    queryKey: ["dao", governorAddress],
    queryFn: () => fetchDao(governorAddress),
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });

  const { data: proposalsData, isLoading: proposalsLoading } = useQuery({
    queryKey: ["proposals", governorAddress],
    queryFn: () => fetchProposals(governorAddress),
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });

  const proposals = proposalsData?.proposals ?? [];

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      {/* DAO Header */}
      <div>
        <Link href="/daos" className="text-xs text-[#6C5CE7] hover:underline">← Back to DAOs</Link>
        <h1 className="mt-2 text-2xl font-extrabold text-[#EEEDF6]">
          {daoLoading ? "Loading..." : dao?.name || "DAO Detail"}
        </h1>
        <p className="mt-0.5 text-[11px] font-mono text-[#A8A3BC]">{governorAddress}</p>
      </div>

      {daoError && (
        <div className="mt-4 rounded-2xl border border-red-500/25 bg-red-500/10 p-4 text-sm text-red-300">
          Failed to load DAO details from backend.
        </div>
      )}

      {/* DAO Metadata */}
      {dao && (
        <div className="mt-6 rounded-2xl border border-[#2D2842] bg-[#161229] p-6 shadow-sm">
          <div className="flex items-center gap-2">
            <IconProposal className="h-4 w-4 text-[#6C5CE7]" />
            <h2 className="text-base font-bold text-[#EEEDF6]">DAO Info</h2>
            <span className="ml-auto rounded-md bg-[#251D3F] px-2 py-0.5 text-[10px] uppercase tracking-wider text-[#A8A3BC]">
              {dao.source}
            </span>
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <InfoRow label="Governor" value={shortAddress(dao.governorAddress)} href={explorerAddressUrl(dao.governorAddress)} mono />
            {dao.timelockAddress && <InfoRow label="Timelock" value={shortAddress(dao.timelockAddress)} href={explorerAddressUrl(dao.timelockAddress)} mono />}
            {dao.tokenAddress && <InfoRow label="Token" value={shortAddress(dao.tokenAddress)} href={explorerAddressUrl(dao.tokenAddress)} mono />}
            {dao.creator && <InfoRow label="Creator" value={shortAddress(dao.creator)} href={explorerAddressUrl(dao.creator)} mono />}
            {dao.metadataUri && <InfoRow label="Metadata" value={dao.metadataUri} />}
            <InfoRow label="Chain ID" value={dao.chainId.toString()} />
          </div>
        </div>
      )}

      {/* Proposals */}
      <div className="mt-8">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-[#EEEDF6]">Proposals</h2>
          <span className="text-xs text-[#A8A3BC]">{proposals.length} total</span>
        </div>

        <div className="mt-4 space-y-4">
          {proposalsLoading ? (
            <div className="rounded-2xl border border-[#2D2842] bg-[#161229] p-10 text-center shadow-sm">
              <p className="text-[#A8A3BC]">Loading proposals...</p>
            </div>
          ) : proposals.length === 0 ? (
            <div className="rounded-2xl border border-[#2D2842] bg-[#161229] p-8 shadow-sm text-center">
              <p className="text-sm text-[#A8A3BC]">No proposals found for this DAO.</p>
            </div>
          ) : (
            proposals.map((p) => <ProposalRow key={p.proposalKey} proposal={p} />)
          )}
        </div>
      </div>
    </div>
  );
}

function ProposalRow({ proposal }: { proposal: BackendProposal }) {
  return (
    <Link
      href={`/proposals/${encodeURIComponent(proposal.proposalKey)}`}
      className="block rounded-2xl border border-[#2D2842] bg-[#161229] p-5 shadow-sm transition-all hover:border-[#6C5CE7]/30"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-[#EEEDF6]">{proposal.title ?? proposal.description}</p>
          <div className="mt-1.5 flex flex-wrap gap-3 text-xs text-[#A8A3BC]">
            {proposal.proposer && <span>By {shortAddress(proposal.proposer)}</span>}
            {proposal.startBlock && <span>Start {proposal.startBlock}</span>}
            {proposal.endBlock && <span>End {proposal.endBlock}</span>}
          </div>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1.5">
          {proposal.currentState && (
            <span className="rounded-full bg-[#251D3F] px-2.5 py-0.5 text-[10px] font-semibold text-[#A8A3BC]">
              {proposal.currentState}
            </span>
          )}
          {proposal.analysis && (
            <span className="inline-flex items-center gap-1 rounded-lg bg-[#6C5CE7]/10 px-2 py-0.5 text-[10px] text-[#6C5CE7]">
              <IconSparkle className="h-2.5 w-2.5" />
              {proposal.analysis.recommendedVote}
              <span className={`ml-0.5 rounded px-1 py-px text-[8px] uppercase ${
                proposal.analysis.mode === "openai" ? "bg-emerald-500/15 text-emerald-300" : "bg-[#251D3F] text-[#A8A3BC]"
              }`}>
                {proposal.analysis.mode === "openai" ? "Live" : "Mock"}
              </span>
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}

function InfoRow({ label, value, href, mono }: { label: string; value: string; href?: string; mono?: boolean }) {
  return (
    <div className="rounded-xl bg-[#1F1933] px-4 py-3">
      <p className="text-xs font-semibold uppercase tracking-wider text-[#A8A3BC]">{label}</p>
      {href ? (
        <a href={href} target="_blank" rel="noopener noreferrer" className={`mt-1 block text-sm text-[#6C5CE7] hover:underline ${mono ? "font-mono" : ""}`}>
          {value} ↗
        </a>
      ) : (
        <p className={`mt-1 text-sm text-[#EEEDF6] ${mono ? "font-mono" : ""}`}>{value}</p>
      )}
    </div>
  );
}
