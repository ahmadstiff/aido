"use client";

import { useEffect, useMemo, useState } from "react";
import {
  useAccount,
  useReadContract,
  useWaitForTransactionReceipt,
  useWriteContract,
} from "wagmi";
import { formatEther, parseEther } from "viem";
import {
  CONTRACTS,
  RiskProfileLabels,
  aidoTokenAbi,
  monadVoterRegistryAbi,
} from "@/lib/contracts";
import {
  IconAgent,
  IconDelegate,
  IconShield,
  IconSparkle,
  IconToken,
  IconVotePower,
} from "@/components/icons";
import { DecoratedCard } from "@/components/decorated-card";

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";
const AIDO_AGENT_ADDRESS = "0x42f484f4fad0093543A6EE211da829FF30e777EE" as const;

function shortAddress(value?: string) {
  if (!value) return "—";
  return `${value.slice(0, 6)}...${value.slice(-4)}`;
}

export default function ProfilePage() {
  const { address, isConnected } = useAccount();
  const { writeContract, data: txHash, isPending } = useWriteContract();
  const { isSuccess: txConfirmed } = useWaitForTransactionReceipt({ hash: txHash });

  const [risk, setRisk] = useState(0);
  const [autoPilot, setAutoPilot] = useState(false);
  const [lastAction, setLastAction] = useState<
    "claim" | "delegate-self" | "delegate-agent" | "save-config" | "owner-mint" | null
  >(null);
  const [mintRecipient, setMintRecipient] = useState("");
  const [mintAmount, setMintAmount] = useState("10000");

  const { data: balance, refetch: refetchBalance } = useReadContract({
    address: CONTRACTS.AIDO_TOKEN,
    abi: aidoTokenAbi,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  });

  const { data: votes, refetch: refetchVotes } = useReadContract({
    address: CONTRACTS.AIDO_TOKEN,
    abi: aidoTokenAbi,
    functionName: "getVotes",
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  });

  const { data: currentDelegate, refetch: refetchDelegate } = useReadContract({
    address: CONTRACTS.AIDO_TOKEN,
    abi: aidoTokenAbi,
    functionName: "delegates",
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  });

  const { data: tokenOwner } = useReadContract({
    address: CONTRACTS.AIDO_TOKEN,
    abi: aidoTokenAbi,
    functionName: "owner",
    query: { enabled: true },
  });

  const { data: hasClaimed, refetch: refetchHasClaimed } = useReadContract({
    address: CONTRACTS.AIDO_TOKEN,
    abi: aidoTokenAbi,
    functionName: "hasClaimed",
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  });

  const { data: faucetAmount } = useReadContract({
    address: CONTRACTS.AIDO_TOKEN,
    abi: aidoTokenAbi,
    functionName: "FAUCET_AMOUNT",
    query: { enabled: true },
  });

  const { data: userConfig, refetch: refetchConfig } = useReadContract({
    address: CONTRACTS.MONAD_VOTER_REGISTRY,
    abi: monadVoterRegistryAbi,
    functionName: "getUserConfig",
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  });

  const { data: registeredUsersCount } = useReadContract({
    address: CONTRACTS.MONAD_VOTER_REGISTRY,
    abi: monadVoterRegistryAbi,
    functionName: "getRegisteredUsersCount",
    query: { enabled: true },
  });

  useEffect(() => {
    if (!userConfig) return;
    setRisk(Number(userConfig.riskProfile));
    setAutoPilot(Boolean(userConfig.isAutoPilot));
  }, [userConfig]);

  useEffect(() => {
    if (!txConfirmed) return;
    refetchConfig();
    refetchDelegate();
    refetchBalance();
    refetchVotes();
    refetchHasClaimed();
  }, [txConfirmed, refetchBalance, refetchConfig, refetchDelegate, refetchHasClaimed, refetchVotes]);

  const isSelfDelegated =
    !!currentDelegate &&
    !!address &&
    currentDelegate.toLowerCase() === address.toLowerCase();
  const hasAgentConfigured = !!userConfig && userConfig.delegatedAgent !== ZERO_ADDRESS;
  const isOwner =
    !!address && !!tokenOwner && tokenOwner.toLowerCase() === address.toLowerCase();

  const successMessage = useMemo(() => {
    if (!txConfirmed || !lastAction) return null;
    if (lastAction === "claim") return "Faucet claim successful.";
    if (lastAction === "delegate-self") return "Delegation to your wallet succeeded.";
    if (lastAction === "delegate-agent") return "Delegation to the agent succeeded.";
    if (lastAction === "save-config") return "Agent configuration saved successfully.";
    if (lastAction === "owner-mint") return "Token mint successful.";
    return null;
  }, [lastAction, txConfirmed]);

  const onboardingSteps = [
    {
      label: "Claim token",
      done: Boolean(balance && balance > 0n),
      hint: hasClaimed ? "Faucet already claimed" : "Claim 10,000 AIDO to get started",
    },
    {
      label: "Delegate voting power",
      done: Boolean(currentDelegate && currentDelegate !== ZERO_ADDRESS),
      hint: isSelfDelegated ? "Voting is active on this wallet" : "Delegate to yourself or an agent",
    },
    {
      label: "Set risk profile",
      done: hasAgentConfigured,
      hint: hasAgentConfigured ? RiskProfileLabels[Number(userConfig?.riskProfile ?? 0)] : "No agent configured yet",
    },
    {
      label: "Enable auto-pilot",
      done: Boolean(userConfig?.isAutoPilot),
      hint: userConfig?.isAutoPilot ? "AI agent is active" : "Manual voting only",
    },
  ];

  const handleSaveConfig = () => {
    setLastAction("save-config");
    writeContract({
      address: CONTRACTS.MONAD_VOTER_REGISTRY,
      abi: monadVoterRegistryAbi,
      functionName: "setConfig",
      args: [risk, autoPilot, AIDO_AGENT_ADDRESS],
    });
  };

  const handleDelegateSelf = () => {
    if (!address) return;
    setLastAction("delegate-self");
    writeContract({
      address: CONTRACTS.AIDO_TOKEN,
      abi: aidoTokenAbi,
      functionName: "delegate",
      args: [address],
    });
  };

  const handleDelegateAgent = () => {
    setLastAction("delegate-agent");
    writeContract({
      address: CONTRACTS.AIDO_TOKEN,
      abi: aidoTokenAbi,
      functionName: "delegate",
      args: [AIDO_AGENT_ADDRESS],
    });
  };

  const handleClaimFaucet = () => {
    setLastAction("claim");
    writeContract({
      address: CONTRACTS.AIDO_TOKEN,
      abi: aidoTokenAbi,
      functionName: "faucet",
      args: [],
    });
  };

  const handleOwnerMint = () => {
    if (!mintRecipient || !mintAmount) return;

    try {
      setLastAction("owner-mint");
      writeContract({
        address: CONTRACTS.AIDO_TOKEN,
        abi: aidoTokenAbi,
        functionName: "mint",
        args: [mintRecipient as `0x${string}`, parseEther(mintAmount)],
      });
    } catch {
      // keep quiet; invalid amount/address just won't submit
    }
  };

  if (!isConnected) {
    return (
      <div className="flex flex-1 items-center justify-center px-4">
        <div className="max-w-md text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#6C5CE7]/10">
            <IconShield className="h-7 w-7 text-[#6C5CE7]" />
          </div>
          <h1 className="text-2xl font-extrabold text-[#EEEDF6]">Profile</h1>
          <p className="mt-2 text-sm leading-relaxed text-[#A8A3BC]">
            Connect your wallet to claim tokens, delegate voting power, and configure your AI agent.
          </p>
          <div className="mt-6 flex justify-center">
            <appkit-button />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-[#EEEDF6]">Governance Profile</h1>
          <p className="mt-0.5 text-sm text-[#A8A3BC]">
            Onboard your wallet, activate voting power, and configure your AI agent.
          </p>
        </div>
        <div className="rounded-xl border border-[#2D2842] bg-[#161229] px-3 py-2 text-xs text-[#A8A3BC]">
          Wallet: <span className="font-mono text-[#EEEDF6]">{shortAddress(address)}</span>
        </div>
      </div>

      {successMessage && (
        <div className="mt-6 rounded-2xl border border-emerald-500/25 bg-emerald-500/10 px-4 py-3 text-sm font-medium text-emerald-300">
          {successMessage}
        </div>
      )}

      <div className="mt-8 grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          title="AIDO Balance"
          value={balance ? Number(formatEther(balance)).toLocaleString() : "0"}
          subtitle="tokens in this wallet"
          icon={<IconToken className="h-4 w-4 text-[#6C5CE7]" />}
          tone="violet"
        />
        <SummaryCard
          title="Voting Power"
          value={votes ? Number(formatEther(votes)).toLocaleString() : "0"}
          subtitle={isSelfDelegated ? "active for manual voting" : "delegation required"}
          icon={<IconVotePower className="h-4 w-4 text-[#6C5CE7]" />}
          tone="amber"
        />
        <SummaryCard
          title="Faucet"
          value={hasClaimed ? "Claimed" : formatEther(faucetAmount ?? 0n)}
          subtitle={hasClaimed ? "already used" : "AIDO available to claim"}
          icon={<IconSparkle className="h-4 w-4 text-[#6C5CE7]" />}
          tone="emerald"
        />
        <SummaryCard
          title="Agent Users"
          value={registeredUsersCount?.toString() ?? "0"}
          subtitle={hasAgentConfigured ? "this wallet is registered" : "this wallet is not registered"}
          icon={<IconAgent className="h-4 w-4 text-[#6C5CE7]" />}
          tone="sky"
        />
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-[1.05fr_1.35fr]">
        <div className="space-y-6">
          <DecoratedCard
            accent="violet"
            pattern="wave"
            secondaryPattern="shiny"
            contentClassName="p-6"
          >
            <div className="flex items-center gap-2">
              <IconShield className="h-4 w-4 text-[#6C5CE7]" />
              <h2 className="text-base font-bold text-[#EEEDF6]">Onboarding Status</h2>
            </div>
            <div className="mt-5 space-y-3">
              {onboardingSteps.map((step) => (
                <div
                  key={step.label}
                  className="flex items-start gap-3 rounded-xl border border-[#251D3F] bg-[#211A35] px-4 py-3"
                >
                  <div
                    className={`mt-0.5 h-2.5 w-2.5 rounded-full ${
                      step.done ? "bg-emerald-500" : "bg-[#4A435E]"
                    }`}
                  />
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-[#EEEDF6]">{step.label}</p>
                    <p className="mt-0.5 text-xs text-[#A8A3BC]">{step.hint}</p>
                  </div>
                </div>
              ))}
            </div>
          </DecoratedCard>

          <DecoratedCard
            accent="amber"
            pattern="meteor"
            secondaryPattern="shiny"
            contentClassName="p-6"
          >
            <div className="flex items-center gap-2">
              <IconDelegate className="h-4 w-4 text-[#6C5CE7]" />
              <h2 className="text-base font-bold text-[#EEEDF6]">Token Actions</h2>
            </div>
            <p className="mt-1.5 text-sm leading-relaxed text-[#A8A3BC]">
              Claim tokens first, then delegate to activate your voting power.
            </p>

            <div className="mt-4 rounded-xl bg-[#1F1933] px-4 py-3 text-sm">
              <div className="flex justify-between gap-3">
                <span className="text-[#A8A3BC]">Current delegate</span>
                <span className="font-mono text-[#EEEDF6]">
                  {currentDelegate && currentDelegate !== ZERO_ADDRESS
                    ? shortAddress(currentDelegate)
                    : "None"}
                </span>
              </div>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <button
                onClick={handleClaimFaucet}
                disabled={isPending || Boolean(hasClaimed)}
                className="rounded-xl bg-[#6C5CE7] px-4 py-2.5 text-sm font-semibold text-white shadow-sm shadow-[#6C5CE7]/20 transition-all hover:bg-[#5B4FDB] disabled:opacity-40"
              >
                {hasClaimed ? "Faucet Claimed" : `Claim ${Number(formatEther(faucetAmount ?? 0n)).toLocaleString()} AIDO`}
              </button>
              <button
                onClick={handleDelegateSelf}
                disabled={isPending || isSelfDelegated}
                className="rounded-xl border border-[#2D2842] bg-[#161229] px-4 py-2.5 text-sm font-semibold text-[#EEEDF6] transition-all hover:bg-[#251D3F] disabled:opacity-40"
              >
                {isSelfDelegated ? "Self Delegated" : "Delegate to Self"}
              </button>
            </div>

            <div className="mt-3">
              <button
                onClick={handleDelegateAgent}
                disabled={isPending}
                className="w-full rounded-xl border border-[#2D2842] bg-[#161229] px-4 py-2.5 text-sm font-semibold text-[#EEEDF6] transition-all hover:bg-[#251D3F] disabled:opacity-40"
              >
                Delegate to AIDO Agent
              </button>
            </div>
          </DecoratedCard>
        </div>

        <div className="space-y-6">
          <DecoratedCard
            accent="emerald"
            pattern="hexagon"
            secondaryPattern="shiny"
            contentClassName="p-6"
          >
            <div className="flex items-center gap-2">
              <IconAgent className="h-4 w-4 text-[#6C5CE7]" />
              <h2 className="text-base font-bold text-[#EEEDF6]">AI Agent Config</h2>
            </div>

            <div className="mt-5">
              <label className="text-xs font-semibold uppercase tracking-wider text-[#A8A3BC]">
                Risk Profile
              </label>
              <div className="mt-2.5 flex flex-wrap gap-2">
                {RiskProfileLabels.map((label, i) => (
                  <button
                    key={i}
                    onClick={() => setRisk(i)}
                    className={`rounded-xl px-4 py-2 text-sm font-semibold transition-all ${
                      risk === i
                        ? "bg-[#6C5CE7] text-white shadow-sm shadow-[#6C5CE7]/20"
                        : "border border-[#2D2842] text-[#EEEDF6] hover:bg-[#251D3F]"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-5 flex items-center justify-between rounded-xl px-4 py-3">
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-[#A8A3BC]">
                  Auto-Pilot
                </label>
                <p className="mt-0.5 text-xs text-[#A8A3BC]">
                  The AI agent can vote automatically based on your risk profile.
                </p>
              </div>
              <button
                onClick={() => setAutoPilot(!autoPilot)}
                className={`relative h-7 w-12 rounded-full transition-all ${
                  autoPilot ? "bg-[#6C5CE7]" : "bg-[#2D2842]"
                }`}
              >
                <span
                  className={`absolute left-0.5 top-0.5 h-6 w-6 rounded-full bg-[#161229] shadow-sm transition-all ${
                    autoPilot ? "translate-x-5" : ""
                  }`}
                />
              </button>
            </div>

            <div className="mt-5 rounded-xl bg-[#1F1933] px-4 py-3 text-sm">
              <div className="flex justify-between gap-3">
                <span className="text-[#A8A3BC]">AIDO Agent</span>
                <span className="font-mono text-[#6C5CE7]">{shortAddress(AIDO_AGENT_ADDRESS)}</span>
              </div>
            </div>

            <div className="mt-3 rounded-xl bg-[#1F1933] px-4 py-3 text-sm">
              <div className="flex justify-between gap-3">
                <span className="text-[#A8A3BC]">Configured agent</span>
                <span className="font-mono text-[#EEEDF6]">
                  {hasAgentConfigured ? shortAddress(userConfig?.delegatedAgent) : "None"}
                </span>
              </div>
            </div>

            <button
              onClick={handleSaveConfig}
              disabled={isPending}
              className="mt-5 w-full rounded-xl bg-[#6C5CE7] px-4 py-2.5 text-sm font-semibold text-white shadow-sm shadow-[#6C5CE7]/20 transition-all hover:bg-[#5B4FDB] disabled:opacity-40"
            >
              {isPending ? "Saving..." : "Save Config"}
            </button>
          </DecoratedCard>

          {isOwner && (
            <DecoratedCard
              accent="sky"
              pattern="wave"
              secondaryPattern="shiny"
              contentClassName="p-6"
            >
              <div className="flex items-center gap-2">
              <IconSparkle className="h-4 w-4 text-[#6C5CE7]" />
              <h2 className="text-base font-bold text-[#EEEDF6]">Owner Mint Tools</h2>
              </div>
              <p className="mt-1.5 text-sm text-[#A8A3BC]">
                This wallet is the token owner, so it can mint AIDO to any address.
              </p>

              <div className="mt-5 grid gap-4 sm:grid-cols-[1.5fr_0.8fr]">
                <input
                  type="text"
                  value={mintRecipient}
                  onChange={(e) => setMintRecipient(e.target.value)}
                  placeholder="Recipient address"
                  className="w-full rounded-xl border border-[#2D2842] bg-[#1F1933] px-4 py-2.5 text-sm font-mono text-[#EEEDF6] placeholder:text-[#8D86A3] focus:border-[#6C5CE7] focus:outline-none focus:ring-2 focus:ring-[#6C5CE7]/10 transition-all"
                />
                <input
                  type="number"
                  min="1"
                  value={mintAmount}
                  onChange={(e) => setMintAmount(e.target.value)}
                  placeholder="Amount"
                  className="w-full rounded-xl border border-[#2D2842] bg-[#1F1933] px-4 py-2.5 text-sm text-[#EEEDF6] placeholder:text-[#8D86A3] focus:border-[#6C5CE7] focus:outline-none focus:ring-2 focus:ring-[#6C5CE7]/10 transition-all"
                />
              </div>

              <button
                onClick={handleOwnerMint}
                disabled={isPending || !mintRecipient || !mintAmount}
                className="mt-4 w-full rounded-xl border border-[#6C5CE7]/20 bg-[#2A1F4D] px-4 py-2.5 text-sm font-semibold text-[#6C5CE7] transition-all hover:bg-[#352A68] disabled:opacity-40"
              >
                Mint AIDO
              </button>
            </DecoratedCard>
          )}
        </div>
      </div>
    </div>
  );
}

function SummaryCard({
  title,
  value,
  subtitle,
  icon,
  tone,
}: {
  title: string;
  value: string;
  subtitle: string;
  icon: React.ReactNode;
  tone: "violet" | "amber" | "emerald" | "sky";
}) {
  const toneClasses = {
    violet: "bg-[#6C5CE7]/15",
    amber: "bg-[#6C5CE7]/[0.12]",
    emerald: "bg-[#6C5CE7]/10",
    sky: "bg-[#6C5CE7]/10",
  };

  return (
    <DecoratedCard
      accent={tone}
      pattern={tone === "violet" ? "hexagon" : tone === "amber" ? "meteor" : "wave"}
      secondaryPattern="shiny"
      contentClassName="p-6"
    >
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wider text-[#C4BCFA]">{title}</p>
        <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${toneClasses[tone]}`}>
          {icon}
        </div>
      </div>
      <p className="mt-2 text-3xl font-extrabold text-[#EEEDF6]">{value}</p>
      <p className="mt-1 text-xs text-[#A8A3BC]">{subtitle}</p>
    </DecoratedCard>
  );
}
