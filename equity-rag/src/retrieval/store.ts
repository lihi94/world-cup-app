import fs from "node:fs";
import path from "node:path";
import type { Corpus } from "../types.js";
import { buildIndex, type Bm25Index } from "./bm25.js";

/** Corpora live under data/<name>/corpus.json; the BM25 index is rebuilt on
 * load (build is fast and keeps the on-disk format model-independent). */

export function corpusPath(name: string): string {
  return path.join("data", name, "corpus.json");
}

export function saveCorpus(name: string, corpus: Corpus): string {
  const file = corpusPath(name);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(corpus, null, 1));
  return file;
}

export function loadCorpus(name: string): Corpus {
  const file = corpusPath(name);
  if (!fs.existsSync(file)) {
    throw new Error(
      `Corpus "${name}" not found at ${file}. Run \`npm run build-fixture\` (offline demo corpus) or \`npm run ingest -- AAPL\` (real EDGAR filing).`,
    );
  }
  return JSON.parse(fs.readFileSync(file, "utf8")) as Corpus;
}

export function loadIndex(name: string): { corpus: Corpus; index: Bm25Index } {
  const corpus = loadCorpus(name);
  return { corpus, index: buildIndex(corpus.chunks) };
}
