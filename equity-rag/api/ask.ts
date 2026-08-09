/**
 * Vercel serverless function: grounded Q&A over the bundled fixture corpus.
 * Requires ANTHROPIC_API_KEY in the deployment environment; without it,
 * returns 501 and the frontend falls back to retrieval-only mode.
 */
import corpusJson from "../data/fixture/corpus.json";
import { buildIndex } from "../src/retrieval/bm25.js";
import { answerQuestion } from "../src/llm/answer.js";
import type { Corpus } from "../src/types.js";

const corpus = corpusJson as Corpus;
// Built once per cold start; 13 chunks, sub-millisecond.
const index = buildIndex(corpus.chunks);

interface Req {
  method?: string;
  body?: { question?: unknown };
}
interface Res {
  status(code: number): Res;
  json(body: unknown): void;
  setHeader(name: string, value: string): void;
}

export default async function handler(req: Req, res: Res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "method_not_allowed" });
  }
  const question = String(req.body?.question ?? "").trim();
  if (!question || question.length > 500) {
    return res.status(400).json({ error: "missing_or_too_long_question" });
  }
  if (!process.env.ANTHROPIC_API_KEY && !process.env.ANTHROPIC_AUTH_TOKEN) {
    return res.status(501).json({ error: "no_credentials" });
  }

  try {
    const result = await answerQuestion(index, corpus.meta, question);
    return res.status(200).json({
      answer: result.answer,
      refused: result.refused,
      citations: result.citations,
      hits: result.hits.map((h) => ({
        id: h.chunk.id,
        section: h.chunk.section,
        text: h.chunk.text,
        score: h.score,
      })),
    });
  } catch (err) {
    console.error("ask failed:", err);
    return res.status(502).json({ error: "answer_failed" });
  }
}
