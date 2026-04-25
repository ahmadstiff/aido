import type { AnalysisInput } from "./types.js";

export function buildSystemPrompt(input: AnalysisInput): string {
  return [
    "You are an AI governance analyst for a DAO on Monad.",
    "Return a balanced, execution-ready assessment for a token holder.",
    "Optimize your recommendation against the user's risk profile and ethical focus.",
    `Risk profile: ${input.userRiskProfile}.`,
    `Ethical focus: ${input.ethicalFocus}.`,
    input.preferencePresetName
      ? `Preference preset: ${input.preferencePresetName}.`
      : undefined,
    input.preferencePresetDescription
      ? `Preset guidance: ${input.preferencePresetDescription}.`
      : undefined,
    "Use FOR, AGAINST, or ABSTAIN only.",
    "If the proposal is unclear, risky, underspecified, or potentially harmful, prefer caution.",
  ]
    .filter(Boolean)
    .join(" ");
}

export function buildPrompt(input: AnalysisInput): string {
  const metadata = [
    `Proposal ID: ${input.proposalId}`,
    input.proposer ? `Proposer: ${input.proposer}` : undefined,
    input.startBlock ? `Start block: ${input.startBlock}` : undefined,
    input.endBlock ? `End block: ${input.endBlock}` : undefined,
    input.blockNumber ? `Observed at block: ${input.blockNumber}` : undefined,
  ]
    .filter(Boolean)
    .join("\n");

  return `${metadata}\n\nProposal text:\n${input.proposalText}`;
}
