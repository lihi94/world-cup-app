import type { Chunk, RetrievalHit } from "../types.js";

/**
 * Plain BM25 lexical retrieval (k1=1.5, b=0.75). Deliberately dependency-free
 * and deterministic: the eval pipeline's retrieval metrics run offline with no
 * API key, and results are reproducible run-to-run. Numbers are kept as
 * tokens ("4,812.6" -> "4812.6") because financial questions are number-heavy.
 */

const K1 = 1.5;
const B = 0.75;

export function tokenize(text: string): string[] {
  return (
    text
      .toLowerCase()
      // Keep digits, letters, and decimal points/commas inside numbers.
      .replace(/(\d),(\d)/g, "$1$2")
      .split(/[^a-z0-9.%$]+/)
      .map((t) => t.replace(/^[.$%]+|[.$%]+$/g, ""))
      .filter((t) => t.length > 1 || /\d/.test(t))
  );
}

export interface Bm25Index {
  chunks: Chunk[];
  df: Record<string, number>;
  tf: Array<Record<string, number>>;
  docLen: number[];
  avgDocLen: number;
}

export function buildIndex(chunks: Chunk[]): Bm25Index {
  const df: Record<string, number> = {};
  const tf: Array<Record<string, number>> = [];
  const docLen: number[] = [];

  for (const chunk of chunks) {
    const tokens = tokenize(`${chunk.section}\n${chunk.text}`);
    const counts: Record<string, number> = {};
    for (const t of tokens) counts[t] = (counts[t] ?? 0) + 1;
    for (const t of Object.keys(counts)) df[t] = (df[t] ?? 0) + 1;
    tf.push(counts);
    docLen.push(tokens.length);
  }
  const avgDocLen = docLen.length ? docLen.reduce((a, b) => a + b, 0) / docLen.length : 0;
  return { chunks, df, tf, docLen, avgDocLen };
}

export function search(index: Bm25Index, query: string, k = 8): RetrievalHit[] {
  const qTokens = [...new Set(tokenize(query))];
  const n = index.chunks.length;
  const scores = new Array<number>(n).fill(0);

  for (const term of qTokens) {
    const df = index.df[term];
    if (!df) continue;
    const idf = Math.log(1 + (n - df + 0.5) / (df + 0.5));
    for (let i = 0; i < n; i++) {
      const f = index.tf[i][term];
      if (!f) continue;
      scores[i] +=
        (idf * f * (K1 + 1)) /
        (f + K1 * (1 - B + (B * index.docLen[i]) / index.avgDocLen));
    }
  }

  return scores
    .map((score, i) => ({ chunk: index.chunks[i], score }))
    .filter((h) => h.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, k);
}
