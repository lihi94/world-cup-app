# equity-rag — Equity Research RAG with an Evaluation Pipeline

A retrieval-augmented question-answering system for SEC filings that **measures its own accuracy**. It ingests a 10-K from EDGAR, answers analyst questions with passage-level citations, extracts headline financials into a validated schema, **refuses to answer when the filing doesn't support an answer** — and ships an eval harness that quantifies retrieval recall, citation validity, numeric accuracy, refusal behavior, and hallucination rate.

The thesis: a RAG system without an eval pipeline is a demo; with one, it's a product. Every design decision here exists to make the "how often is it wrong?" question answerable with a number.

## What it does

| Capability | How |
|---|---|
| **Ingestion** | Downloads the latest 10-K from SEC EDGAR (submissions API → primary document), strips inline-XBRL HTML to text (tables preserved as pipe-delimited rows), chunks by `Item N.` section with overlap |
| **Retrieval** | BM25 over section-labeled chunks. Deliberately lexical and dependency-free: deterministic, offline, reproducible — so retrieval metrics run in CI with no API key. Numbers are kept as single tokens (`4,812.6` → `4812.6`) because financial questions are number-heavy |
| **Grounded Q&A** | Claude (Opus 5) answers **only** from retrieved passages; every claim carries a `[c012]`-style citation to the chunk it came from |
| **Refusal** | When the passages don't support an answer, the system replies `INSUFFICIENT_EVIDENCE: <reason>` instead of guessing — enforced by prompt contract and **measured** by the eval suite |
| **Structured extraction** | Revenue, margins, EPS, debt, cash flow → a Zod-validated schema via the API's structured-outputs mode. Every metric must carry a verbatim `source_quote` + `chunk_id`; a value with no traceable source is `null`, never estimated |
| **Evaluation** | 36-case gold suite (28 answerable, 8 refusal traps) with deterministic graders + optional LLM-as-judge faithfulness scoring |

## Quickstart

```bash
cd equity-rag
npm install

# 1. Offline demo corpus (synthetic 10-K, no network / no API key needed)
npm run build-fixture
npm run eval                    # retrieval metrics — fully offline

# 2. Real filing from EDGAR
export EDGAR_USER_AGENT="your-app-name your-email@example.com"   # SEC fair-access policy
npm run ingest -- AAPL          # or NVDA, MSFT, ... or a raw CIK number

# 3. LLM steps (need ANTHROPIC_API_KEY)
npm run ask -- --corpus aapl "How much long-term debt is outstanding, and when does it mature?"
npm run ask -- --corpus aapl "What is the revenue guidance for next year?"   # → refuses: not in a 10-K
npm run extract -- --corpus aapl

# 4. Full evaluation
npm run eval -- --e2e           # + answers: refusal accuracy, citation validity, numeric accuracy
npm run eval -- --e2e --judge   # + LLM-judge faithfulness (claim-level grounding)

npm test                        # 19 unit tests: chunker, BM25, graders, suite integrity
```

## The eval pipeline (the point of this project)

**Gold labels are anchored to verbatim quotes, not chunk ids** — so re-chunking the corpus never invalidates the suite. Each answerable case carries `evidence_quotes` (substrings that must be retrievable) and a gold answer (`values` with tolerances, and/or keyword groups). Each refusal case is a question a plausible-sounding LLM would happily hallucinate an answer to: quarterly breakdowns that aren't disclosed, CEO compensation (lives in the proxy, not the 10-K), forward guidance, competitor comparisons.

Metrics, in dependency order:

1. **Retrieval recall@k** *(deterministic, offline)* — fraction of gold evidence quotes present in the top-k retrieved chunks. If this fails, nothing downstream can be right.
2. **Refusal accuracy** *(e2e)* — did the system answer answerable questions and refuse unanswerable ones? Its complement on refusal cases is the **hallucinated-answer rate**: the share of unanswerable questions that got a confident answer anyway.
3. **Citation validity** *(e2e, deterministic)* — every cited chunk id actually appeared in the retrieved context (no fabricated citations).
4. **Citation support** *(e2e, deterministic)* — the cited chunks contain the gold evidence (the citation points at the right place, not just a valid place).
5. **Numeric accuracy** *(e2e, deterministic)* — gold values appear in the answer within tolerance, after normalizing thousands separators.
6. **Faithfulness** *(LLM-as-judge, optional)* — an adversarial judge decomposes the answer into atomic claims and checks each against the passages; the score is the supported fraction.

Current results on the fixture suite (deterministic stages):

