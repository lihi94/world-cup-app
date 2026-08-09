/**
 * Ingest a real 10-K from SEC EDGAR into a local corpus.
 *
 *   npm run ingest -- AAPL            # by ticker (known CIKs) — latest 10-K
 *   npm run ingest -- 0000320193      # by CIK
 *   npm run ingest -- NVDA --form 10-Q
 *
 * Requires outbound access to sec.gov. Set EDGAR_USER_AGENT to
 * "your-app-name your-email" per SEC fair-access policy.
 */
import { KNOWN_CIKS, findLatestFiling, downloadFiling } from "../src/ingest/edgar.js";
import { htmlToText } from "../src/ingest/html.js";
import { chunkFiling } from "../src/ingest/chunker.js";
import { saveCorpus } from "../src/retrieval/store.js";

const args = process.argv.slice(2);
const target = args.find((a) => !a.startsWith("--"));
if (!target) {
  console.error("Usage: npm run ingest -- <TICKER|CIK> [--form 10-K]");
  process.exit(1);
}
const form = args.includes("--form") ? args[args.indexOf("--form") + 1] : "10-K";
const cik = /^\d+$/.test(target) ? target : KNOWN_CIKS[target.toUpperCase()];
if (!cik) {
  console.error(
    `Unknown ticker "${target}". Pass a CIK number instead (find it at https://www.sec.gov/cgi-bin/browse-edgar).`,
  );
  process.exit(1);
}

const ref = await findLatestFiling(cik, form);
console.log(`Found ${ref.form} for ${ref.company}: filed ${ref.filingDate}, period ${ref.reportDate}`);
console.log(`Downloading ${ref.primaryDocument}...`);
const html = await downloadFiling(ref);
console.log(`Downloaded ${(html.length / 1024 / 1024).toFixed(1)} MB. Extracting text...`);

const text = htmlToText(html);
const chunks = chunkFiling(text);
const name = target.toLowerCase();
const file = saveCorpus(name, {
  meta: {
    company: ref.company,
    ticker: /^\d+$/.test(target) ? undefined : target.toUpperCase(),
    cik: ref.cik,
    form: ref.form,
    fiscalYear: ref.reportDate?.slice(0, 4),
    filedAt: ref.filingDate,
    source: `EDGAR ${ref.accessionNumber}/${ref.primaryDocument}`,
  },
  chunks,
});
console.log(`Saved ${chunks.length} chunks -> ${file}`);
console.log(`Ask a question:  npm run ask -- --corpus ${name} "What was total revenue?"`);
