"use client";

import { useState, useEffect } from "react";
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import {
  CONTRACTS, aidoTokenAbi, monadVoterRegistryAbi,
  RiskProfileLabels,
} from "@/lib/contracts";
import { IconDelegate, IconAgent, IconShield } from "@/components/icons";

export default function ProfilePage() {
  const { address, isConnected } = useAccount();
  const { writeContract, data: txHash, isPending } = useWriteContract();
  const { isSuccess: txConfirmed } = useWaitForTransactionReceipt({ hash: txHash });

  const [risk, setRisk] = useState(0);
  const [autoPilot, setAutoPilot] = useState(false);
  const [agentAddress, setAgentAddress] = useState("");

  const { data: userConfig, refetch: refetchConfig } = useReadContract({
    address: CONTRACTS.MONAD_VOTER_REGISTRY,
    abi: monadVoterRegistryAbi,
    functionName: "getUserConfig",
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  });

  const { data: currentDelegate } = useReadContract({
    address: CONTRACTS.AIDO_TOKEN,
    abi: aidoTokenAbi,
    functionName: "delegates",
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  });

  useEffect(() => {
    if (userConfig) {
      setRisk(userConfig.riskProfile);
      setAutoPilot(userConfig.isAutoPilot);
      if (userConfig.delegatedAgent !== "0x0000000000000000000000000000000000000000") {
        setAgentAddress(userConfig.delegatedAgent);
      }
    }
  }, [userConfig]);

  useEffect(() => {
    if (txConfirmed) refetchConfig();
  }, [txConfirmed, refetchConfig]);

  const handleSaveConfig = () => {
    const agent = agentAddress || "0x0000000000000000000000000000000000000000";
    writeContract({
      address: CONTRACTS.MONAD_VOTER_REGISTRY,
      abi: monadVoterRegistryAbi,
      functionName: "setConfig",
      args: [risk, autoPilot, agent as `0x${string}`],
    });
  };

  const handleDelegateSelf = () => {
    if (!address) return;
    writeContract({
      address: CONTRACTS.AIDO_TOKEN,
      abi: aidoTokenAbi,
      functionName: "delegate",
      args: [address],
    });
  };

  const handleDelegateAgent = () => {
    if (!agentAddress) return;
    writeContract({
      address: CONTRACTS.AIDO_TOKEN,
      abi: aidoTokenAbi,
      functionName: "delegate",
      args: [agentAddress as `0x${string}`],
    });
  };

  if (!isConnected) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <p className="text-[#8C8680]">Connect your wallet to manage your profile.</p>
      </div>
    );
  }

  const isSelfDelegated = currentDelegate && address && currentDelegate.toLowerCase() === address.toLowerCase();

  return (
    <div className="mx-auto max-w-2xl px-4 sm:px-6 py-10">
      <h1 className="text-2xl font-extrabold text-[#1A1613]">Governance Profile</h1>
      <p className="mt-0.5 text-sm text-[#8C8680]">Configure your AI agent preferences</p>

      {/* Delegation Section */}
      <div className="mt-8 rounded-2xl bg-white border border-[#E2DFD9] p-6 shadow-sm">
        <div className="flex items-center gap-2">
          <IconDelegate className="w-4 h-4 text-[#6C5CE7]" />
          <h2 className="text-base font-bold text-[#1A1613]">Token Delegation</h2>
        </div>
        <p className="mt-1.5 text-sm text-[#8C8680] leading-relaxed">
          Delegate to activate voting power. Self-delegate for manual voting, or delegate to your agent for auto-pilot.
        </p>
        <p className="mt-3 text-xs text-[#8C8680]">
          Current: <code className="rounded-md bg-[#F0EEEB] px-1.5 py-0.5 font-mono text-[11px] text-[#1A1613]">{currentDelegate ?? "None"}</code>
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            onClick={handleDelegateSelf}
            disabled={isPending || isSelfDelegated}
            className="rounded-xl bg-[#6C5CE7] px-4 py-2 text-sm font-semibold text-white shadow-sm shadow-[#6C5CE7]/20 hover:bg-[#5B4FDB] transition-all disabled:opacity-40"
          >
            {isSelfDelegated ? "Self-Delegated" : "Delegate to Self"}
          </button>
          {agentAddress && (
            <button
              onClick={handleDelegateAgent}
              disabled={isPending}
              className="rounded-xl border border-[#E2DFD9] bg-white px-4 py-2 text-sm font-semibold text-[#1A1613] hover:bg-[#F0EEEB] transition-all disabled:opacity-40"
            >
              Delegate to Agent
            </button>
          )}
        </div>
      </div>

      {/* AI Config Section */}
      <div className="mt-5 rounded-2xl bg-white border border-[#E2DFD9] p-6 shadow-sm">
        <div className="flex items-center gap-2">
          <IconAgent className="w-4 h-4 text-[#6C5CE7]" />
          <h2 className="text-base font-bold text-[#1A1613]">AI Agent Config</h2>
        </div>

        {/* Risk Profile */}
        <div className="mt-5">
          <label className="text-xs font-semibold uppercase tracking-wider text-[#8C8680]">Risk Profile</label>
          <div className="mt-2.5 flex gap-2">
            {RiskProfileLabels.map((label, i) => (
              <button
                key={i}
                onClick={() => setRisk(i)}
                className={`rounded-xl px-4 py-2 text-sm font-semibold transition-all ${
                  risk === i
                    ? "bg-[#6C5CE7] text-white shadow-sm shadow-[#6C5CE7]/20"
                    : "border border-[#E2DFD9] text-[#1A1613] hover:bg-[#F0EEEB]"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Auto-Pilot Toggle */}
        <div className="mt-5 flex items-center justify-between">
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-[#8C8680]">Auto-Pilot Mode</label>
            <p className="mt-0.5 text-xs text-[#8C8680]">
              Let AI vote on your behalf
            </p>
          </div>
          <button
            onClick={() => setAutoPilot(!autoPilot)}
            className={`relative h-7 w-12 rounded-full transition-all ${
              autoPilot ? "bg-[#6C5CE7]" : "bg-[#E2DFD9]"
            }`}
          >
            <span
              className={`absolute top-0.5 left-0.5 h-6 w-6 rounded-full bg-white shadow-sm transition-all ${
                autoPilot ? "translate-x-5" : ""
              }`}
            />
          </button>
        </div>

        {/* Agent Address */}
        <div className="mt-5">
          <label className="text-xs font-semibold uppercase tracking-wider text-[#8C8680]">Agent Address</label>
          <input
            type="text"
            value={agentAddress}
            onChange={(e) => setAgentAddress(e.target.value)}
            placeholder="0x..."
            className="mt-1.5 w-full rounded-xl border border-[#E2DFD9] bg-[#F8F7F4] px-4 py-2.5 text-sm font-mono text-[#1A1613] placeholder:text-[#C4BFB8] focus:border-[#6C5CE7] focus:ring-2 focus:ring-[#6C5CE7]/10 focus:outline-none transition-all"
          />
        </div>

        {/* Save Button */}
        <button
          onClick={handleSaveConfig}
          disabled={isPending}
          className="mt-6 w-full rounded-xl bg-[#6C5CE7] px-4 py-2.5 text-sm font-semibold text-white shadow-sm shadow-[#6C5CE7]/20 hover:bg-[#5B4FDB] transition-all disabled:opacity-40"
        >
          {isPending ? "Saving..." : "Save Config"}
        </button>

        {txConfirmed && (
          <p className="mt-3 text-center text-sm font-medium text-emerald-600">Config saved successfully!</p>
        )}
      </div>
    </div>
  );
}
