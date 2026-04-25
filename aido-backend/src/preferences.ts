import { appEnv } from "./config.js";
import type {
  AavePreferencePreset,
  AavePreferencePresetId,
  AnalysisInput,
} from "./types.js";

export const aavePreferencePresets: readonly AavePreferencePreset[] = [
  {
    id: "conservative",
    name: "Conservative",
    description:
      "Memprioritaskan keamanan protokol, minimisasi downside, dan kehati-hatian pada proposal ekspansi atau upgrade besar.",
    userRiskProfile: "CONSERVATIVE",
    ethicalFocus: "SECURITY",
    favoredCategories: ["risk", "security", "deprecation", "oracle"],
    cautiousCategories: ["listing", "treasury", "framework", "emissions"],
    summary:
      "Utamakan proposal yang mengurangi risiko, memperketat parameter, dan memperkuat safety rails.",
  },
  {
    id: "treasury-discipline",
    name: "Treasury Discipline",
    description:
      "Memprioritaskan efisiensi biaya, penggunaan treasury yang terukur, dan pembiayaan yang punya akuntabilitas kuat.",
    userRiskProfile: "CONSERVATIVE",
    ethicalFocus: "TREASURY_DISCIPLINE",
    favoredCategories: ["treasury", "funding-efficiency", "emissions"],
    cautiousCategories: ["growth", "listing", "framework"],
    summary:
      "Dukung pengeluaran yang jelas KPI-nya, skeptis terhadap insentif atau budget yang longgar.",
  },
  {
    id: "growth",
    name: "Growth",
    description:
      "Lebih terbuka terhadap listing asset baru, ekspansi pasar, dan proposal yang meningkatkan penggunaan serta TVL.",
    userRiskProfile: "AGGRESSIVE",
    ethicalFocus: "GROWTH",
    favoredCategories: ["listing", "growth", "expansion", "framework"],
    cautiousCategories: ["deprecation", "budget-cuts"],
    summary:
      "Cari upside dari ekspansi market dan adopsi aset baru selama risk controls masih masuk akal.",
  },
  {
    id: "governance-maximalist",
    name: "Governance Maximalist",
    description:
      "Memprioritaskan partisipasi governance, dukungan delegate, dan proposal yang memperkuat desentralisasi proses.",
    userRiskProfile: "NEUTRAL",
    ethicalFocus: "DECENTRALIZATION",
    favoredCategories: ["governance", "delegate", "orbit", "framework"],
    cautiousCategories: ["treasury", "emissions"],
    summary:
      "Utamakan proposal yang memperkuat koordinasi DAO, kualitas voting, dan keberlanjutan delegate set.",
  },
  {
    id: "gho-strategy",
    name: "GHO Strategy",
    description:
      "Fokus pada ekspansi utilitas GHO, efisiensi likuiditas GHO, dan proposal strategis yang memperkuat posisi GHO.",
    userRiskProfile: "NEUTRAL",
    ethicalFocus: "GHO_ADOPTION",
    favoredCategories: ["gho", "framework", "listing", "treasury"],
    cautiousCategories: ["legacy-emissions", "non-gho-incentives"],
    summary:
      "Dukung proposal yang memperluas utilitas GHO selama tidak menambah risiko sistemik yang berlebihan.",
  },
] as const;

export function listAavePreferencePresets(): readonly AavePreferencePreset[] {
  return aavePreferencePresets;
}

export function getAavePreferencePreset(
  presetId: AavePreferencePresetId,
): AavePreferencePreset | undefined {
  return aavePreferencePresets.find((preset) => preset.id === presetId);
}

export function applyPreferencePreset(options: {
  proposalId: string;
  proposalText: string;
  proposer?: string;
  startBlock?: string;
  endBlock?: string;
  blockNumber?: string;
  txHash?: string;
  sourceEventId?: string;
  preferencePresetId?: AavePreferencePresetId;
  userRiskProfile?: AnalysisInput["userRiskProfile"];
  ethicalFocus?: string;
}): AnalysisInput {
  const preset = options.preferencePresetId
    ? getAavePreferencePreset(options.preferencePresetId)
    : undefined;

  return {
    proposalId: options.proposalId,
    proposalText: options.proposalText,
    userRiskProfile:
      preset?.userRiskProfile ??
      options.userRiskProfile ??
      appEnv.defaultRiskProfile,
    ethicalFocus:
      preset?.ethicalFocus ?? options.ethicalFocus ?? appEnv.defaultEthicalFocus,
    preferencePresetId: preset?.id,
    preferencePresetName: preset?.name,
    preferencePresetDescription: preset?.summary,
    proposer: options.proposer,
    startBlock: options.startBlock,
    endBlock: options.endBlock,
    blockNumber: options.blockNumber,
    txHash: options.txHash,
    sourceEventId: options.sourceEventId,
  };
}
