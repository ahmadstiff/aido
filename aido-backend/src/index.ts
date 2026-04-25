import cors from "cors";
import express, { type NextFunction, type Request, type Response } from "express";
import { ZodError, z } from "zod";
import { analyzeProposal } from "./analysis.js";
import { appEnv } from "./config.js";
import { castGovernorVote } from "./onchain.js";
import {
  applyPreferencePreset,
  listAavePreferencePresets,
} from "./preferences.js";
import {
  getDao,
  getProposal,
  listDaos,
  listProposals,
  saveDao,
  saveProposal,
} from "./storage.js";
import { aavePreferencePresetIds, riskProfiles } from "./types.js";
import type { AnalysisInput, StoredDao, StoredProposal } from "./types.js";

const app = express();

const manualAnalyzeSchema = z.object({
  proposalId: z.union([z.string(), z.number()]).optional(),
  proposalText: z.string().min(1),
  title: z.string().optional(),
  preferencePresetId: z.enum(aavePreferencePresetIds).optional(),
  userRiskProfile: z.enum(riskProfiles).default(appEnv.defaultRiskProfile),
  ethicalFocus: z.string().default(appEnv.defaultEthicalFocus),
  proposer: z.string().optional(),
  startBlock: z.union([z.string(), z.number()]).optional(),
  endBlock: z.union([z.string(), z.number()]).optional(),
  blockNumber: z.union([z.string(), z.number()]).optional(),
  txHash: z.string().optional(),
});

const daoRegistrationSchema = z.object({
  governorAddress: z.string().min(1),
  timelockAddress: z.string().optional(),
  tokenAddress: z.string().optional(),
  creator: z.string().optional(),
  name: z.string().optional(),
  metadataUri: z.string().optional(),
  chainId: z.number().int().positive().default(appEnv.monadChainId),
});

const triggerSchema = z.object({
  proposalId: z.union([z.string(), z.number()]),
  description: z.string().min(1),
  title: z.string().optional(),
  preferencePresetId: z.enum(aavePreferencePresetIds).optional(),
  proposer: z.string().optional(),
  startBlock: z.union([z.string(), z.number()]).optional(),
  endBlock: z.union([z.string(), z.number()]).optional(),
  blockNumber: z.union([z.string(), z.number()]).optional(),
  txHash: z.string().optional(),
  sourceEventId: z.string().optional(),
  chainId: z.number().int().positive().optional(),
  contractAddress: z.string().optional(),
  sourcePlatform: z.enum(["monad"]).optional(),
  daoName: z.string().optional(),
  daoCreator: z.string().optional(),
  daoTokenAddress: z.string().optional(),
  daoTimelockAddress: z.string().optional(),
  daoMetadataUri: z.string().optional(),
  currentState: z.string().optional(),
  choices: z.array(z.string()).optional(),
  totalVotes: z.number().optional(),
  sourceUrl: z.string().url().optional(),
  sourceMetadata: z.record(z.string(), z.unknown()).optional(),
  userRiskProfile: z.enum(riskProfiles).default(appEnv.defaultRiskProfile),
  ethicalFocus: z.string().default(appEnv.defaultEthicalFocus),
});

const voteSchema = z.object({
  proposalId: z.union([z.string(), z.number()]),
  support: z.enum(["FOR", "AGAINST", "ABSTAIN"]).optional(),
  reason: z.string().max(1000).optional(),
});

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || appEnv.allowedOrigins.includes(origin)) {
        callback(null, true);
        return;
      }

      callback(new Error(`Origin not allowed: ${origin}`));
    },
  }),
);
app.use(express.json({ limit: "1mb" }));

app.get("/health", (_req, res) => {
  res.json({
    ok: true,
    service: "aido-backend",
    analysisMode: appEnv.analysisMode,
    liveAiConfigured:
      appEnv.analysisMode !== "mock" && Boolean(appEnv.openaiApiKey),
    onchainConfigured: Boolean(appEnv.agentPrivateKey),
  });
});

