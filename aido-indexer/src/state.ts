import fs from "node:fs/promises";
import path from "node:path";
import { indexerEnv } from "./config.js";
import type { IndexerState } from "./types.js";

const emptyState: IndexerState = {
  lastFactoryProcessedBlock: null,
  governors: {},
};

async function ensureStateFile(): Promise<void> {
  await fs.mkdir(path.dirname(indexerEnv.stateFile), { recursive: true });

  try {
    await fs.access(indexerEnv.stateFile);
  } catch {
    await fs.writeFile(
      indexerEnv.stateFile,
      JSON.stringify(emptyState, null, 2),
      "utf8",
    );
  }
}

export async function readState(): Promise<IndexerState> {
  await ensureStateFile();
  const raw = await fs.readFile(indexerEnv.stateFile, "utf8");
  if (!raw.trim()) {
    return emptyState;
  }

  const parsed = JSON.parse(raw) as Partial<IndexerState>;

  return {
    lastFactoryProcessedBlock: parsed.lastFactoryProcessedBlock ?? null,
    governors: parsed.governors ?? {},
  };
}

export async function writeState(state: IndexerState): Promise<void> {
  await ensureStateFile();
  await fs.writeFile(indexerEnv.stateFile, JSON.stringify(state, null, 2), "utf8");
}
