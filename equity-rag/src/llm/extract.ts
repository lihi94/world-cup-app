import { z } from "zod/v4";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import type { Bm25Index } from "../retrieval/bm25.js";
import { search } from "../retrieval/bm25.js";
import type { CorpusMeta } from "../types.js";
import { getClient, MODEL } from "./client.js";

/**
 * Structured extraction of headline financials. Every metric must carry a
 * verbatim source quote and the chunk id it came from — a value with no
 * traceable source is reported as null, never guessed.
 */

const Metric = z.object({
  value: z.number().nullable().describe("Numeric value as reported; null when not found in the passages"),
  unit: z.string().nullable().describe('Unit as reported, e.g. "millions USD", "%", "per share"'),
  source_quote: z.string().nullable().describe("Verbatim quote (<=200 chars) from the passage supporting the value"),
  chunk_id: z.string().nullable().describe('Passage id the quote came from, e.g. "c012"'),
});

export const FinancialsSchema = z.object({
  fiscal_year: z.string().nullable(),
  currency: z.string().nullable(),
  total_revenue: Metric,
  gross_margin_pct: Metric,
  operating_income: Metric,
  net_income: Metric,
  diluted_eps: Metric,
  operating_cash_flow: Metric,
  total_debt: Metric,
  cash_and_equivalents: Metric,
});

export type Financials = z.infer<typeof FinancialsSchema>;

const METRIC_QUERIES = [
  "total net revenue for the fiscal year",
  "gross profit gross margin percentage",
  "operating income operating expenses",
  "net income diluted earnings per share",
  "cash flow from operating activities",
  "total debt senior notes outstanding cash and cash equivalents",
];

const SYSTEM = `You extract financial metrics from SEC filing passages into a strict schema.
Rules:
- Use ONLY the numbered passages provided. No outside knowledge.
- For every metric, include a verbatim source_quote and the chunk_id of the passage it appears in.
- If a metric is not present in the passages, set its value, unit, source_quote, and chunk_id all to null. Never estimate.
- Report values exactly as printed (if revenue is "4,812.6" in millions, value is 4812.6 and unit is "millions USD").`;

export async function extractFinancials(
  index: Bm25Index,
  meta: CorpusMeta,
): Promise<Financials> {
  // Union of retrievals across metric-focused queries, deduped by chunk id.
  const byId = new Map<string, { id: string; section: string; text: string }>();
  for (const q of METRIC_QUERIES) {
    for (const hit of search(index, q, 4)) byId.set(hit.chunk.id, hit.chunk);
  }
  const passages = [...byId.values()]
    .sort((a, b) => a.id.localeCompare(b.id))
    .map((c) => `[${c.id}] (${c.section})\n${c.text}`)
    .join("\n\n---\n\n");

  const response = await getClient().messages.parse({
    model: MODEL,
    max_tokens: 16000,
    system: SYSTEM,
    messages: [
      {
        role: "user",
        content: `Filing: ${meta.company} — ${meta.form}${meta.fiscalYear ? `, FY${meta.fiscalYear}` : ""}.\n\nPassages:\n\n${passages}\n\nExtract the schema fields for the most recent fiscal year reported.`,
      },
    ],
    output_config: { format: zodOutputFormat(FinancialsSchema) },
  });

  if (!response.parsed_output) {
    throw new Error(`Extraction did not produce a schema-valid result (stop_reason: ${response.stop_reason})`);
  }
  return response.parsed_output;
}
