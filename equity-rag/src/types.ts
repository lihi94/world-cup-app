/** A retrievable passage of a filing, the atomic unit of the RAG index. */
export interface Chunk {
  /** Stable id used in citations, e.g. "c012". */
  id: string;
  /** Filing section the chunk belongs to, e.g. "Item 1A. Risk Factors". */
  section: string;
  text: string;
}

export interface CorpusMeta {
  company: string;
  ticker?: string;
  cik?: string;
  form: string;
  fiscalYear?: string;
  filedAt?: string;
  source: string;
  /** True when the corpus is a synthetic test fixture, not a real filing. */
  synthetic?: boolean;
}

export interface Corpus {
  meta: CorpusMeta;
  chunks: Chunk[];
}

export interface RetrievalHit {
  chunk: Chunk;
  score: number;
}

export interface GroundedAnswer {
  question: string;
  /** Final answer text, or the refusal message when refused. */
  answer: string;
  /** True when the system declined to answer for lack of evidence. */
  refused: boolean;
  /** Chunk ids cited in the answer, in order of first appearance. */
  citations: string[];
  /** Chunk ids that were retrieved and shown to the model. */
  retrievedIds: string[];
}
