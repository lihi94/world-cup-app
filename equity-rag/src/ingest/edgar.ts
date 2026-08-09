/**
 * Minimal EDGAR client. SEC requires a descriptive User-Agent with contact
 * info on every request — set EDGAR_USER_AGENT, e.g. "my-app you@example.com".
 * Rate limit: stay under 10 req/s (we make 2 requests total per filing).
 */

const UA =
  process.env.EDGAR_USER_AGENT ??
  "equity-rag-demo (https://github.com/lihi94/world-cup-app)";

export interface FilingRef {
  cik: string;
  company: string;
  form: string;
  accessionNumber: string;
  primaryDocument: string;
  filingDate: string;
  reportDate: string;
}

/** Well-known CIKs so the demo works without a ticker-lookup request. */
export const KNOWN_CIKS: Record<string, string> = {
  AAPL: "0000320193",
  MSFT: "0000789019",
  NVDA: "0001045810",
  AMZN: "0001018724",
  GOOGL: "0001652044",
  META: "0001326801",
  TSLA: "0001318605",
};

async function edgarFetch(url: string): Promise<Response> {
  const res = await fetch(url, {
    headers: { "User-Agent": UA, "Accept-Encoding": "gzip, deflate" },
  });
  if (!res.ok) {
    throw new Error(`EDGAR request failed (${res.status} ${res.statusText}): ${url}`);
  }
  return res;
}

/** Find the most recent filing of the given form type for a CIK. */
export async function findLatestFiling(cik: string, form = "10-K"): Promise<FilingRef> {
  const padded = cik.replace(/^0+/, "").padStart(10, "0");
  const res = await edgarFetch(`https://data.sec.gov/submissions/CIK${padded}.json`);
  const data = (await res.json()) as {
    name: string;
    filings: {
      recent: {
        form: string[];
        accessionNumber: string[];
        primaryDocument: string[];
        filingDate: string[];
        reportDate: string[];
      };
    };
  };
  const r = data.filings.recent;
  for (let i = 0; i < r.form.length; i++) {
    if (r.form[i] === form) {
      return {
        cik: padded,
        company: data.name,
        form,
        accessionNumber: r.accessionNumber[i],
        primaryDocument: r.primaryDocument[i],
        filingDate: r.filingDate[i],
        reportDate: r.reportDate[i],
      };
    }
  }
  throw new Error(`No ${form} filing found for CIK ${cik}`);
}

/** Download the primary document (HTML) of a filing. */
export async function downloadFiling(ref: FilingRef): Promise<string> {
  const accession = ref.accessionNumber.replace(/-/g, "");
  const cikNum = String(Number(ref.cik));
  const url = `https://www.sec.gov/Archives/edgar/data/${cikNum}/${accession}/${ref.primaryDocument}`;
  const res = await edgarFetch(url);
  return res.text();
}
