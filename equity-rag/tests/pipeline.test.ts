import { describe, expect, it } from "vitest";
import fs from "node:fs";
import { htmlToText } from "../src/ingest/html.js";
import { chunkFiling } from "../src/ingest/chunker.js";
import { buildIndex, search, tokenize } from "../src/retrieval/bm25.js";
import { extractCitations } from "../src/llm/answer.js";
import { gradeAnswer, gradeRetrieval, numbersIn } from "../src/eval/graders.js";
import type { EvalCase } from "../src/eval/types.js";
import type { Chunk, GroundedAnswer } from "../src/types.js";

const fixtureHtml = fs.readFileSync("fixtures/meridian-10k.html", "utf8");
const fixtureText = htmlToText(fixtureHtml);
const fixtureChunks = chunkFiling(fixtureText);
const fixtureIndex = buildIndex(fixtureChunks);

describe("htmlToText", () => {
  it("strips tags and joins table cells with pipes", () => {
    const text = htmlToText(
      "<p>Hello <b>world</b></p><table><tr><td>Revenue</td><td>4,812.6</td></tr></table><script>evil()</script>",
    );
    expect(text).toContain("Hello world");
    expect(text).toContain("Revenue | 4,812.6");
    expect(text).not.toContain("evil");
  });

  it("decodes entities", () => {
    expect(htmlToText("<p>R&amp;D</p>")).toBe("R&D");
  });
});

describe("chunkFiling", () => {
  it("splits the fixture into Item sections", () => {
    const sections = new Set(fixtureChunks.map((c) => c.section));
    expect(sections).toContain("Item 1. Business");
    expect(sections).toContain("Item 1A. Risk Factors");
    expect([...sections].some((s) => s.startsWith("Item 8."))).toBe(true);
  });

  it("does not start a new section on prose that merely references an Item", () => {
    const chunks = chunkFiling(
      "Item 1. Business\nWe make chips.\nSee the litigation risk described in Item 1A of this report which could hurt us and is discussed at length elsewhere in this annual report on Form 10-K today.",
    );
    expect(chunks).toHaveLength(1);
    expect(chunks[0].section).toBe("Item 1. Business");
  });

  it("assigns sequential ids and respects the size target", () => {
    expect(fixtureChunks[0].id).toBe("c001");
    for (const c of fixtureChunks) expect(c.text.length).toBeLessThan(2100);
  });
});

describe("bm25", () => {
  it("keeps numbers with decimals as single tokens", () => {
    expect(tokenize("revenue of $4,812.6 million (56.8%)")).toContain("4812.6");
    expect(tokenize("grew 17.1% YoY")).toContain("17.1");
  });

  it("retrieves the income statement for a revenue question", () => {
    const hits = search(fixtureIndex, "What was total net revenue in fiscal 2025?", 5);
    const joined = hits.map((h) => h.chunk.text).join("\n");
    expect(joined).toContain("4,812.6");
  });

  it("retrieves the debt note for a debt question", () => {
    const hits = search(fixtureIndex, "senior notes long-term debt maturity", 5);
    const joined = hits.map((h) => h.chunk.text).join("\n");
    expect(joined).toContain("4.25% senior notes due 2028");
  });

  it("returns nothing for an all-unknown-token query", () => {
    expect(search(fixtureIndex, "zzzqqq xxyyzz", 5)).toHaveLength(0);
  });
});

describe("extractCitations", () => {
  it("parses bracketed ids in order, deduplicated", () => {
    expect(extractCitations("Revenue was $4.8B [c012] and grew 17.1% [c008][c012].")).toEqual([
      "c012",
      "c008",
    ]);
  });
});

