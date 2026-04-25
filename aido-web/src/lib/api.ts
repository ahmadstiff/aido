export const BACKEND_URL = (
  process.env.NEXT_PUBLIC_AIDO_BACKEND_URL || "http://localhost:3001"
).replace(/\/$/, "");

export const EXPLORER_BASE = "https://testnet.monadexplorer.com";

// ─── Types ───

export type RecommendedVote = "FOR" | "AGAINST" | "ABSTAIN";
export type RiskProfile = "CONSERVATIVE" | "NEUTRAL" | "AGGRESSIVE";

export interface ProposalAnalysis {
  summary: string;
  recommendedVote: RecommendedVote;
  reasoning: string;
  riskScore: number;
  alignmentScore: number;
  mode: "mock" | "openai";
}

export interface OnchainVoteRecord {
  voter: string;
  governorAddress: string;
  proposalId: string;
  proposalKey: string;
  support: RecommendedVote;
  reason: string;
  txHash: string;
  castAt: string;
}

export interface BackendProposal {
  proposalKey: string;
  proposalId: string;
  source: "manual" | "indexer";
  sourcePlatform?: "monad";
  preferencePresetId?: string;
  preferencePresetName?: string;
  title?: string;
  description: string;
  proposer?: string;
  startBlock?: string;
  endBlock?: string;
  blockNumber?: string;
  txHash?: string;
  chainId?: number;
  contractAddress?: string;
  daoName?: string;
  currentState?: string;
  totalVotes?: number;
  onchainVotes?: OnchainVoteRecord[];
  userRiskProfile: RiskProfile;
  ethicalFocus: string;
  status: "ANALYZED";
  analysis: ProposalAnalysis;
  createdAt: string;
  updatedAt: string;
}

export interface BackendDao {
  governorAddress: string;
  timelockAddress?: string;
  tokenAddress?: string;
  creator?: string;
  name?: string;
  metadataUri?: string;
  chainId: number;
  source: "factory" | "manual";
  createdAt: string;
  updatedAt: string;
}

export interface BackendCapabilities {
  ai: {
    requestedMode: string;
    provider: string;
    model: string;
    liveAiConfigured: boolean;
    fallbackMode: string;
  };
  onchain: {
    chainId: number;
    rpcUrl: string;
    ready: boolean;
  };
  indexer: {
    sharedSecretConfigured: boolean;
  };
}

// ─── Fetch helpers ───

async function apiGet<T>(path: string): Promise<T> {
  const res = await fetch(`${BACKEND_URL}${path}`, { cache: "no-store" });
  if (!res.ok) throw new Error(`API ${res.status}`);
  return res.json() as Promise<T>;
}

async function apiPost<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${BACKEND_URL}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    cache: "no-store",
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || `API ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export async function fetchProposals(governorAddress?: string) {
  const params = new URLSearchParams();
  if (governorAddress) params.set("governorAddress", governorAddress);
  const qs = params.toString();
  return apiGet<{ proposals: BackendProposal[] }>(`/api/proposals${qs ? `?${qs}` : ""}`);
}

export async function fetchProposal(proposalKeyOrId: string) {
  return apiGet<BackendProposal>(`/api/proposals/${encodeURIComponent(proposalKeyOrId)}`);
}

export async function fetchDao(governorAddress: string) {
  return apiGet<BackendDao>(`/api/daos/${governorAddress}`);
}

export async function fetchDaos() {
  return apiGet<{ daos: BackendDao[] }>("/api/daos");
}

export async function fetchCapabilities() {
  return apiGet<BackendCapabilities>("/api/capabilities");
}

export interface HealthResponse {
  ok: boolean;
  service: string;
  analysisMode: string;
  liveAiConfigured: boolean;
  onchainConfigured: boolean;
}

export async function fetchHealth() {
  return apiGet<HealthResponse>("/health");
}

export async function reanalyzeProposal(
  proposalKeyOrId: string,
  opts?: { requireLive?: boolean; userRiskProfile?: RiskProfile },
) {
  return apiPost<BackendProposal>(
    `/api/proposals/${encodeURIComponent(proposalKeyOrId)}/reanalyze`,
    { requireLive: true, ...opts },
  );
}

export async function voteOnchain(params: {
  proposalKey: string;
  proposalId: string;
  support: RecommendedVote;
  reason?: string;
}) {
  return apiPost<BackendProposal>("/api/onchain/vote", params);
}

/** Returns true if the backend is reachable. */
export async function isBackendAvailable(): Promise<boolean> {
  try {
    const res = await fetch(`${BACKEND_URL}/health`, {
      cache: "no-store",
      signal: AbortSignal.timeout(3000),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export function explorerTxUrl(txHash: string) {
  return `${EXPLORER_BASE}/tx/${txHash}`;
}

export function explorerAddressUrl(address: string) {
  return `${EXPLORER_BASE}/address/${address}`;
}
