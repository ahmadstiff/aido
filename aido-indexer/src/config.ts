import path from "node:path";
import dotenv from "dotenv";
import { getAddress } from "viem";
import { z } from "zod";

dotenv.config();

const optionalString = z.preprocess((value) => {
  if (typeof value !== "string") {
    return value;
  }

  const trimmed = value.trim();
  return trimmed === "" ? undefined : trimmed;
}, z.string().optional());

const optionalBigInt = z.preprocess((value) => {
  if (typeof value !== "string") {
    return value;
  }

  const trimmed = value.trim();
  return trimmed === "" ? undefined : trimmed;
}, z.coerce.bigint().optional());

const envSchema = z.object({
  INDEXER_MODE: z.enum(["single-governor", "factory"]).default("factory"),
  MONAD_RPC_URL: z.string().url().default("https://testnet-rpc.monad.xyz"),
  MONAD_CHAIN_ID: z.coerce.number().int().positive().default(10143),
  GOVERNOR_ADDRESS: optionalString,
  GOVERNOR_START_BLOCK: optionalBigInt,
  DAO_FACTORY_ADDRESS: optionalString,
  FACTORY_START_BLOCK: optionalBigInt,
  GOVERNOR_BOOTSTRAP_ADDRESSES: z.string().default(""),
  DAO_NAME: optionalString,
  DAO_CREATOR: optionalString,
  DAO_TOKEN_ADDRESS: optionalString,
  DAO_TIMELOCK_ADDRESS: optionalString,
  DAO_METADATA_URI: optionalString,
  BACKEND_URL: z.string().url().default("http://localhost:3001"),
  BACKEND_WEBHOOK_PATH: z.string().default("/api/trigger-analysis"),
  BACKEND_DAO_WEBHOOK_PATH: z.string().default("/api/register-dao"),
  INDEXER_SHARED_SECRET: optionalString,
  DELIVERY_INTERVAL_MS: z.coerce.number().int().nonnegative().default(1200),
  POLLING_INTERVAL_MS: z.coerce.number().int().positive().default(10000),
  STATE_FILE: z.string().default("data/state.json"),
});

const parsed = envSchema.parse(process.env);

function normalizeAddressList(raw: string): string[] {
  return raw
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean)
    .map((value) => getAddress(value));
}

export const indexerEnv = {
  mode: parsed.INDEXER_MODE,
  monadRpcUrl: parsed.MONAD_RPC_URL,
  monadChainId: parsed.MONAD_CHAIN_ID,
  governorAddress: parsed.GOVERNOR_ADDRESS
    ? getAddress(parsed.GOVERNOR_ADDRESS)
    : undefined,
  governorStartBlock: parsed.GOVERNOR_START_BLOCK,
  daoFactoryAddress: parsed.DAO_FACTORY_ADDRESS
    ? getAddress(parsed.DAO_FACTORY_ADDRESS)
    : undefined,
  factoryStartBlock: parsed.FACTORY_START_BLOCK,
  governorBootstrapAddresses: normalizeAddressList(
    parsed.GOVERNOR_BOOTSTRAP_ADDRESSES,
  ),
  daoName: parsed.DAO_NAME,
  daoCreator: parsed.DAO_CREATOR ? getAddress(parsed.DAO_CREATOR) : undefined,
  daoTokenAddress: parsed.DAO_TOKEN_ADDRESS
    ? getAddress(parsed.DAO_TOKEN_ADDRESS)
    : undefined,
  daoTimelockAddress: parsed.DAO_TIMELOCK_ADDRESS
    ? getAddress(parsed.DAO_TIMELOCK_ADDRESS)
    : undefined,
  daoMetadataUri: parsed.DAO_METADATA_URI,
  backendUrl: parsed.BACKEND_URL.replace(/\/$/, ""),
  backendWebhookPath: parsed.BACKEND_WEBHOOK_PATH.startsWith("/")
    ? parsed.BACKEND_WEBHOOK_PATH
    : `/${parsed.BACKEND_WEBHOOK_PATH}`,
  backendDaoWebhookPath: parsed.BACKEND_DAO_WEBHOOK_PATH.startsWith("/")
    ? parsed.BACKEND_DAO_WEBHOOK_PATH
    : `/${parsed.BACKEND_DAO_WEBHOOK_PATH}`,
  indexerSharedSecret: parsed.INDEXER_SHARED_SECRET,
  deliveryIntervalMs: parsed.DELIVERY_INTERVAL_MS,
  pollingIntervalMs: parsed.POLLING_INTERVAL_MS,
  stateFile: path.resolve(process.cwd(), parsed.STATE_FILE),
} as const;
