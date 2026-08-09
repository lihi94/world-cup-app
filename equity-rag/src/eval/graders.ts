import type { Chunk, GroundedAnswer } from "../types.js";
import type { AnswerResult, EvalCase, RetrievalResult } from "./types.js";

const norm = (s: string) => s.toLowerCase().replace(/\s+/g, " ").trim();

/** Retrieval recall: fraction of gold evidence quotes present in the top-k
 * retrieved chunks. Deterministic — runs offline with no API key. */
export function gradeRetrieval(c: EvalCase, retrieved: Chunk[]): RetrievalResult {
  const haystack = norm(retrieved.map((ch) => ch.text).join("\n"));
  const missing = c.evidence_quotes.filter((q) => !haystack.includes(norm(q)));
  const total = c.evidence_quotes.length;
  const found = total - missing.length;
  return {
    caseId: c.id,
    quotesFound: found,
    quotesTotal: total,
    recall: total === 0 ? 1 : found / total,
    missing,
  };
}

/** Pull every number out of an answer, normalizing thousands separators. */
export function numbersIn(text: string): number[] {
  return [...text.matchAll(/-?\d[\d,]*(?:\.\d+)?/g)].map((m) =>
    Number(m[0].replace(/,/g, "")),
  );
}

export function gradeAnswer(
  c: EvalCase,
  result: GroundedAnswer,
  retrievedChunks: Chunk[],
): AnswerResult {
  const expectRefusal = c.gold.expect_refusal === true;
  const refusalCorrect = result.refused === expectRefusal;

  let citationsValid: boolean | null = null;
  let citationsSupported: boolean | null = null;
  let numericAccuracy: number | null = null;
  let keywordAccuracy: number | null = null;

  if (!result.refused) {
    const retrievedIds = new Set(result.retrievedIds);
    citationsValid =
      result.citations.length > 0 && result.citations.every((id) => retrievedIds.has(id));

    if (c.evidence_quotes.length > 0) {
      const citedText = norm(
        retrievedChunks
          .filter((ch) => result.citations.includes(ch.id))
          .map((ch) => ch.text)
          .join("\n"),
      );
      citationsSupported = c.evidence_quotes.some((q) => citedText.includes(norm(q)));
    }

    if (c.gold.values?.length) {
      const answerNumbers = numbersIn(result.answer);
      const matched = c.gold.values.filter((g) => {
        const tol = g.tolerance ?? Math.max(Math.abs(g.value) * 0.001, 0.01);
        return answerNumbers.some((n) => Math.abs(n - g.value) <= tol);
      });
      numericAccuracy = matched.length / c.gold.values.length;
    }

    const answerNorm = norm(result.answer);
    const checks: boolean[] = [];
    for (const kw of c.gold.answer_contains ?? []) checks.push(answerNorm.includes(norm(kw)));
    for (const group of c.gold.answer_contains_any ?? [])
      checks.push(group.some((kw) => answerNorm.includes(norm(kw))));
    if (checks.length) keywordAccuracy = checks.filter(Boolean).length / checks.length;
  }

  return {
    caseId: c.id,
    refused: result.refused,
    refusalCorrect,
    citationsValid,
    citationsSupported,
    numericAccuracy,
    keywordAccuracy,
    faithfulness: null,
    answer: result.answer,
    citations: result.citations,
  };
}
