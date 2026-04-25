import { Output, generateText } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { z } from "zod";
import { appEnv } from "./config.js";
import { buildPrompt, buildSystemPrompt } from "./prompts.js";
import { getAavePreferencePreset } from "./preferences.js";
import type {
  AnalysisInput,
  ProposalAnalysis,
  RecommendedVote,
} from "./types.js";

const analysisSchema = z.object({
  summary: z.string().min(1).max(400),
  recommendedVote: z.enum(["FOR", "AGAINST", "ABSTAIN"]),
  reasoning: z.string().min(1).max(1200),
  riskScore: z.number().int().min(1).max(100),
  alignmentScore: z.number().int().min(1).max(100),
});

interface GatewayChatCompletionResponse {
  choices?: Array<{
    message?: {
      content?: string | Array<{ type?: string; text?: string }>;
    };
  }>;
}

function shouldUseOpenAI(): boolean {
  if (appEnv.analysisMode === "mock") {
    return false;
  }

  if (appEnv.analysisMode === "openai" && !appEnv.openaiApiKey) {
    throw new Error(
      "ANALYSIS_MODE=openai requires OPENAI_API_KEY to be configured.",
    );
  }

  return Boolean(appEnv.openaiApiKey);
}

function summarizeText(text: string): string {
  const compact = text.replace(/\s+/g, " ").trim();
  if (compact.length <= 220) {
    return compact;
  }

  return `${compact.slice(0, 217)}...`;
}

function extractJsonObject(text: string): string {
  const trimmed = text.trim();
  if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
    return trimmed;
  }

  const fencedMatch = trimmed.match(/```json\s*([\s\S]*?)```/i);
  if (fencedMatch?.[1]) {
    return fencedMatch[1].trim();
  }

  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  if (start !== -1 && end !== -1 && end > start) {
    return trimmed.slice(start, end + 1);
  }

  throw new Error("AI response did not contain a valid JSON object.");
}

function parseGatewayMessageContent(
  content: string | Array<{ type?: string; text?: string }> | undefined,
): string {
  if (typeof content === "string") {
    return content;
  }

  if (Array.isArray(content)) {
    return content
      .map((item) => item.text ?? "")
      .join("")
      .trim();
  }

  return "";
}

function detectProposalCategories(text: string): string[] {
  const normalized = text.toLowerCase();
  const categories = new Set<string>();

  if (/security|audit|bug bounty|patch|fix|incident|exploit|oracle/.test(normalized)) {
    categories.add("security");
    categories.add("risk");
  }

  if (/risk|ltv|liquidation|emode|reserve factor|steward|parameter/.test(normalized)) {
    categories.add("risk");
  }

  if (/treasury|funding|budget|committee|allowance|compensation|grant/.test(normalized)) {
    categories.add("treasury");
    categories.add("funding-efficiency");
  }

  if (/listing|onboard|market|instance|asset|collateral|plasma/.test(normalized)) {
    categories.add("listing");
    categories.add("growth");
  }

  if (/delegate|orbit|governance|snapshot|quorum|vote|forum|decentral/.test(normalized)) {
    categories.add("governance");
    categories.add("delegate");
  }

  if (/gho|gas token/.test(normalized)) {
    categories.add("gho");
    categories.add("framework");
  }

  if (/framework|strategy|design|architecture/.test(normalized)) {
    categories.add("framework");
  }

  if (/emission|incentive|stk|rewards/.test(normalized)) {
    categories.add("emissions");
    categories.add("legacy-emissions");
  }

  if (/deprecat|phase out|migration/.test(normalized)) {
    categories.add("deprecation");
    categories.add("budget-cuts");
  }

  return [...categories];
}

