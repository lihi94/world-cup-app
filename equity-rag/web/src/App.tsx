import { useMemo, useRef, useState } from "react";
import {
  ask,
  corpus,
  runRetrievalEval,
  tokenizeAnswer,
  SAMPLE_QUESTIONS,
  type AskResponse,
} from "./lib.js";

type Tab = "ask" | "evals";

export function App() {
  const [tab, setTab] = useState<Tab>("ask");
  return (
    <div className="shell">
      <header>
        <div>
          <h1>equity-rag</h1>
          <p className="sub">
            Grounded Q&amp;A over SEC filings — every claim cited, unanswerable questions refused,
            accuracy measured by an eval pipeline.
          </p>
        </div>
        <nav>
          <button className={tab === "ask" ? "active" : ""} onClick={() => setTab("ask")}>
            Ask
          </button>
          <button className={tab === "evals" ? "active" : ""} onClick={() => setTab("evals")}>
            Evals
          </button>
        </nav>
      </header>
      <div className="corpus-bar">
        Corpus: <strong>{corpus.meta.company}</strong> — {corpus.meta.form}
        {corpus.meta.fiscalYear ? `, FY${corpus.meta.fiscalYear}` : ""} · {corpus.chunks.length}{" "}
        chunks
        {corpus.meta.synthetic && (
          <span className="badge synthetic">synthetic sample filing (fictional company)</span>
        )}
      </div>
      {tab === "ask" ? <AskView /> : <EvalsView />}
      <footer>
        BM25 retrieval runs in your browser; answers are generated server-side by Claude from the
        retrieved passages only. Source:{" "}
        <a href="https://github.com/lihi94/world-cup-app/tree/claude/equity-research-rag-platform-s9ibku/equity-rag">
          equity-rag on GitHub
        </a>
      </footer>
    </div>
  );
}

function AskView() {
  const [question, setQuestion] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<AskResponse | null>(null);
  const [activeCite, setActiveCite] = useState<string | null>(null);
  const passageRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const submit = async (q: string) => {
    const trimmed = q.trim();
    if (!trimmed || busy) return;
    setBusy(true);
    setResult(null);
    setActiveCite(null);
    setResult(await ask(trimmed));
    setBusy(false);
  };

  const jumpTo = (id: string) => {
    setActiveCite(id);
    passageRefs.current[id]?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  return (
    <main className="ask-grid">
      <section className="qa">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void submit(question);
          }}
        >
          <input
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="Ask about the filing — revenue, margins, debt, risks…"
            disabled={busy}
          />
          <button type="submit" disabled={busy || !question.trim()}>
            {busy ? "…" : "Ask"}
          </button>
        </form>
        <div className="chips">
          {SAMPLE_QUESTIONS.map((s) => (
            <button
              key={s.label}
              className={`chip ${s.trap ? "trap" : ""}`}
              title={s.trap ? "Not answerable from the filing — should refuse" : s.q}
              onClick={() => {
                setQuestion(s.q);
                void submit(s.q);
              }}
            >
              {s.trap ? "⚠ " : ""}
              {s.label}
            </button>
          ))}
        </div>

        {result && result.mode === "retrieval-only" && (
          <div className="panel note">
            <strong>Retrieval-only mode.</strong> No answer backend is configured (the serverless
            function needs an <code>ANTHROPIC_API_KEY</code>), so you're seeing what the pipeline's
            first stage found — the ranked passages on the right. Deploy with a key to get grounded,
            cited answers here.
          </div>
        )}

        {result && result.mode === "llm" && (
          <div className={`panel answer ${result.refused ? "refused" : ""}`}>
            <div className="panel-label">{result.refused ? "Refused — insufficient evidence" : "Answer"}</div>
            <p>
              {tokenizeAnswer(result.answer).map((part, i) =>
                part.kind === "cite" ? (
                  <button key={i} className="cite" onClick={() => jumpTo(part.value)}>
                    {part.value}
                  </button>
                ) : (
                  <span key={i}>{part.value}</span>
                ),
              )}
            </p>
            {!result.refused && (
              <div className="cite-summary">
                Cited passages: {result.citations.length ? result.citations.join(", ") : "none"}
              </div>
            )}
          </div>
        )}
      </section>

      <section className="passages">
        <div className="panel-label">
          Retrieved passages {result ? `(top ${result.hits.length}, BM25)` : ""}
        </div>
        {!result && <p className="hint">Ask a question to see which parts of the filing the system reads before answering.</p>}
        {result?.hits.map((h) => (
          <div
            key={h.id}
            ref={(el) => {
              passageRefs.current[h.id] = el;
            }}
            className={`passage ${result.citations.includes(h.id) ? "cited" : ""} ${
              activeCite === h.id ? "flash" : ""
            }`}
          >
            <div className="passage-head">
              <span className="pid">{h.id}</span>
              <span className="section">{h.section}</span>
              <span className="score">score {h.score.toFixed(2)}</span>
              {result.citations.includes(h.id) && <span className="badge cited-badge">cited</span>}
            </div>
            <p>{h.text}</p>
          </div>
        ))}
      </section>
    </main>
  );
}

function EvalsView() {
  const evalRun = useMemo(() => runRetrievalEval(8), []);
  return (
    <main className="evals">
      <div className="cards">
        <div className="card">
          <div className="metric">{(evalRun.meanRecall * 100).toFixed(1)}%</div>
          <div className="label">evidence recall@8 — every gold quote the answer needs, found by retrieval</div>
        </div>
        <div className="card">
          <div className="metric">
            {evalRun.perfect}/{evalRun.answerable}
          </div>
          <div className="label">answerable cases with full evidence recall</div>
        </div>
        <div className="card">
          <div className="metric">{evalRun.rows.length - evalRun.answerable}</div>
          <div className="label">refusal traps — questions a careless system would hallucinate answers to</div>
        </div>
      </div>
      <p className="evals-note">
        This table is computed <em>live in your browser</em>: the same BM25 index and the same
        deterministic graders as the CLI eval (<code>npm run eval</code>). Gold evidence is anchored
        to verbatim quotes, so it survives re-chunking. End-to-end metrics (refusal accuracy,
        hallucinated-answer rate, citation validity, numeric accuracy, LLM-judged faithfulness) come
        from <code>npm run eval -- --e2e --judge</code>.
      </p>
      <table>
        <thead>
          <tr>
            <th>case</th>
            <th>question</th>
            <th>type</th>
            <th>evidence found</th>
            <th>recall@8</th>
          </tr>
        </thead>
        <tbody>
          {evalRun.rows.map((r) => (
            <tr key={r.caseId} className={r.type === "refusal" ? "muted" : ""}>
              <td className="mono">{r.caseId}</td>
              <td>{r.question}</td>
              <td>{r.type}</td>
              <td className="mono">
                {r.type === "refusal" ? "— (graded e2e)" : `${r.quotesFound}/${r.quotesTotal}`}
              </td>
              <td className="mono">{r.type === "refusal" ? "—" : `${(r.recall * 100).toFixed(0)}%`}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </main>
  );
}
