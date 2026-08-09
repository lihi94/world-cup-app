import Anthropic from "@anthropic-ai/sdk";

export const MODEL = process.env.EQUITY_RAG_MODEL ?? "claude-opus-5";

let client: Anthropic | null = null;

/** Lazy singleton; resolves credentials from the environment (ANTHROPIC_API_KEY
 * or an `ant auth login` profile). Constructed only when an LLM step runs, so
 * ingestion/retrieval/eval-retrieval all work without credentials. */
export function getClient(): Anthropic {
  if (!client) client = new Anthropic();
  return client;
}
