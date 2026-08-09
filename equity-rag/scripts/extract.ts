/**
 * Extract headline financials into a validated schema.
 *
 *   npm run extract -- [--corpus <name>]
 *
 * Requires Anthropic credentials.
 */
import { loadIndex } from "../src/retrieval/store.js";
import { extractFinancials } from "../src/llm/extract.js";

const args = process.argv.slice(2);
const corpusName = args.includes("--corpus") ? args[args.indexOf("--corpus") + 1] : "fixture";

const { corpus, index } = loadIndex(corpusName);
console.log(`Extracting financials: ${corpus.meta.company} — ${corpus.meta.form}\n`);

const result = await extractFinancials(index, corpus.meta);
console.log(JSON.stringify(result, null, 2));
