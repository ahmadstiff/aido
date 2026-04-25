import path from "node:path";
import dotenv from "dotenv";
import { z } from "zod";
import { riskProfiles } from "./types.js";

dotenv.config();

const optionalString = z.preprocess((value) => {
  if (typeof value !== "string") {
    return value;
  }

  const trimmed = value.trim();
  return trimmed === "" ? undefined : trimmed;
}, z.string().optional());

const optionalUrl = z.preprocess((value) => {
  if (typeof value !== "string") {
    return value;
  }

  const trimmed = value.trim();
  return trimmed === "" ? undefined : trimmed;
}, z.string().url().optional());

const envSchema = z.object({
  PORT: z.coerce.number().int().positive().default(3001),
  ALLOWED_ORIGINS: z.string().default("http://localhost:3000"),
  ANALYSIS_MODE: z.enum(["auto", "mock", "openai"]).default("auto"),
  AI_GATEWAY_API_KEY: optionalString,
  AI_GATEWAY_BASE_URL: optionalUrl,
  AI_GATEWAY_MODEL: z.string().default("google/gemini-2.0-flash-lite"),
  OPENAI_API_KEY: optionalString,
  OPENAI_BASE_URL: optionalUrl,
  OPENAI_MODEL: z.string().default("gpt-4.1"),
  INDEXER_SHARED_SECRET: optionalString,
  MONAD_RPC_URL: z.string().url().default("https://testnet-rpc.monad.xyz"),
  MONAD_CHAIN_ID: z.coerce.number().int().positive().default(10143),
  AGENT_PRIVATE_KEY: optionalString,
  DEFAULT_VOTING_PERIOD_SECONDS: z.coerce.number().int().positive().default(86400),
  DEFAULT_RISK_PROFILE: z.enum(riskProfiles).default("NEUTRAL"),
  DEFAULT_ETHICAL_FOCUS: z.string().default("DECENTRALIZATION"),
  DATA_FILE: z.string().default("data/proposals.json"),
});

const parsed = envSchema.parse(process.env);

export const appEnv = {
  port: parsed.PORT,
  allowedOrigins: parsed.ALLOWED_ORIGINS.split(",")
    .map((origin) => origin.trim())
    .filter(Boolean),
  analysisMode: parsed.ANALYSIS_MODE,
  aiGatewayApiKey: parsed.AI_GATEWAY_API_KEY,
  aiGatewayBaseUrl: parsed.AI_GATEWAY_BASE_URL,
  aiGatewayModel: parsed.AI_GATEWAY_MODEL,
  openaiApiKey: parsed.AI_GATEWAY_API_KEY ?? parsed.OPENAI_API_KEY,
  openaiBaseUrl:
    parsed.AI_GATEWAY_BASE_URL ??
    parsed.OPENAI_BASE_URL ??
    "https://ai-gateway.vercel.sh/v1",
  openaiModel: parsed.AI_GATEWAY_API_KEY
    ? parsed.AI_GATEWAY_MODEL
    : parsed.OPENAI_MODEL,
  indexerSharedSecret: parsed.INDEXER_SHARED_SECRET,
  monadRpcUrl: parsed.MONAD_RPC_URL,
  monadChainId: parsed.MONAD_CHAIN_ID,
  agentPrivateKey: parsed.AGENT_PRIVATE_KEY,
  defaultVotingPeriodSeconds: parsed.DEFAULT_VOTING_PERIOD_SECONDS,
  defaultRiskProfile: parsed.DEFAULT_RISK_PROFILE,
  defaultEthicalFocus: parsed.DEFAULT_ETHICAL_FOCUS,
  dataFile: path.resolve(process.cwd(), parsed.DATA_FILE),
} as const;
