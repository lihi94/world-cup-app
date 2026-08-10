# Architecture & Design Decisions

Why this system is built the way it is — the decisions, the alternatives that were rejected, the trade-offs accepted, and the parts that are still weak. Read alongside `README.md`, which covers *what* it does.

---

## 1. Data flow

```
EDGAR submissions API ──► primary 10-K document (HTML, often 5–20 MB inline XBRL)
        │
        ▼  ingest/html.ts        streaming SAX parse; block tags → newlines; <tr>/<td> → "a | b | c"
   plain text
        │
        ▼  ingest/chunker.ts     split on "Item N." headings, then into ~1600-char overlapping chunks
   Chunk[] { id, section, text }
        │
        ├──► retrieval/store.ts  persisted to data/<name>/corpus.json (model-independent format)
        │
        ▼  retrieval/bm25.ts     index rebuilt on load (fast; keeps the on-disk format portable)
   Bm25Index
        │
   ┌────┴─────────────────────────┬──────────────────────────────┐
   ▼                              ▼                              ▼
llm/answer.ts                llm/extract.ts                  eval/run.ts
top-k → prompt → Claude      6 metric queries → union →      stage 1: retrieval metrics (offline)
→ cited answer OR refusal    structured output (Zod)         stage 2: e2e answers + graders
                                                             → eval/judge.ts (LLM faithfulness)
```

The single most important structural property: **the model never sees the filing.** It sees `k` retrieved passages, each labelled with an id. Everything downstream — citations, refusal, verifiability — depends on that boundary.

---

## 2. Decisions

### 2.1 BM25 as the retriever, not embeddings

**Decision.** A hand-written BM25 index (k1=1.5, b=0.75) over section-labelled chunks, with no vector database.

**Why.** Three properties that embeddings don't have, and that the eval pipeline depends on:

1. **Deterministic.** The same query returns the same passages every run. When an e2e metric moves, it isn't because the retriever drifted — that isolation is what makes the eval loop trustworthy.
2. **Offline and free.** Retrieval metrics run in CI on every push with no API key and no network. A metric that costs money and latency to compute stops being run.
3. **Lexically precise on numbers.** Filing questions are dense with exact tokens — "4,812.6", "56.8%", "2028", "Item 1A". Embeddings blur exactly the distinctions that matter here; `1,412.7` and `1,188.3` are near-identical vectors and completely different facts.

**What was rejected.** A vector store (pgvector / Chroma) + an embedding model. Not because it's worse — for semantic questions it is clearly better — but because it's the *second* thing to build. The order matters: harness first, then the improvement it can measure.

**Where it breaks, honestly.** BM25 fails when the question and the answer share no vocabulary. "Is the supply chain fragile?" should retrieve the paragraph about a single Taiwanese foundry, and lexically it has almost nothing in common with it. On the 13-chunk fixture this is invisible (top-8 of 13 retrieves most of the document). On a real 10-K with 400+ chunks it will show up as missed evidence — which is precisely the measurement that justifies building hybrid retrieval next.

**The next step, stated concretely.** Embeddings + BM25 fused with reciprocal rank fusion, evaluated against the *same* suite. The claim to make afterwards is not "I used embeddings" but "recall@8 went from X to Y on a real filing, and here is the case it fixed."

### 2.2 Chunk by filing section, not by fixed window

**Decision.** Split on `Item N.` headings first, then pack lines into ~1600-character chunks with ~200 characters of overlap, never breaking a line.

**Why.** A 10-K has a legally mandated structure, and that structure is semantic: Item 1A is risks, Item 7 is management's discussion, Item 8 is the statements. Carrying the section label into the chunk gives two things — a retrieval signal (the heading text is indexed) and a human-readable citation ("Item 7. MD&A" is a place a person can go verify).

