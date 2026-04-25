"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { CONTRACTS, aidoGovernorAbi } from "@/lib/contracts";

export default function CreateProposalPage() {
  const { isConnected } = useAccount();
  const router = useRouter();
  const { writeContract, data: txHash, isPending } = useWriteContract();
  const { isSuccess: txConfirmed } = useWaitForTransactionReceipt({ hash: txHash });

  const [description, setDescription] = useState("");

  const handleSubmit = () => {
    if (!description.trim()) return;

    // Simple no-op proposal (just for governance voting demo)
    writeContract({
      address: CONTRACTS.AIDO_GOVERNOR,
      abi: aidoGovernorAbi,
      functionName: "propose",
      args: [
        ["0x0000000000000000000000000000000000000000"], // targets
        [0n],                                            // values
        ["0x"],                                          // calldatas
        description,
      ],
    });
  };

  if (!isConnected) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <p className="text-[#8C8680]">Connect your wallet to create a proposal.</p>
      </div>
    );
  }

  if (txConfirmed) {
    return (
      <div className="mx-auto max-w-2xl px-4 sm:px-6 py-16 text-center">
        <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-emerald-50 flex items-center justify-center">
          <span className="text-xl">✓</span>
        </div>
        <h1 className="text-2xl font-extrabold text-emerald-600">Proposal Created!</h1>
        <p className="mt-2 text-sm text-[#8C8680]">Your proposal is now live for voting.</p>
        <button
          onClick={() => router.push("/proposals")}
          className="mt-6 rounded-xl bg-[#6C5CE7] px-5 py-2.5 text-sm font-semibold text-white shadow-sm shadow-[#6C5CE7]/20 hover:bg-[#5B4FDB] transition-all"
        >
          View Proposals
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 sm:px-6 py-10">
      <h1 className="text-2xl font-extrabold text-[#1A1613]">Create Proposal</h1>
      <p className="mt-0.5 text-sm text-[#8C8680]">Submit a new governance proposal for voting</p>

      <div className="mt-8 rounded-2xl bg-white border border-[#E2DFD9] p-6 shadow-sm">
        <div>
          <label className="text-xs font-semibold uppercase tracking-wider text-[#8C8680]">Proposal Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe your proposal... e.g. 'Allocate 50,000 MON to marketing wallet'"
            rows={4}
            className="mt-1.5 w-full rounded-xl border border-[#E2DFD9] bg-[#F8F7F4] px-4 py-3 text-sm text-[#1A1613] placeholder:text-[#C4BFB8] focus:border-[#6C5CE7] focus:ring-2 focus:ring-[#6C5CE7]/10 focus:outline-none transition-all resize-none"
          />
        </div>

        <div className="mt-4 rounded-xl bg-[#F0EEEB] p-3">
          <p className="text-xs text-[#8C8680]">
            <strong className="text-[#1A1613]">Voting info:</strong> 1 block delay · 50 blocks voting period (~50s on Monad) · 4% quorum
          </p>
        </div>

        <button
          onClick={handleSubmit}
          disabled={isPending || !description.trim()}
          className="mt-5 w-full rounded-xl bg-[#6C5CE7] px-4 py-2.5 text-sm font-semibold text-white shadow-sm shadow-[#6C5CE7]/20 hover:bg-[#5B4FDB] transition-all disabled:opacity-40"
        >
          {isPending ? "Submitting..." : "Submit Proposal"}
        </button>
      </div>
    </div>
  );
}
