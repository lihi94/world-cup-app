import type { Bm25Index } from "../retrieval/bm25.js";
import { search } from "../retrieval/bm25.js";
import type { CorpusMeta, GroundedAnswer, RetrievalHit } from "../types.js";
import { getClient, MODEL } from "./client.js";

export const REFUSAL_MARKER = "INSUFFICIENT_EVIDENCE";

const SYSTEM = `You are an equity research assistant answering questions about a single SEC filing.

Grounding rules — these override everything else:
- Answer ONLY from the numbered source passages provided in the user message. Your own knowledge about the company, the industry, or any other filing must not appear in the answer.
- Every factual claim must carry a citation to the passage it came from, written as the passage id in square brackets, e.g. [c012]. Cite immediately after the claim it supports. Multiple citations are allowed: [c003][c007].
- Copy numbers exactly as they appear in the passages (same units, same precision). Never compute a figure that is not derivable by simple arithmetic from cited numbers; if you do derive one (a growth rate, a difference), show the inputs with their citations.
- If the passages do not contain enough information to answer, reply with exactly one line starting with "${REFUSAL_MARKER}:" followed by a short reason. Do not guess, do not answer from memory, do not partially speculate. A question about information typically found elsewhere (proxy statements, earnings calls, future guidance) that is absent from the passages must be refused.

Style: concise, analyst-grade prose. Lead with the direct answer.`;

export interface AnswerOptions {
  topK?: number;
}

export async function answerQuestion(
  index: Bm25Index,
  meta: CorpusMeta,
  question: string,
  opts: AnswerOptions = {},
): Promise<GroundedAnswer & { hits: RetrievalHit[] }> {
  const hits = search(index, question, opts.topK ?? 8);
  const retrievedIds = hits.map((h) => h.chunk.id);

  if (hits.length === 0) {
    return {
      question,
      answer: `${REFUSAL_MARKER}: no relevant passages were retrieved from the filing.`,
      refused: true,
      citations: [],
      retrievedIds,
      hits,
    };
  }

  const passages = hits
    .map((h) => `[${h.chunk.id}] (${h.chunk.section})\n${h.chunk.text}`)
    .join("\n\n---\n\n");

  const context = `Filing: ${meta.company} — ${meta.form}${meta.fiscalYear ? `, fiscal year ${meta.fiscalYear}` : ""}.

Source passages:

${passages}

Question: ${question}`;

  const stream = getClient().messages.stream({
    model: MODEL,
    max_tokens: 16000,
    system: [{ type: "text", text: SYSTEM, cache_control: { type: "ephemeral" } }],
    messages: [{ role: "user", content: context }],
  });
  const message = await stream.finalMessage();

  if (message.stop_reason === "refusal") {
    return {
      question,
      answer: `${REFUSAL_MARKER}: the model declined to answer this request.`,
      refused: true,
      citations: [],
      retrievedIds,
      hits,
    };
  }

  const answer = message.content
    .filter((b): b is Extract<typeof b, { type: "text" }> => b.type === "text")
    .map((b) => b.text)
    .join("")
    .trim();

  const refused = answer.startsWith(REFUSAL_MARKER);
  return {
    question,
    answer,
    refused,
    citations: refused ? [] : extractCitations(answer),
    retrievedIds,
    hits,
  };
}

/** Parse [c012]-style citations in order of first appearance. */
export function extractCitations(answer: string): string[] {
  const seen = new Set<string>();
  for (const m of answer.matchAll(/\[(c\d{3})\]/g)) seen.add(m[1]);
  return [...seen];
}
