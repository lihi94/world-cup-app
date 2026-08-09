import fs from "node:fs";
import path from "node:path";
import { loadIndex } from "../retrieval/store.js";
import { search } from "../retrieval/bm25.js";
import { answerQuestion } from "../llm/answer.js";
import { judgeFaithfulness } from "./judge.js";
import { gradeAnswer, gradeRetrieval } from "./graders.js";
import type { AnswerResult, EvalSuite, RetrievalResult } from "./types.js";

export interface EvalReport {
  suite: string;
  corpus: string;
  ranAt: string;
  mode: { e2e: boolean; judge: boolean };
  retrieval: {
    meanRecallAtK: number;
    perfectRecallCases: number;
    cases: RetrievalResult[];
  };
  answers?: {
    refusalAccuracy: number;
    hallucinatedAnswerRate: number;
    citationValidityRate: number;
    citationSupportRate: number;
    meanNumericAccuracy: number | null;
    meanKeywordAccuracy: number | null;
    meanFaithfulness: number | null;
    cases: AnswerResult[];
  };
}

export interface RunOptions {
  e2e: boolean;
  judge: boolean;
  topK: number;
  limit?: number;
  log?: (line: string) => void;
}

export async function runSuite(suiteFile: string, opts: RunOptions): Promise<EvalReport> {
  const log = opts.log ?? (() => {});
  const suite = JSON.parse(fs.readFileSync(suiteFile, "utf8")) as EvalSuite;
  const { corpus, index } = loadIndex(suite.corpus);
  const cases = opts.limit ? suite.cases.slice(0, opts.limit) : suite.cases;

  // Stage 1 — retrieval metrics (deterministic, offline).
  const retrievalResults = cases.map((c) => {
    const hits = search(index, c.question, opts.topK);
    return gradeRetrieval(c, hits.map((h) => h.chunk));
  });
  const answerable = cases.filter((c) => !c.gold.expect_refusal);
  const answerableRetrieval = retrievalResults.filter((r) =>
    answerable.some((c) => c.id === r.caseId),
  );
  const meanRecall =
    answerableRetrieval.reduce((a, r) => a + r.recall, 0) / (answerableRetrieval.length || 1);

  const report: EvalReport = {
    suite: suite.name,
    corpus: suite.corpus,
    ranAt: new Date().toISOString(),
    mode: { e2e: opts.e2e, judge: opts.judge },
    retrieval: {
      meanRecallAtK: round(meanRecall),
      perfectRecallCases: answerableRetrieval.filter((r) => r.recall === 1).length,
      cases: retrievalResults,
    },
  };

  // Stage 2 — end-to-end answers (needs Anthropic credentials).
  if (opts.e2e) {
    const answerResults: AnswerResult[] = [];
    for (const c of cases) {
      log(`  [${c.id}] ${c.question}`);
      const result = await answerQuestion(index, corpus.meta, c.question, { topK: opts.topK });
      const graded = gradeAnswer(c, result, result.hits.map((h) => h.chunk));
      if (opts.judge && !result.refused) {
        const verdict = await judgeFaithfulness(result.hits.map((h) => h.chunk), result.answer);
        graded.faithfulness = round(verdict.faithfulness);
        if (verdict.unsupported.length)
          log(`      ⚠ unsupported claims: ${verdict.unsupported.join(" | ")}`);
      }
      answerResults.push(graded);
      log(`      ${result.refused ? "REFUSED" : "answered"} — refusal ${graded.refusalCorrect ? "✓" : "✗"}`);
    }

    const refusalCases = answerResults.filter((r) =>
      cases.find((c) => c.id === r.caseId)!.gold.expect_refusal,
    );
    const answered = answerResults.filter((r) => !r.refused);
    const withValidity = answered.filter((r) => r.citationsValid !== null);
    const withSupport = answered.filter((r) => r.citationsSupported !== null);
    const withNumeric = answerResults.filter((r) => r.numericAccuracy !== null);
    const withKeyword = answerResults.filter((r) => r.keywordAccuracy !== null);
    const withFaith = answerResults.filter((r) => r.faithfulness !== null);

    report.answers = {
      refusalAccuracy: round(
        answerResults.filter((r) => r.refusalCorrect).length / answerResults.length,
      ),
      // Refusal cases the system answered anyway = it made something up.
      hallucinatedAnswerRate: round(
        refusalCases.length
          ? refusalCases.filter((r) => !r.refused).length / refusalCases.length
          : 0,
      ),
      citationValidityRate: round(
        withValidity.length
          ? withValidity.filter((r) => r.citationsValid).length / withValidity.length
          : 1,
      ),
      citationSupportRate: round(
        withSupport.length
          ? withSupport.filter((r) => r.citationsSupported).length / withSupport.length
          : 1,
      ),
      meanNumericAccuracy: withNumeric.length
        ? round(withNumeric.reduce((a, r) => a + (r.numericAccuracy ?? 0), 0) / withNumeric.length)
        : null,
      meanKeywordAccuracy: withKeyword.length
        ? round(withKeyword.reduce((a, r) => a + (r.keywordAccuracy ?? 0), 0) / withKeyword.length)
        : null,
      meanFaithfulness: withFaith.length
        ? round(withFaith.reduce((a, r) => a + (r.faithfulness ?? 0), 0) / withFaith.length)
        : null,
      cases: answerResults,
    };
  }

  return report;
}

export function saveReport(report: EvalReport, outFile: string): void {
  fs.mkdirSync(path.dirname(outFile), { recursive: true });
  fs.writeFileSync(outFile, JSON.stringify(report, null, 2));
}

const round = (n: number) => Math.round(n * 1000) / 1000;