| Metric | Result |
|---|---|
| Unit tests | 19/19 pass |
| Retrieval evidence recall@8 | **100%** (28/28 answerable cases, every gold quote retrieved) — on a 13-chunk fixture corpus, so read this as "the harness and the graders work end to end", **not** as a strong retrieval result. The number that matters is the one on a real 400-page 10-K, where top-8 out of hundreds of chunks is a genuine test. |

E2E metrics are produced by `npm run eval -- --e2e --judge` and written to `data/eval-report-*.json`.

## The fixture corpus

`fixtures/meridian-10k.html` is a **synthetic 10-K for a fictional company** ("Meridian Semiconductor Devices, Inc."), clearly labeled as such. It exists so that the demo, the tests, and the retrieval eval run offline and deterministically, and so gold answers are known exactly (the numbers are invented but internally consistent — segments sum to total revenue, EPS = net income / diluted shares, etc.). Real filings come from `npm run ingest`, which pulls live from EDGAR.

## Architecture

```
scripts/            CLI entry points (ingest, ask, extract, eval, build-fixture)
src/
├── ingest/         edgar.ts (EDGAR client) · html.ts (HTML→text) · chunker.ts (Item-section chunking)
├── retrieval/      bm25.ts (lexical index) · store.ts (corpus persistence)
├── llm/            answer.ts (grounded Q&A + refusal contract) · extract.ts (structured extraction) · client.ts
└── eval/           types.ts · graders.ts (deterministic) · judge.ts (LLM faithfulness) · run.ts (runner + report)
evals/              fixture-suite.json — 36 gold cases
fixtures/           synthetic sample filing (offline demo corpus)
tests/              vitest unit tests
```

Design choices worth defending in an interview:

- **BM25 before embeddings.** A lexical baseline is deterministic, free, offline, and reproducible — which is what lets retrieval metrics run in CI with no API key. It is a *baseline*, not a claim to be the best retriever: on a 13-chunk fixture it trivially finds everything, and the real test is a full 10-K where filings repeat the same vocabulary across hundreds of chunks and semantic questions ("is the company's supply chain fragile?") have no lexical overlap with the passage that answers them. Hybrid retrieval is the obvious next step, and when it lands the *same eval suite* will say whether it actually helps — which is why the harness was built first.
- **Refusal is a feature, not a failure mode.** The prompt contract makes "I don't know" a first-class output with a machine-parseable marker, and the eval suite contains questions designed to punish confident fabrication.
- **Citations are verifiable by construction.** Because citations are chunk ids from the provided context, "did it cite something it never saw?" and "does the cited chunk contain the evidence?" are string operations, not judgment calls.
- **Deterministic before model-graded.** Every metric that *can* be computed without an LLM is; the LLM judge is reserved for the one thing string matching can't do (claim-level grounding).

## Web demo

`web/` is a React + Vite front end for the pipeline, and `api/ask.ts` is a Vercel serverless function that runs the grounded-answer step server-side (the key never reaches the browser).

- **Ask tab** — question box + sample chips (including ⚠-marked refusal traps). Answers render their `[cNNN]` citations as clickable chips that scroll to and highlight the exact retrieved passage. The retrieved-passages panel shows what the model was allowed to read, with BM25 scores and cited-passage highlighting.
- **Evals tab** — runs the deterministic retrieval eval *live in the browser* (same index, same graders as the CLI) and renders the full 36-case table.
- **Graceful degradation** — with no backend or no API key, the UI drops to retrieval-only mode and says so, instead of breaking.

```bash
npm run web          # local dev (retrieval-only unless you also run the API)
npm run web:build    # production build -> dist/
```

**Deploy to Vercel:** create a project with root directory `equity-rag/` (the included `vercel.json` sets the build command and output dir; the `api/` function is auto-detected) and set `ANTHROPIC_API_KEY` in the project's environment variables. That's the whole deployment.

CI (`.github/workflows/equity-rag-ci.yml`) runs typecheck, unit tests, the offline retrieval eval (failing the build if evidence recall drops below 100%), and the web build on every push touching `equity-rag/`.

## Roadmap

- Hybrid retrieval (embeddings + BM25 + reciprocal-rank fusion) — measured against the same suite
- Multi-filing corpora (10-K + 10-Qs) with time-aware questions ("how did gross margin trend?")
- TASE / Maya (Hebrew) filings — same pipeline, Hebrew tokenization
- Eval suite for a real filing (AAPL FY2025 10-K) with human-verified golds
