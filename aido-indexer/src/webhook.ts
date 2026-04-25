import { indexerEnv } from "./config.js";
import type { DaoWebhookPayload, ProposalWebhookPayload } from "./types.js";

function buildHeaders(): Record<string, string> {
  return {
    "content-type": "application/json",
    ...(indexerEnv.indexerSharedSecret
      ? { "x-indexer-secret": indexerEnv.indexerSharedSecret }
      : {}),
  };
}

export async function sendProposalToBackend(
  payload: ProposalWebhookPayload,
): Promise<void> {
  const response = await fetch(
    `${indexerEnv.backendUrl}${indexerEnv.backendWebhookPath}`,
    {
      method: "POST",
      headers: buildHeaders(),
      body: JSON.stringify(payload),
    },
  );

  if (!response.ok) {
    const body = await response.text();
    throw new Error(
      `Backend webhook failed with ${response.status}: ${body || response.statusText}`,
    );
  }
}

export async function sendDaoToBackend(
  payload: DaoWebhookPayload,
): Promise<void> {
  const response = await fetch(
    `${indexerEnv.backendUrl}${indexerEnv.backendDaoWebhookPath}`,
    {
      method: "POST",
      headers: buildHeaders(),
      body: JSON.stringify(payload),
    },
  );

  if (!response.ok) {
    const body = await response.text();
    throw new Error(
      `Backend DAO webhook failed with ${response.status}: ${body || response.statusText}`,
    );
  }
}