function createMockAnalysis(input: AnalysisInput): ProposalAnalysis {
  const normalized = input.proposalText.toLowerCase();
  const isSecurityProposal =
    /security|audit|bug bounty|patch|fix|incident|exploit/.test(normalized);
  const isTreasuryProposal =
    /treasury|transfer|grant|marketing|incentive|fund|budget/.test(normalized);
  const isGovernanceProposal =
    /governance|delegate|quorum|voting|validator|decentral/.test(normalized);
  const isHighRisk =
    /mint|bridge|upgrade|proxy|borrow|leverage|emergency/.test(normalized);
  const preset = input.preferencePresetId
    ? getAavePreferencePreset(input.preferencePresetId)
    : undefined;
  const categories = detectProposalCategories(input.proposalText);
  const favoredHits =
    preset?.favoredCategories.filter((category) => categories.includes(category))
      .length ?? 0;
  const cautiousHits =
    preset?.cautiousCategories.filter((category) =>
      categories.includes(category),
    ).length ?? 0;

  let recommendedVote: RecommendedVote = "ABSTAIN";
  let riskScore = 50;
  let alignmentScore = 50;
  let reasoning =
    "Proposal membutuhkan validasi lanjutan karena belum memberi sinyal yang cukup kuat untuk keputusan otomatis.";

  if (isSecurityProposal) {
    recommendedVote = "FOR";
    riskScore = 28;
    alignmentScore = 84;
    reasoning =
      "Proposal berfokus pada penguatan keamanan protokol. Ini biasanya sejalan dengan semua profil risiko karena mengurangi kemungkinan kerugian jangka panjang.";
  } else if (isTreasuryProposal && input.userRiskProfile === "CONSERVATIVE") {
    recommendedVote = "AGAINST";
    riskScore = isHighRisk ? 82 : 68;
    alignmentScore = 34;
    reasoning =
      "Proposal memakai dana treasury untuk ekspansi atau pengeluaran baru. Untuk profil konservatif, manfaatnya belum cukup jelas dibanding risiko eksekusi dan akuntabilitas.";
  } else if (isTreasuryProposal && input.userRiskProfile === "AGGRESSIVE") {
    recommendedVote = "FOR";
    riskScore = isHighRisk ? 72 : 58;
    alignmentScore = 76;
    reasoning =
      "Proposal treasury ini masih berisiko, tetapi profil agresif cenderung menerima trade-off demi pertumbuhan ekosistem dan potensi upside yang lebih tinggi.";
  } else if (isGovernanceProposal) {
    recommendedVote = "FOR";
    riskScore = isHighRisk ? 55 : 40;
    alignmentScore = 79;
    reasoning =
      "Proposal tampak memperbaiki koordinasi governance atau desentralisasi. Itu cukup selaras dengan tujuan partisipasi dan kesehatan DAO dalam jangka panjang.";
  } else if (isHighRisk) {
    recommendedVote = "AGAINST";
    riskScore = 85;
    alignmentScore = 27;
    reasoning =
      "Proposal mengandung kata kunci yang biasanya berkaitan dengan perubahan besar atau sensitif. Tanpa konteks tambahan, pendekatan paling aman adalah menolak.";
  }

  if (preset && favoredHits > 0) {
    alignmentScore = Math.min(95, alignmentScore + favoredHits * 10);
    reasoning = `${reasoning} Proposal ini juga cukup cocok dengan preset ${preset.name} karena menyentuh area prioritas ${categories.filter((category) => preset.favoredCategories.includes(category)).join(", ")}.`;
  }

  if (preset && cautiousHits > 0) {
    riskScore = Math.min(95, riskScore + cautiousHits * 8);
    alignmentScore = Math.max(15, alignmentScore - cautiousHits * 12);
    reasoning = `${reasoning} Preset ${preset.name} menandai area ${categories.filter((category) => preset.cautiousCategories.includes(category)).join(", ")} sebagai area yang perlu kehati-hatian ekstra.`;

    if (
      recommendedVote === "FOR" &&
      input.userRiskProfile === "CONSERVATIVE" &&
      cautiousHits > favoredHits
    ) {
      recommendedVote = "ABSTAIN";
    }

    if (
      recommendedVote === "ABSTAIN" &&
      input.userRiskProfile === "CONSERVATIVE" &&
      cautiousHits >= 2
    ) {
      recommendedVote = "AGAINST";
    }
  }

  return {
    summary: summarizeText(input.proposalText),
    recommendedVote,
    reasoning: `${reasoning} Focus pengguna saat ini adalah ${input.ethicalFocus}.`,
    riskScore,
    alignmentScore,
    mode: "mock",
  };
}

async function createOpenAiAnalysis(
  input: AnalysisInput,
): Promise<ProposalAnalysis> {
  const openai = createOpenAI({
    apiKey: appEnv.openaiApiKey,
    baseURL: appEnv.openaiBaseUrl,
  });

  const result = await generateText({
    model: openai(appEnv.openaiModel),
    output: Output.object({
      schema: analysisSchema,
    }),
    system: buildSystemPrompt(input),
    prompt: buildPrompt(input),
  });

  return {
    ...result.output,
    mode: "openai",
  };
}

async function createGatewayAnalysis(
  input: AnalysisInput,
): Promise<ProposalAnalysis> {
  const response = await fetch(`${appEnv.openaiBaseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${appEnv.openaiApiKey}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: appEnv.openaiModel,
      temperature: 0.2,
      messages: [
        {
          role: "system",
          content: `${buildSystemPrompt(input)} Return JSON only with keys: summary, recommendedVote, reasoning, riskScore, alignmentScore.`,
        },
        {
          role: "user",
          content: buildPrompt(input),
        },
      ],
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(
      `AI Gateway request failed with ${response.status}: ${body || response.statusText}`,
    );
  }

  const payload = (await response.json()) as GatewayChatCompletionResponse;
  const rawContent = parseGatewayMessageContent(payload.choices?.[0]?.message?.content);
  const parsed = JSON.parse(extractJsonObject(rawContent));
  const object = analysisSchema.parse(parsed);

  return {
    ...object,
    mode: "openai",
  };
}

export async function analyzeProposal(
  input: AnalysisInput,
): Promise<ProposalAnalysis> {
  if (!shouldUseOpenAI()) {
    return createMockAnalysis(input);
  }

  try {
    if (appEnv.aiGatewayApiKey) {
      return await createGatewayAnalysis(input);
    }

    return await createOpenAiAnalysis(input);
  } catch (error) {
    if (appEnv.analysisMode === "openai") {
      throw error;
    }

    console.warn(
      "[backend] OpenAI analysis failed, falling back to mock mode.",
      error,
    );
    return createMockAnalysis(input);
  }
}
