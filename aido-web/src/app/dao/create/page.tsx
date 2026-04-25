"use client";

import { useState } from "react";
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { CONTRACTS, aidoDaoFactoryAbi } from "@/lib/contracts";

export default function CreateDaoPage() {
  const { address, isConnected } = useAccount();
  const { writeContract, data: txHash, isPending } = useWriteContract();
  const { isSuccess: txConfirmed } = useWaitForTransactionReceipt({ hash: txHash });

  const [name, setName] = useState("");
  const [tokenAddress, setTokenAddress] = useState<string>(CONTRACTS.AIDO_TOKEN);
  const [votingDelay, setVotingDelay] = useState("1");
  const [votingPeriod, setVotingPeriod] = useState("50");
  const [proposalThreshold, setProposalThreshold] = useState("0");
  const [quorum, setQuorum] = useState("4");
  const [metadataURI, setMetadataURI] = useState("");

  const handleCreate = () => {
    if (!name.trim() || !tokenAddress || !address) return;

    writeContract({
      address: CONTRACTS.AIDO_DAO_FACTORY,
      abi: aidoDaoFactoryAbi,
      functionName: "createDao",
      args: [
        name,
        tokenAddress as `0x${string}`,
        Number(votingDelay),
        Number(votingPeriod),
        BigInt(proposalThreshold),
        BigInt(quorum),
        address,
        metadataURI,
      ],
    });
  };

  if (!isConnected) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <p className="text-[#4F4862]">Connect your wallet to create a DAO.</p>
      </div>
    );
  }

  if (txConfirmed) {
    return (
      <div className="mx-auto max-w-2xl px-4 sm:px-6 py-16 text-center">
        <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-emerald-50 flex items-center justify-center">
          <span className="text-xl">✓</span>
        </div>
        <h1 className="text-2xl font-extrabold text-emerald-600">DAO Created!</h1>
        <p className="mt-2 text-sm text-[#4F4862]">
          Your DAO has been deployed and registered on Monad testnet.
        </p>
        <p className="mt-1 text-xs text-[#4F4862] font-mono break-all">
          Tx: {txHash}
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 sm:px-6 py-10">
      <h1 className="text-2xl font-extrabold text-[#1A1625]">Create DAO</h1>
      <p className="mt-0.5 text-sm text-[#4F4862]">
        Deploy a new DAO with governor + timelock on Monad testnet
      </p>

      <div className="mt-8 rounded-2xl bg-white border border-[#DEDCE6] p-6 shadow-sm space-y-5">
        {/* DAO Name */}
        <div>
          <label className="text-xs font-semibold uppercase tracking-wider text-[#4F4862]">
            DAO Name
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="My DAO"
            className="mt-1.5 w-full rounded-xl border border-[#DEDCE6] bg-[#F5F3FA] px-4 py-2.5 text-sm text-[#1A1625] placeholder:text-[#B5B2C0] focus:border-[#6C5CE7] focus:ring-2 focus:ring-[#6C5CE7]/10 focus:outline-none transition-all"
          />
        </div>

        {/* Token Address */}
        <div>
          <label className="text-xs font-semibold uppercase tracking-wider text-[#4F4862]">
            Voting Token Address
          </label>
          <input
            type="text"
            value={tokenAddress}
            onChange={(e) => setTokenAddress(e.target.value)}
            placeholder="0x..."
            className="mt-1.5 w-full rounded-xl border border-[#DEDCE6] bg-[#F5F3FA] px-4 py-2.5 text-sm font-mono text-[#1A1625] placeholder:text-[#B5B2C0] focus:border-[#6C5CE7] focus:ring-2 focus:ring-[#6C5CE7]/10 focus:outline-none transition-all"
          />
          <p className="mt-1 text-xs text-[#4F4862]">Must be ERC20Votes compatible</p>
        </div>

        {/* Grid: Voting Delay + Period */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-[#4F4862]">
              Voting Delay (blocks)
            </label>
            <input
              type="number"
              value={votingDelay}
              onChange={(e) => setVotingDelay(e.target.value)}
              className="mt-1.5 w-full rounded-xl border border-[#DEDCE6] bg-[#F5F3FA] px-4 py-2.5 text-sm text-[#1A1625] focus:border-[#6C5CE7] focus:ring-2 focus:ring-[#6C5CE7]/10 focus:outline-none transition-all"
            />
          </div>
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-[#4F4862]">
              Voting Period (blocks)
            </label>
            <input
              type="number"
              value={votingPeriod}
              onChange={(e) => setVotingPeriod(e.target.value)}
              className="mt-1.5 w-full rounded-xl border border-[#DEDCE6] bg-[#F5F3FA] px-4 py-2.5 text-sm text-[#1A1625] focus:border-[#6C5CE7] focus:ring-2 focus:ring-[#6C5CE7]/10 focus:outline-none transition-all"
            />
          </div>
        </div>

        {/* Grid: Threshold + Quorum */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-[#4F4862]">
              Proposal Threshold
            </label>
            <input
              type="number"
              value={proposalThreshold}
              onChange={(e) => setProposalThreshold(e.target.value)}
              className="mt-1.5 w-full rounded-xl border border-[#DEDCE6] bg-[#F5F3FA] px-4 py-2.5 text-sm text-[#1A1625] focus:border-[#6C5CE7] focus:ring-2 focus:ring-[#6C5CE7]/10 focus:outline-none transition-all"
            />
            <p className="mt-1 text-xs text-[#4F4862]">Min votes to propose (0 = anyone)</p>
          </div>
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-[#4F4862]">
              Quorum (%)
            </label>
            <input
              type="number"
              value={quorum}
              onChange={(e) => setQuorum(e.target.value)}
              className="mt-1.5 w-full rounded-xl border border-[#DEDCE6] bg-[#F5F3FA] px-4 py-2.5 text-sm text-[#1A1625] focus:border-[#6C5CE7] focus:ring-2 focus:ring-[#6C5CE7]/10 focus:outline-none transition-all"
            />
          </div>
        </div>

        {/* Metadata URI */}
        <div>
          <label className="text-xs font-semibold uppercase tracking-wider text-[#4F4862]">
            Metadata URI (optional)
          </label>
          <input
            type="text"
            value={metadataURI}
            onChange={(e) => setMetadataURI(e.target.value)}
            placeholder="ipfs://... or https://..."
            className="mt-1.5 w-full rounded-xl border border-[#DEDCE6] bg-[#F5F3FA] px-4 py-2.5 text-sm text-[#1A1625] placeholder:text-[#B5B2C0] focus:border-[#6C5CE7] focus:ring-2 focus:ring-[#6C5CE7]/10 focus:outline-none transition-all"
          />
        </div>

        {/* Info */}
        <div className="rounded-xl bg-[#EEEDF4] p-3">
          <p className="text-xs text-[#4F4862]">
            <strong className="text-[#1A1625]">What happens:</strong> Factory deploys a Governor + Timelock pair, registers it in the DAO Registry, and emits a DaoCreated event for the indexer.
          </p>
        </div>

        <button
          onClick={handleCreate}
          disabled={isPending || !name.trim()}
          className="w-full rounded-xl bg-[#6C5CE7] px-4 py-2.5 text-sm font-semibold text-white shadow-sm shadow-[#6C5CE7]/20 hover:bg-[#5B4FDB] transition-all disabled:opacity-40"
        >
          {isPending ? "Creating DAO..." : "Create DAO"}
        </button>
      </div>
    </div>
  );
}
