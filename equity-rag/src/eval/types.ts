/** One eval case. Evidence is anchored by verbatim quotes rather than chunk
 * ids, so gold labels survive re-chunking of the corpus. */
export interface EvalCase {
  id: string;
  question: string;
  type: "numeric" | "qualitative" | "refusal";
  /** Verbatim substrings that must appear in retrieved chunks (ignored for refusal cases). */
  evidence_quotes: string[];
  gold: {
    /** Expected numeric value(s) that must appear in the answer (within tolerance). */
    values?: Array<{ value: number; tolerance?: number }>;
    /** Keywords/phrases the answer must contain (case-insensitive). */
    answer_contains?: string[];
    /** At least one keyword from each inner list must appear (OR groups). */
    answer_contains_any?: string[][];
    /** True when the correct behavior is to refuse. */
    expect_refusal?: boolean;
  };
  notes?: string;
}

export interface EvalSuite {
  name: string;
  corpus: string;
  cases: EvalCase[];
}

export interface RetrievalResult {
  caseId: string;
  quotesFound: number;
  quotesTotal: number;
  recall: number;
  missing: string[];
}

export interface AnswerResult {
  caseId: string;
  refused: boolean;
  refusalCorrect: boolean;
  /** All cited ids exist among retrieved passages (null when refused). */
  citationsValid: boolean | null;
  /** At least one cited chunk contains a gold evidence quote (null when refused/no evidence). */
  citationsSupported: boolean | null;
  numericAccuracy: number | null;
  keywordAccuracy: number | null;
  /** LLM-judge verdict: fraction of claims grounded in the passages (null when judge not run). */
  faithfulness: number | null;
  answer: string;
  citations: string[];
}
