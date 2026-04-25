"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { fetchDaos, explorerAddressUrl, type BackendDao } from "@/lib/api";
import { IconProposal } from "@/components/icons";

function shortAddress(value?: string) {
  if (!value) return "—";
  return `${value.slice(0, 6)}...${value.slice(-4)}`;
}

export default function DaosPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["daos"],
    queryFn: () => fetchDaos(),
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });

  const daos = data?.daos ?? [];

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-[#EEEDF6]">DAOs</h1>
          <p className="mt-0.5 text-sm text-[#A8A3BC]">Registered DAOs on Monad testnet</p>
        </div>
        <Link
          href="/dao/create"
          className="rounded-xl bg-[#6C5CE7] px-5 py-2.5 text-sm font-semibold text-white shadow-sm shadow-[#6C5CE7]/20 transition-all hover:bg-[#5B4FDB]"
        >
          Create DAO
        </Link>
      </div>

      <div className="mt-8 space-y-4">
        {isLoading ? (
          <div className="rounded-2xl border border-[#2D2842] bg-[#161229] p-10 text-center shadow-sm">
            <p className="text-[#A8A3BC]">Loading DAOs from backend...</p>
          </div>
        ) : error ? (
          <div className="rounded-2xl border border-red-500/25 bg-red-500/10 p-6 text-sm text-red-300">
            Failed to load DAOs. Make sure backend is running.
          </div>
        ) : daos.length === 0 ? (
          <div className="rounded-2xl border border-[#2D2842] bg-[#161229] p-8 shadow-sm text-center">
            <h3 className="text-lg font-bold text-[#EEEDF6]">No DAOs registered yet</h3>
            <p className="mt-2 text-sm text-[#A8A3BC]">
              Create a DAO using the factory or wait for the indexer to detect one.
            </p>
          </div>
        ) : (
          daos.map((dao) => <DaoCard key={dao.governorAddress} dao={dao} />)
        )}
      </div>
    </div>
  );
}

function DaoCard({ dao }: { dao: BackendDao }) {
  return (
    <Link
      href={`/daos/${dao.governorAddress}`}
      className="block rounded-2xl border border-[#2D2842] bg-[#161229] p-6 shadow-sm transition-all hover:border-[#6C5CE7]/30 hover:shadow-md"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <IconProposal className="h-4 w-4 text-[#6C5CE7]" />
            <h2 className="text-base font-bold text-[#EEEDF6]">{dao.name || "Unnamed DAO"}</h2>
          </div>
          <div className="mt-3 grid gap-2 sm:grid-cols-2 text-xs text-[#A8A3BC]">
            <div>
              <span className="text-[#A8A3BC]/60">Governor:</span>{" "}
              <span className="font-mono text-[#6C5CE7]">{shortAddress(dao.governorAddress)}</span>
            </div>
            {dao.timelockAddress && (
              <div>
                <span className="text-[#A8A3BC]/60">Timelock:</span>{" "}
                <span className="font-mono">{shortAddress(dao.timelockAddress)}</span>
              </div>
            )}
            {dao.tokenAddress && (
              <div>
                <span className="text-[#A8A3BC]/60">Token:</span>{" "}
                <span className="font-mono">{shortAddress(dao.tokenAddress)}</span>
              </div>
            )}
            {dao.creator && (
              <div>
                <span className="text-[#A8A3BC]/60">Creator:</span>{" "}
                <span className="font-mono">{shortAddress(dao.creator)}</span>
              </div>
            )}
          </div>
        </div>
        <span className="shrink-0 rounded-md bg-[#251D3F] px-2 py-0.5 text-[10px] uppercase tracking-wider text-[#A8A3BC]">
          {dao.source}
        </span>
      </div>
    </Link>
  );
}