app.get("/api/capabilities", (_req, res) => {
  const liveAiConfigured =
    appEnv.analysisMode !== "mock" && Boolean(appEnv.openaiApiKey);
  const onchainConfigured = Boolean(appEnv.agentPrivateKey);

  res.json({
    ai: {
      requestedMode: appEnv.analysisMode,
      provider: appEnv.aiGatewayApiKey ? "vercel-ai-gateway" : "openai",
      model: appEnv.openaiModel,
      liveAiConfigured,
      fallbackMode: "mock",
    },
    onchain: {
      chainId: appEnv.monadChainId,
      rpcUrl: appEnv.monadRpcUrl,
      ready: onchainConfigured,
      executionMode: "direct-governor-vote",
      missing: [...(appEnv.agentPrivateKey ? [] : ["AGENT_PRIVATE_KEY"])],
    },
    indexer: {
      sharedSecretConfigured: Boolean(appEnv.indexerSharedSecret),
    },
    governance: {
      supportedSources: ["monad"],
      aavePreferencePresets: listAavePreferencePresets(),
    },
  });
});

app.get("/api/daos", async (_req, res, next) => {
  try {
    const daos = await listDaos();
    res.json({ daos });
  } catch (error) {
    next(error);
  }
});

app.get("/api/daos/:governorAddress", async (req, res, next) => {
  try {
    const dao = await getDao(req.params.governorAddress);
    if (!dao) {
      res.status(404).json({ error: "DAO not found" });
      return;
    }

    res.json(dao);
  } catch (error) {
    next(error);
  }
});

app.post("/api/register-dao", async (req, res, next) => {
  try {
    if (appEnv.indexerSharedSecret) {
      const providedSecret = req.header("x-indexer-secret");
      if (providedSecret !== appEnv.indexerSharedSecret) {
        res.status(401).json({ error: "Invalid indexer secret" });
        return;
      }
    }

    const body = daoRegistrationSchema.parse(req.body);
    const existing = await getDao(body.governorAddress);
    const now = new Date().toISOString();

    const saved: StoredDao = {
      governorAddress: body.governorAddress,
      timelockAddress: body.timelockAddress,
      tokenAddress: body.tokenAddress,
      creator: body.creator,
      name: body.name,
      metadataUri: body.metadataUri,
      chainId: body.chainId,
      source: "factory",
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    };

    await saveDao(saved);
    res.json(saved);
  } catch (error) {
    next(error);
  }
});

app.get("/api/proposals", async (_req, res, next) => {
  try {
    const proposals = await listProposals();
    res.json({ proposals });
  } catch (error) {
    next(error);
  }
});

app.get("/api/proposals/:proposalId", async (req, res, next) => {
  try {
    const proposal = await getProposal(req.params.proposalId);
    if (!proposal) {
      res.status(404).json({ error: "Proposal not found" });
      return;
    }

    res.json(proposal);
  } catch (error) {
    next(error);
  }
});

app.get("/api/preferences/aave-presets", (_req, res) => {
  res.json({
    presets: listAavePreferencePresets(),
  });
});

app.post("/api/onchain/vote", async (req, res, next) => {
  try {
    const body = voteSchema.parse(req.body);
    const proposalId = String(body.proposalId);
    const proposal = await getProposal(proposalId);
    if (!proposal) {
      res.status(404).json({ error: "Proposal not found" });
      return;
    }

    const support = body.support ?? proposal.analysis.recommendedVote;
    const reason = (
      body.reason ??
      `AIDO agent vote based on ${proposal.preferencePresetName ?? "default policy"}: ${proposal.analysis.reasoning}`
    ).slice(0, 1000);

    const voteReceipt = await castGovernorVote({
      proposal,
      support,
      reason,
    });

    const updated: StoredProposal = {
      ...proposal,
      onchainVotes: [...(proposal.onchainVotes ?? []), voteReceipt],
      updatedAt: new Date().toISOString(),
    };

    await saveProposal(updated);
    res.json(updated);
  } catch (error) {
    next(error);
  }
});

