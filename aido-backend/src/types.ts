export const riskProfiles = [
  "CONSERVATIVE",
  "NEUTRAL",
  "AGGRESSIVE",
] as const;

export type RiskProfile = (typeof riskProfiles)[number];

export const aavePreferencePresetIds = [
  "conservative",
  "treasury-discipline",
  "growth",
  "governance-maximalist",
  "gho-strategy",
] as const;

export type AavePreferencePresetId =
  (typeof aavePreferencePresetIds)[number];

export const recommendedVotes = ["FOR", "AGAINST", "ABSTAIN"] as const;

export type RecommendedVote = (typeof recommendedVotes)[number];

export type AnalysisMode = "mock" | "openai";

export interface OnchainVoteRecord {
  voter: string;
  governorAddress: string;
  proposalId: string;
  support: RecommendedVote;
  reason: string;
  txHash: string;
  castAt: string;
}

export interface AnalysisInput {
  proposalId: string;
  proposalText: string;
  userRiskProfile: RiskProfile;
  ethicalFocus: string;
  preferencePresetId?: AavePreferencePresetId;
  preferencePresetName?: string;
  preferencePresetDescription?: string;
  proposer?: string;
  startBlock?: string;
  endBlock?: string;
  blockNumber?: string;
  txHash?: string;
  sourceEventId?: string;
}

export interface ProposalAnalysis {
  summary: string;
  recommendedVote: RecommendedVote;
  reasoning: string;
  riskScore: number;
  alignmentScore: number;
  mode: AnalysisMode;
}

export interface StoredProposal {
  proposalId: string;
  source: "manual" | "indexer";
  sourcePlatform?: "monad";
  preferencePresetId?: AavePreferencePresetId;
  preferencePresetName?: string;
  sourceEventId?: string;
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
  daoCreator?: string;
  daoTokenAddress?: string;
  daoTimelockAddress?: string;
  daoMetadataUri?: string;
  currentState?: string;
  choices?: string[];
  totalVotes?: number;
  sourceUrl?: string;
  sourceMetadata?: Record<string, unknown>;
  onchainVotes?: OnchainVoteRecord[];
  userRiskProfile: RiskProfile;
  ethicalFocus: string;
  status: "ANALYZED";
  analysis: ProposalAnalysis;
  createdAt: string;
  updatedAt: string;
}

export interface StoredDao {
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

export interface ProposalDatabase {
  proposals: Record<string, StoredProposal>;
  daos: Record<string, StoredDao>;
}

export interface AavePreferencePreset {
  id: AavePreferencePresetId;
  name: string;
  description: string;
  userRiskProfile: RiskProfile;
  ethicalFocus: string;
  favoredCategories: string[];
  cautiousCategories: string[];
  summary: string;
}
