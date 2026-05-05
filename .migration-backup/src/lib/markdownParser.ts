export type MdBlock =
  | { type: 'heading'; level: 1 | 2 | 3; text: string }
  | { type: 'paragraph'; runs: MdRun[] }
  | { type: 'bullet'; runs: MdRun[]; ordered: boolean; index?: number }
  | { type: 'table'; headers: string[]; rows: string[][] }
  | { type: 'code'; text: string }
  | { type: 'rule' };

export type MdRun =
  | { bold: false; text: string }
  | { bold: true; text: string };

export function parseInline(text: string): MdRun[] {
  const runs: MdRun[] = [];
  const re = /\*\*(.+?)\*\*/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) runs.push({ bold: false, text: text.slice(last, m.index) });
    runs.push({ bold: true, text: m[1] });
    last = m.index + m[0].length;
  }
  if (last < text.length) runs.push({ bold: false, text: text.slice(last) });
  return runs.length ? runs : [{ bold: false, text }];
}

function isTableSeparator(line: string): boolean {
  return /^\s*\|[\s\-:|]+\|\s*$/.test(line);
}

function parseTableRow(line: string): string[] {
  return line
    .split('|')
    .map((c) => c.trim())
    .filter((_, i, arr) => i > 0 && i < arr.length - 1);
}

export function parseMarkdown(text: string): MdBlock[] {
  const blocks: MdBlock[] = [];
  const lines = text.split('\n');
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    // Blank line
    if (!trimmed) { i++; continue; }

    // Fenced code block
    if (trimmed.startsWith('```')) {
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].trim().startsWith('```')) {
        codeLines.push(lines[i]);
        i++;
      }
      blocks.push({ type: 'code', text: codeLines.join('\n') });
      i++;
      continue;
    }

    // Horizontal rule
    if (/^[-*]{3,}\s*$/.test(trimmed)) {
      blocks.push({ type: 'rule' });
      i++;
      continue;
    }

    // Heading
    const h3 = trimmed.match(/^###\s+(.*)/);
    if (h3) { blocks.push({ type: 'heading', level: 3, text: h3[1] }); i++; continue; }
    const h2 = trimmed.match(/^##\s+(.*)/);
    if (h2) { blocks.push({ type: 'heading', level: 2, text: h2[1] }); i++; continue; }
    const h1 = trimmed.match(/^#\s+(.*)/);
    if (h1) { blocks.push({ type: 'heading', level: 1, text: h1[1] }); i++; continue; }

    // Table: collect all consecutive pipe-lines
    if (trimmed.startsWith('|') && i + 1 < lines.length && lines[i + 1].trim().startsWith('|')) {
      const tableLines: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith('|')) {
        tableLines.push(lines[i]);
        i++;
      }
      if (tableLines.length >= 2) {
        const headers = parseTableRow(tableLines[0]);
        const bodyLines = tableLines.slice(2).filter((l) => !isTableSeparator(l));
        const rows = bodyLines.map(parseTableRow);
        blocks.push({ type: 'table', headers, rows });
      }
      continue;
    }

    // Ordered list
    const ordered = trimmed.match(/^(\d+)\.\s+(.*)/);
    if (ordered) {
      blocks.push({ type: 'bullet', runs: parseInline(ordered[2]), ordered: true, index: parseInt(ordered[1]) });
      i++;
      continue;
    }

    // Unordered list
    const unordered = trimmed.match(/^[-*•]\s+(.*)/);
    if (unordered) {
      blocks.push({ type: 'bullet', runs: parseInline(unordered[1]), ordered: false });
      i++;
      continue;
    }

    // Bold-only line (treated as a sub-heading)
    if (trimmed.startsWith('**') && trimmed.endsWith('**') && trimmed.length > 4) {
      blocks.push({ type: 'heading', level: 3, text: trimmed.slice(2, -2) });
      i++;
      continue;
    }

    // Regular paragraph
    blocks.push({ type: 'paragraph', runs: parseInline(trimmed) });
    i++;
  }

  return blocks;
}