app.post("/api/analyze", async (req, res, next) => {
  try {
    const body = manualAnalyzeSchema.parse(req.body);
    const proposalId = String(body.proposalId ?? `manual-${Date.now()}`);

    const input: AnalysisInput = applyPreferencePreset({
      proposalId,
      preferencePresetId: body.preferencePresetId,
      proposalText: body.proposalText,
      userRiskProfile: body.userRiskProfile,
      ethicalFocus: body.ethicalFocus,
      proposer: body.proposer,
      startBlock:
        body.startBlock === undefined ? undefined : String(body.startBlock),
      endBlock: body.endBlock === undefined ? undefined : String(body.endBlock),
      blockNumber:
        body.blockNumber === undefined ? undefined : String(body.blockNumber),
      txHash: body.txHash,
    });

    const existing = await getProposal(proposalId);
    const analysis = await analyzeProposal(input);
    const now = new Date().toISOString();

    const saved = await saveProposal({
      proposalId,
      source: "manual",
      preferencePresetId: input.preferencePresetId,
      preferencePresetName: input.preferencePresetName,
      title: body.title,
      description: body.proposalText,
      proposer: body.proposer,
      startBlock: input.startBlock,
      endBlock: input.endBlock,
      blockNumber: input.blockNumber,
      txHash: body.txHash,
      userRiskProfile: input.userRiskProfile,
      ethicalFocus: input.ethicalFocus,
      status: "ANALYZED",
      analysis,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    });

    res.json(saved);
  } catch (error) {
    next(error);
  }
});

app.post("/api/trigger-analysis", async (req, res, next) => {
  try {
    if (appEnv.indexerSharedSecret) {
      const providedSecret = req.header("x-indexer-secret");
      if (providedSecret !== appEnv.indexerSharedSecret) {
        res.status(401).json({ error: "Invalid indexer secret" });
        return;
      }
    }

    const body = triggerSchema.parse(req.body);
    const proposalId = String(body.proposalId);
    const input: AnalysisInput = applyPreferencePreset({
      proposalId,
      preferencePresetId: body.preferencePresetId,
      proposalText: body.description,
      userRiskProfile: body.userRiskProfile,
      ethicalFocus: body.ethicalFocus,
      proposer: body.proposer,
      startBlock:
        body.startBlock === undefined ? undefined : String(body.startBlock),
      endBlock: body.endBlock === undefined ? undefined : String(body.endBlock),
      blockNumber:
        body.blockNumber === undefined ? undefined : String(body.blockNumber),
      txHash: body.txHash,
      sourceEventId: body.sourceEventId,
    });

    const existing = await getProposal(proposalId);
    const analysis = await analyzeProposal(input);
    const now = new Date().toISOString();

    const saved: StoredProposal = {
      proposalId,
      source: "indexer",
      sourcePlatform: body.sourcePlatform,
      preferencePresetId: input.preferencePresetId,
      preferencePresetName: input.preferencePresetName,
      sourceEventId: body.sourceEventId,
      title: body.title,
      description: body.description,
      proposer: body.proposer,
      startBlock: input.startBlock,
      endBlock: input.endBlock,
      blockNumber: input.blockNumber,
      txHash: body.txHash,
      chainId: body.chainId,
      contractAddress: body.contractAddress,
      daoName: body.daoName,
      daoCreator: body.daoCreator,
      daoTokenAddress: body.daoTokenAddress,
      daoTimelockAddress: body.daoTimelockAddress,
      daoMetadataUri: body.daoMetadataUri,
      currentState: body.currentState,
      choices: body.choices,
      totalVotes: body.totalVotes,
      sourceUrl: body.sourceUrl,
      sourceMetadata: body.sourceMetadata,
      userRiskProfile: input.userRiskProfile,
      ethicalFocus: input.ethicalFocus,
      status: "ANALYZED",
      analysis,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    };

    await saveProposal(saved);
    res.json(saved);
  } catch (error) {
    next(error);
  }
});

app.use(
  (error: unknown, _req: Request, res: Response, _next: NextFunction) => {
    if (error instanceof ZodError) {
      res.status(400).json({
        error: "Invalid request payload",
        details: error.flatten(),
      });
      return;
    }

    if (error instanceof Error) {
      res.status(500).json({
        error: error.message,
      });
      return;
    }

    res.status(500).json({
      error: "Unknown server error",
    });
  },
);

app.listen(appEnv.port, () => {
  console.log(
    `[backend] listening on http://localhost:${appEnv.port} (mode=${appEnv.analysisMode})`,
  );
});
