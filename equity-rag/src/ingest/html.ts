import { Parser } from "htmlparser2";

const SKIP_TAGS = new Set(["script", "style", "head", "title", "noscript"]);
const BLOCK_TAGS = new Set([
  "p", "div", "section", "article", "li", "tr", "table",
  "h1", "h2", "h3", "h4", "h5", "h6", "br", "hr",
]);

/**
 * Convert filing HTML (including inline-XBRL 10-K documents) to plain text.
 * Block-level elements become line breaks; table cells within a row are
 * joined with " | " so tabular financials stay readable on one line.
 */
export function htmlToText(html: string): string {
  const out: string[] = [];
  let current = "";
  let skipDepth = 0;
  let inRow = false;

  const flush = () => {
    const line = current.replace(/\s+/g, " ").trim();
    if (line) out.push(line);
    current = "";
  };

  const parser = new Parser(
    {
      onopentag(name) {
        if (SKIP_TAGS.has(name)) skipDepth++;
        if (skipDepth > 0) return;
        if (name === "tr") {
          flush();
          inRow = true;
        } else if (name === "td" || name === "th") {
          if (current.trim()) current += " | ";
        } else if (BLOCK_TAGS.has(name)) {
          flush();
        }
      },
      ontext(text) {
        if (skipDepth === 0) current += text;
      },
      onclosetag(name) {
        if (SKIP_TAGS.has(name)) skipDepth = Math.max(0, skipDepth - 1);
        if (skipDepth > 0) return;
        if (name === "tr") {
          flush();
          inRow = false;
        } else if (BLOCK_TAGS.has(name) && !inRow) {
          flush();
        }
      },
      onend() {
        flush();
      },
    },
    { decodeEntities: true, lowerCaseTags: true },
  );
  parser.write(html);
  parser.end();

  return out.join("\n");
}