**The subtle bug this design had to avoid.** `Item 1A` appears both as a heading and inside prose ("...as described in Item 1A above"). A naive regex splits the document at every mention. The guard is a length check: a heading line is short (`< 120` chars); a sentence that references an item is long. There's a unit test pinning exactly this.

**Overlap.** Facts straddle boundaries — a table row and the sentence that interprets it. 200 characters of tail carried into the next chunk means a fact split across a boundary is retrievable from either side. The cost is duplicated text in the index, which is cheap.

**What was rejected.** Fixed-size token windows with no structure awareness (simple, but citations become meaningless — "chunk 47" tells a reader nothing), and one-chunk-per-section (Item 7 alone can be 50 pages, far past what's useful to put in a prompt).

### 2.3 Tables become pipe-delimited rows

**Decision.** In the HTML→text step, `<tr>` becomes a line and `<td>`/`<th>` are joined with ` | `.

**Why.** The income statement is the highest-value content in the filing and it is entirely tabular. Naive text extraction turns `<tr><td>Net revenue</td><td>4,812.6</td><td>4,109.3</td></tr>` into `Net revenue 4,812.6 4,109.3` — the label-to-value association survives only by luck of word order, and across a 20-row table the model has to guess which column is which year. Keeping the row on one line with explicit separators preserves the grid well enough that both the retriever and the model can read it.

**Limitation.** Merged cells, multi-level headers, and footnote markers are flattened. A production system would parse the XBRL facts directly (they're machine-readable and authoritative) rather than scraping the rendered HTML. That's the correct long-term answer for numeric extraction; text extraction remains necessary for the narrative sections.

### 2.4 Citations are chunk ids from the provided context

**Decision.** The model must cite `[c012]`, where `c012` is an id assigned by *our* chunker and injected into the prompt.

**Why this specific design.** It makes two different failure modes mechanically checkable, with no LLM judgment involved:

- **Fabricated citation** — the model cites `c099`, which was never in the context. Detectable by set membership: `citations ⊆ retrievedIds`. This is `citationValidityRate`.
- **Misattributed citation** — the model cites `c003`, which *was* retrieved but doesn't contain the fact. Detectable by checking whether any cited chunk contains the gold evidence quote. This is `citationSupportRate`.

Those two being separate metrics is deliberate: a system can score perfectly on the first and badly on the second, and they mean different things. The first says the model isn't inventing sources; the second says its sourcing is accurate.

**What was rejected.** Free-text citations ("according to the MD&A section"), which are unverifiable without an LLM, and the Anthropic API's built-in `citations` feature on document blocks — which is good, but returns character offsets into documents rather than ids over *our* retrieval units, so it couldn't grade retrieval and generation separately.

### 2.5 Refusal is a first-class output with a machine-readable marker

**Decision.** When the passages don't support an answer, the model emits a line beginning `INSUFFICIENT_EVIDENCE:`. The prompt makes this an explicit obligation, not a fallback.

**Why a marker string rather than a structured output or a tool call.** Structured output (`output_config.format`) would force *every* answer into a JSON envelope, which degrades the prose quality of the answers that matter, and it's incompatible with keeping the answer streamable. A sentinel prefix costs nothing, is trivially parseable (`answer.startsWith(MARKER)`), and leaves the good path untouched. The trade-off accepted: a model that ignores the instruction and answers anyway isn't caught by parsing — it's caught by the eval suite, which is the right place.

**Why refusal is the hardest behavior to get right.** Refusing is easy to over-do (a system that refuses everything scores 100% on refusal cases and is useless) and easy to under-do (the default LLM behavior is to be helpful and produce something). That's exactly why the suite grades *both* directions in one number: `refusalAccuracy` counts a wrong refusal on an answerable question as a failure, same as a confident answer to an unanswerable one. Optimizing one at the expense of the other doesn't move the metric.

**Why the refusal cases are the ones they are.** Each is a question with a plausible-looking but absent answer: forward guidance (a 10-K is backward-looking), CEO compensation (lives in the proxy statement — DEF 14A — not the 10-K), quarterly revenue (only annual figures are disclosed), a competitor comparison (requires outside knowledge), Brazil revenue (the geographic disclosure covers US/China/Taiwan/other). A model answering from parametric memory rather than the passages will fail these specifically, which makes them a hallucination detector, not just a politeness test.

### 2.6 Gold labels are anchored to verbatim quotes, not chunk ids

**Decision.** Each eval case lists `evidence_quotes` — exact substrings that must appear in retrieved chunks — rather than "must retrieve c012".

**Why.** Chunk ids are an artifact of the current chunker. Change `maxChars` from 1600 to 1200 and every id shifts; a suite keyed on ids would silently become wrong at exactly the moment you're trying to measure whether the change helped. Quotes are properties of the *document*, so the suite survives re-chunking, re-ingestion, and retriever swaps. There's a test asserting every gold quote still exists verbatim in the corpus, so a suite that rots fails the build rather than reporting nonsense.

This is the single design choice in the eval layer worth defending hardest: it's what makes the harness outlive the implementation it measures.

### 2.7 Deterministic graders first, LLM judge only where necessary

**Decision.** Five metrics computed with string operations and arithmetic; one metric (faithfulness) computed by an LLM.

**Why.** Every model-graded metric introduces noise, cost, latency, and a second thing that can be wrong. So the rule is: if it can be computed deterministically, it is. Numeric accuracy is a number-extraction and a tolerance comparison. Citation validity is set membership. Retrieval recall is substring search.

**What the judge is for.** The one thing string matching genuinely cannot do: decomposing a paragraph of prose into atomic claims and asking whether each is entailed by the passages. An answer can contain every gold number, cite valid chunks, and still smuggle in an unsupported causal claim ("margin improved *because of pricing power*" when the filing says mix and yields). Only claim-level checking catches that.

**The judge's known weakness.** It runs on the same model family as the answerer, so their errors are correlated — a fact both models find plausible is a shared blind spot. Mitigations in place: the judge is prompted adversarially (default to unsupported), and it sees only the passages, never the question's gold answer, so it can't rubber-stamp. Mitigation *not* in place: a different model family as judge, or multiple judges voting. Worth stating plainly rather than pretending the number is ground truth.

### 2.8 Structured extraction requires a source quote per metric

**Decision.** The financials schema wraps every metric in `{ value, unit, source_quote, chunk_id }`, all nullable, and the prompt forbids estimation.

**Why.** Structured output guarantees the *shape* is valid — it does not guarantee the values are real. A schema with a bare `total_revenue: number` will get a number, always, including when the filing doesn't contain one, because the schema demands a number. Making every field nullable removes the pressure to fabricate, and requiring a verbatim quote plus a chunk id makes each value independently auditable: a value whose quote doesn't appear in the cited chunk is detectable mechanically.

**Retrieval strategy here differs from Q&A.** Instead of one query, six metric-focused queries run and their results are unioned and deduped by chunk id. A single query optimized for "revenue" won't surface the debt note; extraction needs breadth where Q&A needs precision.

### 2.9 The eval runs in two stages, and stage 1 gates CI

**Decision.** `npm run eval` computes retrieval metrics only, offline. `--e2e` adds generation. `--judge` adds faithfulness. CI runs stage 1 and fails the build if evidence recall drops.

**Why staged.** Retrieval failure is upstream of everything: if the passage isn't retrieved, no amount of prompting produces a correct grounded answer. Measuring it separately localizes blame — an e2e regression with retrieval unchanged is a generation problem, and vice versa. It also means the cheap, deterministic half runs on every commit while the expensive half runs when you ask for it.

### 2.10 The API key lives server-side

**Decision.** The browser runs BM25 locally and posts the question to `/api/ask`; the Anthropic call happens in a Vercel function.

**Why.** An API key shipped to the browser is a public API key. Splitting at this boundary has a pleasant side effect: retrieval works with no backend at all, so the deployed demo degrades to a "here's what the retriever found" mode instead of breaking when no key is configured — and it says so in the UI rather than failing silently.

---

## 3. Interview questions this design invites

Honest answers, including where the answer is "that's a real weakness."

**"Why not just put the whole 10-K in the context window? Claude has 1M tokens."**
For a single filing you could, and for some questions that's the better answer. Three reasons not to build it that way: cost and latency scale with every query rather than with the corpus; there's no retrieval stage to evaluate, so "why was this answer wrong?" has no decomposition; and it doesn't extend to the actual use case, which is a corpus of many filings across many companies and years. The honest caveat is that long-context is a legitimate competing architecture and the right way to settle it is to *measure* it against the same suite — which the harness supports.

**"How do you know it's not hallucinating?"**
Three layers, and the third is the only one that's evidence. First, the model only sees retrieved passages. Second, the prompt requires a citation per claim and makes refusal an explicit obligation. Neither of those is proof — prompts get ignored. The third layer is measurement: refusal accuracy and the hallucinated-answer rate on questions with no answer in the document, citation support on questions that do. The claim isn't "it doesn't hallucinate," it's "here is the rate, measured on N cases, and here is how it changes when I change the system."

**"Your recall is 100% — isn't that suspicious?"**
Yes, and it should be read as "the harness works," not "retrieval is solved." It's a 13-chunk fixture where top-8 covers most of the document. The number becomes meaningful on a real 10-K with hundreds of chunks, and I'd expect it to drop — particularly on semantic questions with no lexical overlap. That drop is the motivation for hybrid retrieval and the baseline it gets measured against.

**"Why a synthetic filing?"**
So the demo, the tests, and the retrieval eval run offline and deterministically, and so gold answers are known exactly rather than transcribed by hand. It's labelled as fictional everywhere it appears. Real filings come from `npm run ingest`, and the roadmap item is a human-verified eval suite on a real 10-K — which is more work precisely because the golds have to be read out of the document by a person.

**"What's the weakest part of this system?"**
Ranked: (1) single-document scope — no cross-filing or cross-period reasoning, so "how did margin trend over three years?" isn't answerable; (2) BM25 on semantic questions, as above; (3) the judge shares a model family with the answerer, so faithfulness is not independent ground truth; (4) no multi-hop retrieval — a question needing two facts from distant sections depends on both landing in one top-k; (5) numeric extraction scrapes rendered HTML tables when XBRL facts are available and authoritative.

**"How would you know if a change made it better?"**
That's the question the whole project is built around. Change the retriever, run the suite, compare recall and downstream e2e metrics on the same cases. Without that loop, "I switched to embeddings" is an assertion; with it, it's a result. It's also why gold labels are quote-anchored — so a change to chunking doesn't invalidate the labels I'd need to evaluate it.

**"What would you do differently with more time?"**
Hybrid retrieval measured against the suite; a real-filing eval set with human-verified golds; XBRL-based numeric extraction with the text pipeline reserved for narrative sections; multi-filing corpora for trend questions; and a second judge from a different model family to decorrelate the faithfulness metric.

---

## 4. Things deliberately not built

- **A vector database.** Not needed at this corpus size, and it would make retrieval non-deterministic before there was anything to measure that against.
- **Authentication / multi-tenancy.** The demo is a public read-only artifact; adding auth would be scope with no signal.
- **Fine-tuning.** The failure modes here are retrieval and grounding, not the model's lack of financial knowledge. Fine-tuning addresses neither, and would make the system harder to evaluate.
- **A conversational multi-turn interface.** Each question is independent, which keeps the eval unit (one question → one graded answer) clean. Multi-turn is a real product requirement and a meaningfully harder evaluation problem — worth doing after the single-turn metrics are trustworthy.
