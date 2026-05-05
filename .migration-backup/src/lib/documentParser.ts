import * as mammothLib from 'mammoth';

export interface ParsedDocument {
  text: string;
  sections: Record<string, string>;
}

const SECTION_PATTERNS = [
  /\b(abstract|samenvatting)\b/i,
  /\b(introduction|introductie|inleiding)\b/i,
  /\b(methods?|methodology|methoden?|methodologie)\b/i,
  /\b(results?|resultaten)\b/i,
  /\b(discussion|discussie|bespreking)\b/i,
  /\b(conclusion|conclusie|conclusies)\b/i,
  /\b(references|referenties|literatuur|bibliography)\b/i,
  /\b(acknowledgements?|dankwoord)\b/i,
];

function extractSections(text: string): Record<string, string> {
  const sections: Record<string, string> = {};
  const lines = text.split('\n');
  let currentSection = 'Algemeen';
  let currentContent: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    const isHeader = SECTION_PATTERNS.some((p) => p.test(trimmed)) && trimmed.length < 80;

    if (isHeader) {
      if (currentContent.length > 0) {
        sections[currentSection] = currentContent.join('\n').trim();
      }
      currentSection = trimmed.replace(/^\d+\.?\s*/, '');
      currentContent = [];
    } else {
      currentContent.push(trimmed);
    }
  }

  if (currentContent.length > 0) {
    sections[currentSection] = currentContent.join('\n').trim();
  }

  return sections;
}

export async function parsePDF(file: File): Promise<ParsedDocument> {
  const arrayBuffer = await file.arrayBuffer();
  const pdfjsLib = await import('pdfjs-dist');
  pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
    'pdfjs-dist/build/pdf.worker.mjs',
    import.meta.url
  ).toString();

  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  let fullText = '';

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const pageText = content.items
      .map((item: { str?: string }) => item.str || '')
      .join(' ');
    fullText += pageText + '\n';
  }

  return {
    text: fullText.trim(),
    sections: extractSections(fullText),
  };
}

export async function parseDOCX(file: File): Promise<ParsedDocument> {
  const arrayBuffer = await file.arrayBuffer();
  // Handle both ESM namespace and CJS default-wrapped shapes
  const mammoth = (mammothLib as { default?: typeof mammothLib }).default ?? mammothLib;
  const result = await mammoth.extractRawText({ arrayBuffer });
  const text = result.value;

  return {
    text: text.trim(),
    sections: extractSections(text),
  };
}

export async function parseDocument(file: File): Promise<ParsedDocument> {
  const ext = file.name.toLowerCase().split('.').pop();
  if (ext === 'pdf') return parsePDF(file);
  if (ext === 'docx' || ext === 'doc') return parseDOCX(file);
  throw new Error(`Bestandstype .${ext} wordt niet ondersteund`);
}
