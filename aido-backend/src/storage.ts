import fs from "node:fs/promises";
import path from "node:path";
import { appEnv } from "./config.js";
import type { ProposalDatabase, StoredDao, StoredProposal } from "./types.js";

const emptyDatabase: ProposalDatabase = {
  proposals: {},
  daos: {},
};

let writeQueue = Promise.resolve();

export function buildProposalKey(options: {
  proposalId: string;
  contractAddress?: string;
}): string {
  const scope = options.contractAddress?.toLowerCase() ?? "manual";
  return `${scope}:${options.proposalId}`;
}

async function ensureDatabaseFile(): Promise<void> {
  await fs.mkdir(path.dirname(appEnv.dataFile), { recursive: true });

  try {
    await fs.access(appEnv.dataFile);
  } catch {
    await fs.writeFile(
      appEnv.dataFile,
      JSON.stringify(emptyDatabase, null, 2),
      "utf8",
    );
  }
}

function recoverJsonObjectPrefix(raw: string): string | null {
  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let index = 0; index < raw.length; index += 1) {
    const char = raw[index];

    if (escaped) {
      escaped = false;
      continue;
    }

    if (char === "\\") {
      escaped = true;
      continue;
    }

    if (char === "\"") {
      inString = !inString;
      continue;
    }

    if (inString) {
      continue;
    }

    if (char === "{") {
      depth += 1;
      continue;
    }

    if (char === "}") {
      depth -= 1;
      if (depth === 0) {
        return raw.slice(0, index + 1);
      }
    }
  }

  return null;
}

async function parseDatabase(raw: string): Promise<ProposalDatabase> {
  try {
    const parsed = JSON.parse(raw) as Partial<ProposalDatabase>;

    return {
      proposals: parsed.proposals ?? {},
      daos: parsed.daos ?? {},
    };
  } catch (error) {
    const recovered = recoverJsonObjectPrefix(raw);
    if (!recovered) {
      throw error;
    }

    const parsed = JSON.parse(recovered) as Partial<ProposalDatabase>;
    const repaired: ProposalDatabase = {
      proposals: parsed.proposals ?? {},
      daos: parsed.daos ?? {},
    };
    const backupFile = `${appEnv.dataFile}.corrupt-${Date.now()}.json`;

    await fs.writeFile(backupFile, raw, "utf8");
    await writeDatabase(repaired);

    console.warn(
      `[backend] Recovered corrupted proposal database. Backup saved to ${backupFile}`,
    );

    return repaired;
  }
}

async function readDatabase(): Promise<ProposalDatabase> {
  await ensureDatabaseFile();

  const raw = await fs.readFile(appEnv.dataFile, "utf8");
  if (!raw.trim()) {
    return emptyDatabase;
  }

  return parseDatabase(raw);
}

async function writeDatabase(database: ProposalDatabase): Promise<void> {
  await ensureDatabaseFile();
  const next = JSON.stringify(database, null, 2);
  const tempFile = `${appEnv.dataFile}.tmp-${process.pid}-${Date.now()}`;

  await fs.writeFile(tempFile, next, "utf8");
  await fs.rename(tempFile, appEnv.dataFile);
}

async function withWriteLock<T>(operation: () => Promise<T>): Promise<T> {
  const previous = writeQueue;
  let release!: () => void;

  writeQueue = new Promise<void>((resolve) => {
    release = resolve;
  });

  await previous;

  try {
    return await operation();
  } finally {
    release();
  }
}

export async function saveProposal(
  proposal: StoredProposal,
): Promise<StoredProposal> {
  return withWriteLock(async () => {
    const database = await readDatabase();
    database.proposals[proposal.proposalKey] = proposal;
    await writeDatabase(database);
    return proposal;
  });
}

export async function listProposals(): Promise<StoredProposal[]> {
  const database = await readDatabase();

  return Object.values(database.proposals).sort((left, right) =>
    right.updatedAt.localeCompare(left.updatedAt),
  );
}

export async function getProposal(
  proposalIdOrKey: string,
): Promise<StoredProposal | null> {
  const database = await readDatabase();
  if (database.proposals[proposalIdOrKey]) {
    return database.proposals[proposalIdOrKey] ?? null;
  }

  return (
    Object.values(database.proposals).find((proposal) =>
      proposal.proposalId === proposalIdOrKey ||
      proposal.proposalKey === proposalIdOrKey,
    ) ?? null
  );
}

export async function saveDao(dao: StoredDao): Promise<StoredDao> {
  return withWriteLock(async () => {
    const database = await readDatabase();
    database.daos[dao.governorAddress.toLowerCase()] = dao;
    await writeDatabase(database);
    return dao;
  });
}

export async function listDaos(): Promise<StoredDao[]> {
  const database = await readDatabase();

  return Object.values(database.daos).sort((left, right) =>
    right.updatedAt.localeCompare(left.updatedAt),
  );
}

export async function getDao(governorAddress: string): Promise<StoredDao | null> {
  const database = await readDatabase();
  return database.daos[governorAddress.toLowerCase()] ?? null;
}
