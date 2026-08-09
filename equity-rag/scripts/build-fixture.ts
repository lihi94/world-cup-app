/** Build the offline demo corpus from the synthetic fixture filing. */
import fs from "node:fs";
import { htmlToText } from "../src/ingest/html.js";
import { chunkFiling } from "../src/ingest/chunker.js";
import { saveCorpus } from "../src/retrieval/store.js";

const html = fs.readFileSync("fixtures/meridian-10k.html", "utf8");
const text = htmlToText(html);
const chunks = chunkFiling(text);

const file = saveCorpus("fixture", {
  meta: {
    company: "Meridian Semiconductor Devices, Inc. (FICTIONAL — synthetic sample filing)",
    ticker: "MRSD",
    form: "10-K",
    fiscalYear: "2025",
    source: "fixtures/meridian-10k.html",
    synthetic: true,
  },
  chunks,
});

console.log(`Built fixture corpus: ${chunks.length} chunks -> ${file}`);
for (const section of new Set(chunks.map((c) => c.section))) {
  console.log(`  ${section} (${chunks.filter((c) => c.section === section).length} chunks)`);
}
