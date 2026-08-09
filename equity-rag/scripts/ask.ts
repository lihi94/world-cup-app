/**
 * Ask a grounded question against an ingested corpus.
 *
 *   npm run ask -- "What was total revenue in fiscal 2025?"
 *   npm run ask -- --corpus aapl --show-passages "How much debt is outstanding?"
 *
 * Requires Anthropic credentials (ANTHROPIC_API_KEY or `ant auth login`).
 */
import { loadIndex } from "../src/retrieval/store.js";
import { answerQuestion } from "../src/llm/answer.js";

const args = process.argv.slice(2);
const corpusName = args.includes("--corpus") ? args[args.indexOf("--corpus") + 1] : "fixture";
const showPassages = args.includes("--show-passages");
const question = args.filter((a, i) => !a.startsWith("--") && args[i - 1] !== "--corpus").join(" ");
if (!question) {
  console.error('Usage: npm run ask -- [--corpus <name>] "your question"');
  process.exit(1);
}

const { corpus, index } = loadIndex(corpusName);
console.log(`Corpus: ${corpus.meta.company} — ${corpus.meta.form}\n`);

const result = await answerQuestion(index, corpus.meta, question);

if (showPassages) {
  console.log("Retrieved passages:");
  for (const h of result.hits) {
    console.log(`  [${h.chunk.id}] score=${h.score.toFixed(2)} ${h.chunk.section}`);
  }
  console.log();
}

console.log(result.answer);
if (!result.refused) {
  console.log(`\nCited: ${result.citations.join(", ") || "(no citations!)"}`);
}
