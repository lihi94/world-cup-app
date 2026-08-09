import type { Chunk } from "../types.js";

const ITEM_HEADING = /^item\s+\d{1,2}[a-c]?\s*[.:—-]/i;

export interface ChunkerOptions {
  /** Target chunk size in characters. */
  maxChars?: number;
  /** Characters of trailing context carried into the next chunk. */
  overlapChars?: number;
}

interface Section {
  heading: string;
  lines: string[];
}

/**
 * Split extracted filing text into sections by "Item N." headings, then into
 * overlapping chunks that respect line boundaries. Every chunk keeps its
 * section label so citations can point back to a place in the document.
 */
export function chunkFiling(text: string, opts: ChunkerOptions = {}): Chunk[] {
  const maxChars = opts.maxChars ?? 1600;
  const overlapChars = opts.overlapChars ?? 200;

  const sections = splitSections(text.split(/\n/));
  const chunks: Chunk[] = [];

  for (const section of sections) {
    let buf: string[] = [];
    let bufLen = 0;

    const emit = () => {
      const body = buf.join("\n").trim();
      if (!body) return;
      chunks.push({
        id: `c${String(chunks.length + 1).padStart(3, "0")}`,
        section: section.heading,
        text: body,
      });
      // Carry a tail of the emitted chunk as overlap for continuity.
      const tail: string[] = [];
      let tailLen = 0;
      for (let i = buf.length - 1; i >= 0 && tailLen < overlapChars; i--) {
        tail.unshift(buf[i]);
        tailLen += buf[i].length + 1;
      }
      buf = tail;
      bufLen = tailLen;
    };

    for (const line of section.lines) {
      if (bufLen + line.length > maxChars && bufLen > overlapChars) emit();
      buf.push(line);
      bufLen += line.length + 1;
    }
    // Final flush without carrying overlap forward.
    const body = buf.join("\n").trim();
    if (body && (chunks.length === 0 || !chunks[chunks.length - 1].text.endsWith(body))) {
      chunks.push({
        id: `c${String(chunks.length + 1).padStart(3, "0")}`,
        section: section.heading,
        text: body,
      });
    }
  }
  return chunks;
}

function splitSections(lines: string[]): Section[] {
  const sections: Section[] = [];
  let current: Section = { heading: "Preamble", lines: [] };

  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;
    // A short line starting with "Item N." starts a new section; long lines
    // merely *reference* an item ("...as described in Item 1A above").
    if (ITEM_HEADING.test(line) && line.length < 120) {
      if (current.lines.length) sections.push(current);
      current = { heading: line, lines: [line] };
    } else {
      current.lines.push(line);
    }
  }
  if (current.lines.length) sections.push(current);
  return sections;
}
