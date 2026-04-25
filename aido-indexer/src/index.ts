import { createPublicClient, getAddress, http } from "viem";
import { daoCreatedEvent } from "./abi/factory.js";
import { proposalCreatedEvent } from "./abi/governor.js";
import { indexerEnv } from "./config.js";
import { readState, writeState } from "./state.js";
import { sendDaoToBackend, sendProposalToBackend } from "./webhook.js";
import type { IndexedGovernorState, IndexerState, ProposalWebhookPayload } from "./types.js";

function assertSingleGovernorConfig(): void {
  if (!indexerEnv.governorAddress) {
    throw new Error(
      "Missing GOVERNOR_ADDRESS. Fill it in aido-indexer/.env before starting single-governor mode.",
    );
  }
}

function assertFactoryConfig(): void {
  if (!indexerEnv.daoFactoryAddress) {
    throw new Error(
      "Missing DAO_FACTORY_ADDRESS. Fill it in aido-indexer/.env before starting factory mode.",
    );
  }
}

function seedBootstrapGovernors(state: IndexerState): IndexerState {
  const governors = { ...state.governors };

  for (const governorAddress of indexerEnv.governorBootstrapAddresses) {
    const key = governorAddress.toLowerCase();
    if (!governors[key]) {
      governors[key] = {
        governorAddress,
        lastProcessedBlock: indexerEnv.governorStartBlock?.toString() ?? null,
      };
    }
  }

  if (indexerEnv.governorAddress) {
    const key = indexerEnv.governorAddress.toLowerCase();
    if (!governors[key]) {
      governors[key] = {
        governorAddress: indexerEnv.governorAddress,
        lastProcessedBlock: indexerEnv.governorStartBlock?.toString() ?? null,
      };
    }
  }

  return {
    ...state,
    governors,
  };
}

function toProposalPayload(log: {
  args: {
    proposalId?: bigint;
    proposer?: string;
    startBlock?: bigint;
    endBlock?: bigint;
    description?: string;
  };
  blockNumber: bigint | null;
  transactionHash: string | null;
  logIndex: number | null;
  address: string;
}, governor: IndexedGovernorState): ProposalWebhookPayload {
  const txHash = log.transactionHash ?? undefined;
  const logIndex = log.logIndex ?? 0;

  return {
    proposalId: log.args.proposalId!.toString(),
    description: log.args.description!,
    proposer: log.args.proposer!,
    startBlock: log.args.startBlock!.toString(),
    endBlock: log.args.endBlock!.toString(),
    blockNumber: log.blockNumber?.toString(),
    txHash,
    sourceEventId: `${txHash ?? "unknown"}:${String(logIndex)}`,
    chainId: indexerEnv.monadChainId,
    contractAddress: log.address,
    sourcePlatform: "monad",
    daoName: governor.name,
    daoCreator: governor.creator,
    daoTokenAddress: governor.tokenAddress,
    daoTimelockAddress: governor.timelockAddress,
    daoMetadataUri: governor.metadataUri,
    currentState: "ACTIVE",
    sourceMetadata: {
      indexedByMode: indexerEnv.mode,
    },
  };
}

async function syncFactory(
  client: ReturnType<typeof createPublicClient>,
  state: IndexerState,
  latestBlock: bigint,
): Promise<IndexerState> {
  assertFactoryConfig();

  const fromBlock = state.lastFactoryProcessedBlock
    ? BigInt(state.lastFactoryProcessedBlock) + 1n
    : indexerEnv.factoryStartBlock;

  if (fromBlock === undefined || fromBlock > latestBlock) {
    return state;
  }

  const logs = await client.getLogs({
    address: indexerEnv.daoFactoryAddress,
    event: daoCreatedEvent,
    fromBlock,
    toBlock: latestBlock,
  });

  const nextState: IndexerState = {
    ...state,
    governors: { ...state.governors },
    lastFactoryProcessedBlock: latestBlock.toString(),
  };

  for (const log of logs) {
    if (
      !log.args.governor ||
      !log.args.creator ||
      !log.args.token ||
      !log.args.timelock
    ) {
      console.warn("[indexer:factory] skipped DaoCreated log with missing args");
      continue;
    }

    const governorAddress = getAddress(log.args.governor);
    const key = governorAddress.toLowerCase();
    const existing = nextState.governors[key];
    const registrationBlock = log.blockNumber ?? latestBlock;

    const governorState: IndexedGovernorState = {
      governorAddress,
      lastProcessedBlock:
        existing?.lastProcessedBlock ??
        (registrationBlock > 0n ? (registrationBlock - 1n).toString() : "0"),
      name: log.args.name,
      creator: getAddress(log.args.creator),
      tokenAddress: getAddress(log.args.token),
      timelockAddress: getAddress(log.args.timelock),
      metadataUri: log.args.metadataURI,
      registeredAt: new Date().toISOString(),
    };

    nextState.governors[key] = governorState;

    await sendDaoToBackend({
      governorAddress,
      timelockAddress: governorState.timelockAddress,
      tokenAddress: governorState.tokenAddress,
      creator: governorState.creator,
      name: governorState.name,
      metadataUri: governorState.metadataUri,
      chainId: indexerEnv.monadChainId,
    });

    console.log(
      `[indexer:factory] discovered dao governor=${governorAddress} name=${governorState.name ?? "unnamed"}`,
    );
  }

  return nextState;
}

