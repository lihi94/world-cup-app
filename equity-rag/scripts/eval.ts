/**
 * Run the evaluation pipeline.
 *
 *   npm run eval                       # retrieval metrics only (offline, no API key)
 *   npm run eval -- --e2e              # + grounded answers: refusal, citations, numeric accuracy
 *   npm run eval -- --e2e --judge      # + LLM-judge faithfulness scoring
 *   npm run eval -- --suite evals/fixture-suite.json --limit 5
 */
import { runSuite, saveReport } from "../src/eval/run.js";

const args = process.argv.slice(2);
const flag = (name: string) => args.includes(`--${name}`);
const opt = (name: string) =>
  args.includes(`--${name}`) ? args[args.indexOf(`--${name}`) + 1] : undefined;

const suiteFile = opt("suite") ?? "evals/fixture-suite.json";
const report = await runSuite(suiteFile, {
  e2e: flag("e2e"),
  judge: flag("judge"),
  topK: Number(opt("k") ?? 8),
  limit: opt("limit") ? Number(opt("limit")) : undefined,
  log: (line) => console.log(line),
});

console.log(`\n=== Eval report: ${report.suite} (corpus: ${report.corpus}) ===\n`);
console.log(`Retrieval (answerable cases):`);
console.log(`  mean evidence recall@k:  ${pct(report.retrieval.meanRecallAtK)}`);
console.log(`  cases with full recall:  ${report.retrieval.perfectRecallCases}`);
const misses = report.retrieval.cases.filter((c) => c.missing.length);
for (const m of misses) console.log(`  ⚠ [${m.caseId}] missing evidence: ${m.missing.length}/${m.quotesTotal}`);

if (report.answers) {
  const a = report.answers;
  console.log(`\nEnd-to-end answers:`);
  console.log(`  refusal accuracy:            ${pct(a.refusalAccuracy)}`);
  console.log(`  hallucinated-answer rate:    ${pct(a.hallucinatedAnswerRate)}  (refusal cases answered anyway — lower is better)`);
  console.log(`  citation validity:           ${pct(a.citationValidityRate)}  (all cited ids were actually retrieved)`);
  console.log(`  citation support:            ${pct(a.citationSupportRate)}  (cited chunks contain the gold evidence)`);
  if (a.meanNumericAccuracy !== null) console.log(`  numeric accuracy:            ${pct(a.meanNumericAccuracy)}`);
  if (a.meanKeywordAccuracy !== null) console.log(`  keyword accuracy:            ${pct(a.meanKeywordAccuracy)}`);
  if (a.meanFaithfulness !== null) console.log(`  faithfulness (LLM judge):    ${pct(a.meanFaithfulness)}`);
  const wrong = a.cases.filter((c) => !c.refusalCorrect);
  for (const w of wrong) console.log(`  ✗ [${w.caseId}] wrong refusal behavior — answer: ${w.answer.slice(0, 120)}`);
}

const out = `data/eval-report-${Date.now()}.json`;
saveReport(report, out);
console.log(`\nFull report written to ${out}`);

function pct(n: number) {
  return `${(n * 100).toFixed(1)}%`;
}
