import corpusJson from "../../data/fixture/corpus.json";
import suiteJson from "../../evals/fixture-suite.json";
import { buildIndex, search } from "../../src/retrieval/bm25.js";
import { gradeRetrieval } from "../../src/eval/graders.js";
import type { Corpus } from "../../src/types.js";
import type { EvalSuite, RetrievalResult } from "../../src/eval/types.js";

export const corpus = corpusJson as Corpus;
export const suite = suiteJson as EvalSuite;
export const index = buildIndex(corpus.chunks);

export interface PassageHit {
  id: string;
  section: string;
  text: string;
  score: number;
}

export interface AskResponse {
  answer: string;
  refused: boolean;
  citations: string[];
  hits: PassageHit[];
  /** "llm" when the serverless API answered; "retrieval-only" when we fell
   * back to client-side BM25 (no backend / no API key configured). */
  mode: "llm" | "retrieval-only";
}

export function localRetrieve(question: string, k = 8): PassageHit[] {
  return search(index, question, k).map((h) => ({
    id: h.chunk.id,
    section: h.chunk.section,
    text: h.chunk.text,
    score: h.score,
  }));
}

export async function ask(question: string): Promise<AskResponse> {
  try {
    const res = await fetch("/api/ask", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question }),
    });
    if (res.ok) {
      const data = (await res.json()) as Omit<AskResponse, "mode">;
      return { ...data, mode: "llm" };
    }
  } catch {
    // Network error or no backend (plain `vite dev`) — fall through.
  }
  return {
    answer: "",
    refused: false,
    citations: [],
    hits: localRetrieve(question),
    mode: "retrieval-only",
  };
}

export interface EvalRow extends RetrievalResult {
  question: string;
  type: string;
}

/** The deterministic retrieval eval, run live in the browser. */
export function runRetrievalEval(k = 8): { rows: EvalRow[]; meanRecall: number; perfect: number; answerable: number } {
  const rows: EvalRow[] = suite.cases.map((c) => ({
    ...gradeRetrieval(c, search(index, c.question, k).map((h) => h.chunk)),
    question: c.question,
    type: c.type,
  }));
  const answerable = rows.filter((r) => r.type !== "refusal");
  const meanRecall = answerable.reduce((a, r) => a + r.recall, 0) / (answerable.length || 1);
  return {
    rows,
    meanRecall,
    perfect: answerable.filter((r) => r.recall === 1).length,
    answerable: answerable.length,
  };
}

/** Split an answer into text and citation tokens for rendering. */
export function tokenizeAnswer(answer: string): Array<{ kind: "text" | "cite"; value: string }> {
  const parts: Array<{ kind: "text" | "cite"; value: string }> = [];
  let last = 0;
  for (const m of answer.matchAll(/\[(c\d{3})\]/g)) {
    if (m.index! > last) parts.push({ kind: "text", value: answer.slice(last, m.index) });
    parts.push({ kind: "cite", value: m[1] });
    last = m.index! + m[0].length;
  }
  if (last < answer.length) parts.push({ kind: "text", value: answer.slice(last) });
  return parts;
}

export const SAMPLE_QUESTIONS: Array<{ label: string; q: string; trap?: boolean }> = [
  { label: "Revenue & growth", q: "What was total net revenue in fiscal 2025 and how fast did it grow?" },
  { label: "Debt structure", q: "Describe the company's long-term debt structure." },
  { label: "Segment breakdown", q: "What was revenue by segment in fiscal 2025?" },
  { label: "Customer concentration", q: "How concentrated is the company's customer base?" },
  { label: "Litigation", q: "What material litigation is the company facing?" },
  { label: "Free cash flow (derived)", q: "What was free cash flow (operating cash flow minus capex) in fiscal 2025?" },
  { label: "FY2026 guidance", q: "What is the company's revenue guidance for fiscal 2026?", trap: true },
  { label: "CEO pay", q: "What was the CEO's total compensation in fiscal 2025?", trap: true },
  { label: "Q4 revenue", q: "What was revenue in the fourth quarter of fiscal 2025?", trap: true },
];
