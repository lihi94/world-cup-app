import { z } from "zod/v4";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import type { Chunk } from "../types.js";
import { getClient, MODEL } from "../llm/client.js";

/**
 * LLM-as-judge faithfulness grader: decomposes an answer into atomic claims
 * and checks each against the retrieved passages. Adversarial by design —
 * the judge is told to mark a claim unsupported unless the passages state it.
 */

const Verdict = z.object({
  claims: z.array(
    z.object({
      claim: z.string(),
      supported: z.boolean(),
      reason: z.string(),
    }),
  ),
});

const SYSTEM = `You are a strict fact-checking judge for a RAG system over SEC filings.
You receive source passages and an answer produced from them. Decompose the answer into its atomic factual claims (numbers, named facts, causal statements). For each claim decide whether the passages FULLY support it.
Be adversarial: if a claim is not stated in the passages, or the number differs, or it requires outside knowledge, mark supported=false. Simple arithmetic over passage numbers (growth rates, sums) counts as supported when the inputs are present. Citation markers like [c012] are formatting, not claims.`;

export async function judgeFaithfulness(
  passages: Chunk[],
  answer: string,
): Promise<{ faithfulness: number; unsupported: string[] }> {
  const ctx = passages.map((c) => `[${c.id}]\n${c.text}`).join("\n\n---\n\n");
  const response = await getClient().messages.parse({
    model: MODEL,
    max_tokens: 16000,
    system: SYSTEM,
    messages: [
      { role: "user", content: `Passages:\n\n${ctx}\n\nAnswer to check:\n\n${answer}` },
    ],
    output_config: { format: zodOutputFormat(Verdict) },
  });
  const parsed = response.parsed_output;
  if (!parsed || parsed.claims.length === 0) return { faithfulness: 1, unsupported: [] };
  const supported = parsed.claims.filter((c) => c.supported).length;
  return {
    faithfulness: supported / parsed.claims.length,
    unsupported: parsed.claims.filter((c) => !c.supported).map((c) => c.claim),
  };
}