async function syncGovernor(
  client: ReturnType<typeof createPublicClient>,
  state: IndexerState,
  governorAddress: string,
  latestBlock: bigint,
): Promise<IndexerState> {
  const key = governorAddress.toLowerCase();
  const governor = state.governors[key] ?? {
    governorAddress,
    lastProcessedBlock: null,
  };

  const fromBlock = governor.lastProcessedBlock
    ? BigInt(governor.lastProcessedBlock) + 1n
    : indexerEnv.governorStartBlock;

  if (fromBlock === undefined || fromBlock > latestBlock) {
    return state;
  }

  const logs = await client.getLogs({
    address: getAddress(governorAddress),
    event: proposalCreatedEvent,
    fromBlock,
    toBlock: latestBlock,
  });

  for (const log of logs) {
    if (
      log.args.proposalId === undefined ||
      log.args.proposer === undefined ||
      log.args.startBlock === undefined ||
      log.args.endBlock === undefined ||
      log.args.description === undefined
    ) {
      console.warn(
        `[indexer:governor] skipped malformed ProposalCreated log for governor=${governorAddress}`,
      );
      continue;
    }

    const payload = toProposalPayload(log, governor);
    await sendProposalToBackend(payload);
    console.log(
      `[indexer:governor] delivered proposal=${payload.proposalId} governor=${governorAddress} block=${payload.blockNumber}`,
    );
  }

  return {
    ...state,
    governors: {
      ...state.governors,
      [key]: {
        ...governor,
        governorAddress: getAddress(governorAddress),
        lastProcessedBlock: latestBlock.toString(),
      },
    },
  };
}

async function pollLoop(mode: "single-governor" | "factory"): Promise<void> {
  let state = seedBootstrapGovernors(await readState());
  let stopped = false;

  const client = createPublicClient({
    transport: http(indexerEnv.monadRpcUrl),
  });

  const shutdown = (signal: string): void => {
    stopped = true;
    console.log(`[indexer:${mode}] received ${signal}, shutting down`);
  };

  process.on("SIGINT", () => {
    shutdown("SIGINT");
  });
  process.on("SIGTERM", () => {
    shutdown("SIGTERM");
  });

  console.log(
    `[indexer:${mode}] polling Monad testnet via ${indexerEnv.monadRpcUrl}`,
  );
  console.log(
    `[indexer:${mode}] proposal webhook => ${indexerEnv.backendUrl}${indexerEnv.backendWebhookPath}`,
  );
  console.log(
    `[indexer:${mode}] dao webhook => ${indexerEnv.backendUrl}${indexerEnv.backendDaoWebhookPath}`,
  );

  while (!stopped) {
    try {
      const latestBlock = await client.getBlockNumber();

      if (mode === "factory") {
        state = await syncFactory(client, state, latestBlock);
      }

      const governorAddresses =
        mode === "single-governor" && indexerEnv.governorAddress
          ? [indexerEnv.governorAddress]
          : Object.values(state.governors).map((governor) => governor.governorAddress);

      for (const governorAddress of governorAddresses) {
        state = await syncGovernor(client, state, governorAddress, latestBlock);
      }

      await writeState(state);
    } catch (error) {
      console.error(`[indexer:${mode}] sync failed`, error);
    }

    if (stopped) {
      break;
    }

    await new Promise((resolve) =>
      setTimeout(resolve, indexerEnv.pollingIntervalMs),
    );
  }
}

async function main(): Promise<void> {
  if (indexerEnv.mode === "single-governor") {
    assertSingleGovernorConfig();
    await pollLoop("single-governor");
    return;
  }

  assertFactoryConfig();
  await pollLoop("factory");
}

void main().catch((error) => {
  console.error("[indexer] fatal error", error);
  process.exit(1);
});