describe("graders", () => {
  const chunk = (id: string, text: string): Chunk => ({ id, section: "Item 7", text });

  it("numbersIn normalizes thousands separators", () => {
    expect(numbersIn("Revenue was $4,812.6 million, up 17.1%")).toEqual([4812.6, 17.1]);
  });

  it("retrieval recall counts evidence quotes found in retrieved chunks", () => {
    const c: EvalCase = {
      id: "t1",
      question: "q",
      type: "numeric",
      evidence_quotes: ["revenue was $4,812.6 million", "not present anywhere"],
      gold: {},
    };
    const r = gradeRetrieval(c, [chunk("c001", "Net revenue was $4,812.6   million in fiscal 2025")]);
    expect(r.recall).toBe(0.5);
    expect(r.missing).toEqual(["not present anywhere"]);
  });

  const baseAnswer: GroundedAnswer = {
    question: "q",
    answer: "Revenue was $4,812.6 million [c001].",
    refused: false,
    citations: ["c001"],
    retrievedIds: ["c001", "c002"],
  };

  it("scores a correct grounded numeric answer", () => {
    const c: EvalCase = {
      id: "t2",
      question: "q",
      type: "numeric",
      evidence_quotes: ["$4,812.6 million"],
      gold: { values: [{ value: 4812.6 }] },
    };
    const g = gradeAnswer(c, baseAnswer, [chunk("c001", "Net revenue was $4,812.6 million")]);
    expect(g.refusalCorrect).toBe(true);
    expect(g.citationsValid).toBe(true);
    expect(g.citationsSupported).toBe(true);
    expect(g.numericAccuracy).toBe(1);
  });

  it("flags citations of chunks that were never retrieved", () => {
    const c: EvalCase = { id: "t3", question: "q", type: "numeric", evidence_quotes: [], gold: {} };
    const g = gradeAnswer(
      c,
      { ...baseAnswer, citations: ["c999"], answer: "Something [c999]." },
      [],
    );
    expect(g.citationsValid).toBe(false);
  });

  it("treats an answer to a refusal case as a hallucination signal", () => {
    const c: EvalCase = {
      id: "t4",
      question: "q",
      type: "refusal",
      evidence_quotes: [],
      gold: { expect_refusal: true },
    };
    const g = gradeAnswer(c, baseAnswer, []);
    expect(g.refusalCorrect).toBe(false);
  });

  it("accepts a correct refusal", () => {
    const c: EvalCase = {
      id: "t5",
      question: "q",
      type: "refusal",
      evidence_quotes: [],
      gold: { expect_refusal: true },
    };
    const g = gradeAnswer(
      c,
      { ...baseAnswer, refused: true, answer: "INSUFFICIENT_EVIDENCE: not disclosed.", citations: [] },
      [],
    );
    expect(g.refusalCorrect).toBe(true);
    expect(g.numericAccuracy).toBeNull();
  });

  it("scores numeric tolerance", () => {
    const c: EvalCase = {
      id: "t6",
      question: "q",
      type: "numeric",
      evidence_quotes: [],
      gold: { values: [{ value: 1114.9, tolerance: 0.2 }] },
    };
    const g = gradeAnswer(
      c,
      { ...baseAnswer, answer: "FCF was approximately $1,115.0 million [c001]." },
      [chunk("c001", "x")],
    );
    expect(g.numericAccuracy).toBe(1);
  });
});

describe("fixture eval suite integrity", () => {
  const suite = JSON.parse(fs.readFileSync("evals/fixture-suite.json", "utf8"));

  it("every evidence quote exists verbatim in the fixture corpus", () => {
    const haystack = fixtureText.toLowerCase().replace(/\s+/g, " ");
    for (const c of suite.cases) {
      for (const q of c.evidence_quotes) {
        expect(
          haystack.includes(q.toLowerCase().replace(/\s+/g, " ")),
          `[${c.id}] quote not found in corpus: "${q}"`,
        ).toBe(true);
      }
    }
  });

  it("refusal cases expect refusal and answerable cases do not", () => {
    for (const c of suite.cases) {
      expect(c.gold.expect_refusal === true).toBe(c.type === "refusal");
    }
  });
});
