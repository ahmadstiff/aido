export interface IndexedGovernorState {
  governorAddress: string;
  lastProcessedBlock: string | null;
  name?: string;
  creator?: string;
  tokenAddress?: string;
  timelockAddress?: string;
  metadataUri?: string;
  registeredAt?: string;
}

export interface IndexerState {
  lastFactoryProcessedBlock: string | null;
  governors: Record<string, IndexedGovernorState>;
}

export interface DaoWebhookPayload {
  governorAddress: string;
  timelockAddress?: string;
  tokenAddress?: string;
  creator?: string;
  name?: string;
  metadataUri?: string;
  chainId: number;
}

export interface ProposalWebhookPayload {
  proposalId: string;
  title?: string;
  description: string;
  proposer?: string;
  startBlock?: string;
  endBlock?: string;
  blockNumber?: string;
  txHash?: string;
  sourceEventId: string;
  chainId: number;
  contractAddress: string;
  sourcePlatform?: "monad";
  daoName?: string;
  daoCreator?: string;
  daoTokenAddress?: string;
  daoTimelockAddress?: string;
  daoMetadataUri?: string;
  currentState?: string;
  sourceMetadata?: Record<string, unknown>;
}
