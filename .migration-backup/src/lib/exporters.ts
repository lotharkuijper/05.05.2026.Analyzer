import {
  Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType,
  Table, TableRow, TableCell, ShadingType, BorderStyle, WidthType, NumberFormat,
  convertInchesToTwip,
} from 'docx';
import type { Agent, Analysis, UploadedDocument } from '../types';
import type { Language } from './i18n';
import { t } from './i18n';
import { parseMarkdown, parseInline } from './markdownParser';
import type { MdBlock } from './markdownParser';

// ─── Colour palette ──────────────────────────────────────────────────────────
const C = {
  // Table colours — lichte achtergrond, donkere tekst
  tableHeaderBg: 'DBEAFE',    // pastel blue-200
  tableHeaderText: '1E3A5F',  // donkerblauw — goed contrast op lichtblauw
  tableRowEven: 'FFFFFF',
  tableRowOdd: 'F0F7FF',      // zeer licht blauw, nauwelijks zichtbaar
  tableBorderOuter: '1E3A5F',
  tableBorderInner: 'BFDBFE',
  // Meta-tabel
  metaLabelBg: 'EFF6FF',      // blue-50 — heel licht
  metaLabelText: '1E3A5F',
  metaAccentLine: '3B82F6',   // blue-500
  // Typografie
  bodyText: '1E293B',
  heading1: '0F172A',
  heading2: '1E3A5F',
  heading3: '1E40AF',         // blue-800
  titleColor: '0F172A',
  muted: '64748B',
  codeBg: 'F1F5F9',
  codeBorder: '94A3B8',
  // Synthesis banner
  synthesisBg: 'FFF7ED',      // oranje-tint
  synthesisAccent: 'EA580C',  // oranje-700
};

const FONT = 'Calibri';
const MARGIN = convertInchesToTwip(1.0);

// ─── Border helpers ───────────────────────────────────────────────────────────
const outerBorder = { style: BorderStyle.SINGLE, size: 8, color: C.tableBorderOuter };
const innerBorder = { style: BorderStyle.SINGLE, size: 4, color: C.tableBorderInner };
const nilBorder   = { style: BorderStyle.NIL, size: 0, color: 'auto' };

// ─── Inline text helpers ──────────────────────────────────────────────────────
function textRuns(text: string, opts: { bold?: boolean; size?: number; color?: string } = {}): TextRun[] {
  const runs = parseInline(text);
  return runs.map(
    (r) =>
      new TextRun({
        text: r.text,
        bold: opts.bold || r.bold,
        size: opts.size ?? 22,
        color: opts.color ?? C.bodyText,
        font: FONT,
      })
  );
}

function spacer(before = 0, after = 0): Paragraph {
  return new Paragraph({ text: '', spacing: { before, after } });
}

// ─── Table builder ────────────────────────────────────────────────────────────
function makeWordTable(headers: string[], rows: string[][], accentHex?: string): Table {
  const colCount = Math.max(headers.length, ...rows.map((r) => r.length), 1);
  const colWidth = Math.floor(9026 / colCount);
  // Koptekst: lichtblauw pastel afgeleid van de agentkleur (of standaard blauw-200)
  const headerBg = accentHex ? pastelFromAccent(accentHex) : C.tableHeaderBg;
  // Tekstkleur koptekst: donker zodat het altijd leesbaar is op lichte achtergrond
  const headerText = accentHex ? darkenForText(accentHex) : C.tableHeaderText;

  const headerRow = new TableRow({
    tableHeader: true,
    children: Array.from({ length: colCount }, (_, i) =>
      new TableCell({
        children: [
          new Paragraph({
            children: [new TextRun({ text: headers[i] ?? '', bold: true, size: 21, color: headerText, font: FONT })],
            spacing: { before: 100, after: 100 },
          }),
        ],
        shading: { fill: headerBg, type: ShadingType.SOLID, color: 'auto' },
        borders: {
          top: outerBorder, bottom: outerBorder,
          left: i === 0 ? outerBorder : innerBorder,
          right: i === colCount - 1 ? outerBorder : innerBorder,
        },
        width: { size: colWidth, type: WidthType.DXA },
        margins: { top: 80, bottom: 80, left: 140, right: 140 },
      })
    ),
  });

  const dataRows = rows.map(
    (cols, rowIdx) =>
      new TableRow({
        children: Array.from({ length: colCount }, (_, ci) =>
          new TableCell({
            children: [
              new Paragraph({
                children: textRuns(cols[ci] ?? '', { size: 20, color: C.bodyText }),
                spacing: { before: 80, after: 80 },
              }),
            ],
            shading: rowIdx % 2 === 1
              ? { fill: C.tableRowOdd, type: ShadingType.SOLID, color: 'auto' }
              : { fill: C.tableRowEven, type: ShadingType.SOLID, color: 'auto' },
            borders: {
              top: rowIdx === 0 ? outerBorder : innerBorder,
              bottom: rowIdx === rows.length - 1 ? outerBorder : innerBorder,
              left: ci === 0 ? outerBorder : innerBorder,
              right: ci === colCount - 1 ? outerBorder : innerBorder,
            },
            width: { size: colWidth, type: WidthType.DXA },
            margins: { top: 80, bottom: 80, left: 140, right: 140 },
          })
        ),
      })
  );

  return new Table({
    rows: [headerRow, ...dataRows],
    width: { size: 9026, type: WidthType.DXA },
  });
}

// Blend agent colour 15% into white — altijd een licht pastel
function pastelFromAccent(hex: string): string {
  const h = hex.replace('#', '');
  if (h.length !== 6) return C.tableHeaderBg;
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  const mix = (v: number) => Math.round(v * 0.15 + 255 * 0.85);
  return [mix(r), mix(g), mix(b)].map((n) => n.toString(16).padStart(2, '0')).join('').toUpperCase();
}

// Donkere tekstkleur op basis van agentkleur (40% tint voor genoeg contrast)
function darkenForText(hex: string): string {
  const h = hex.replace('#', '');
  if (h.length !== 6) return C.tableHeaderText;
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  const darken = (v: number) => Math.round(v * 0.45);
  return [darken(r), darken(g), darken(b)].map((n) => n.toString(16).padStart(2, '0')).join('').toUpperCase();
}

// ─── Metadata table ───────────────────────────────────────────────────────────
function metaTable(rows: Array<[string, string]>): Table {
  return new Table({
    rows: rows.map(
      ([label, value], rowIdx) =>
        new TableRow({
          children: [
            new TableCell({
              children: [
                new Paragraph({
                  children: [new TextRun({ text: label, bold: true, size: 20, color: C.metaLabelText, font: FONT })],
                  spacing: { before: 80, after: 80 },
                }),
              ],
              shading: { fill: C.metaLabelBg, type: ShadingType.SOLID, color: 'auto' },
              borders: {
                top: rowIdx === 0 ? outerBorder : innerBorder,
                bottom: innerBorder,
                left: { style: BorderStyle.SINGLE, size: 14, color: C.metaAccentLine },
                right: nilBorder,
              },
              width: { size: 2000, type: WidthType.DXA },
              margins: { top: 80, bottom: 80, left: 160, right: 80 },
            }),
            new TableCell({
              children: [
                new Paragraph({
                  children: [new TextRun({ text: value, size: 20, color: C.bodyText, font: FONT })],
                  spacing: { before: 80, after: 80 },
                }),
              ],
              shading: { fill: 'FFFFFF', type: ShadingType.SOLID, color: 'auto' },
              borders: {
                top: rowIdx === 0 ? outerBorder : innerBorder,
                bottom: innerBorder,
                left: nilBorder,
                right: outerBorder,
              },
              width: { size: 7026, type: WidthType.DXA },
              margins: { top: 80, bottom: 80, left: 140, right: 140 },
            }),
          ],
        })
    ),
    width: { size: 9026, type: WidthType.DXA },
  });
}

// ─── Markdown → docx blocks ───────────────────────────────────────────────────
function blocksToDocx(blocks: MdBlock[], opts: { agentColor?: string } = {}): Array<Paragraph | Table> {
  const out: Array<Paragraph | Table> = [];

  for (const block of blocks) {
    switch (block.type) {
      case 'heading': {
        const sizes: Record<number, number> = { 1: 30, 2: 26, 3: 23 };
        const colors: Record<number, string> = { 1: C.heading1, 2: C.heading2, 3: C.heading3 };
        const levels: Record<number, HeadingLevel> = {
          1: HeadingLevel.HEADING_1,
          2: HeadingLevel.HEADING_2,
          3: HeadingLevel.HEADING_3,
        };
        const lvl = block.level;
        out.push(
          new Paragraph({
            children: [new TextRun({ text: block.text, bold: true, size: sizes[lvl], color: colors[lvl], font: FONT })],
            heading: levels[lvl],
            spacing: { before: lvl === 1 ? 400 : lvl === 2 ? 320 : 240, after: lvl === 1 ? 120 : 80 },
            border: lvl <= 2
              ? { bottom: { style: BorderStyle.SINGLE, size: lvl === 1 ? 6 : 3, color: lvl === 1 ? C.tableBorderOuter : C.tableBorderInner } }
              : undefined,
          })
        );
        break;
      }

      case 'paragraph':
        out.push(
          new Paragraph({
            children: block.runs.map((r) => new TextRun({ text: r.text, bold: r.bold, size: 22, color: C.bodyText, font: FONT })),
            spacing: { after: 120 },
          })
        );
        break;

      case 'bullet':
        if (block.ordered) {
          out.push(
            new Paragraph({
              children: block.runs.map((r) => new TextRun({ text: r.text, bold: r.bold, size: 22, color: C.bodyText, font: FONT })),
              numbering: { reference: 'ordered-list', level: 0 },
              spacing: { after: 80 },
            })
          );
        } else {
          out.push(
            new Paragraph({
              children: block.runs.map((r) => new TextRun({ text: r.text, bold: r.bold, size: 22, color: C.bodyText, font: FONT })),
              bullet: { level: 0 },
              spacing: { after: 80 },
            })
          );
        }
        break;

      case 'table':
        if (block.headers.length > 0 || block.rows.length > 0) {
          out.push(spacer(120, 60));
          out.push(makeWordTable(block.headers, block.rows, opts.agentColor));
          out.push(spacer(60, 120));
        }
        break;

      case 'code':
        out.push(
          new Paragraph({
            children: [new TextRun({ text: block.text, font: 'Courier New', size: 18, color: C.heading3 })],
            spacing: { before: 120, after: 120 },
            shading: { fill: 'F1F5F9', type: ShadingType.SOLID, color: 'auto' },
            border: { left: { style: BorderStyle.SINGLE, size: 12, color: C.codeBorder } },
            indent: { left: 360, right: 360 },
          })
        );
        break;

      case 'rule':
        out.push(
          new Paragraph({
            text: '',
            border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: C.tableBorderInner } },
            spacing: { before: 160, after: 160 },
          })
        );
        break;
    }
  }

  return out;
}

// ─── Section divider ──────────────────────────────────────────────────────────
function agentDivider(color: string, name: string, role: string): Paragraph[] {
  const hex = color.replace('#', '').toUpperCase();
  const pastelBg = pastelFromAccent(hex);
  const darkText = darkenForText(hex);
  return [
    // Ruimte voor de nieuwe sectie
    spacer(560, 0),
    // Titelbalk: lichte pastelachtergrond, dikke gekleurde linkerkant
    new Paragraph({
      children: [
        new TextRun({ text: name, bold: true, size: 30, color: darkText, font: FONT }),
        new TextRun({ text: `   \u2014   ${role}`, size: 22, color: C.muted, font: FONT }),
      ],
      shading: { fill: pastelBg, type: ShadingType.SOLID, color: 'auto' },
      spacing: { before: 0, after: 0 },
      border: {
        left:   { style: BorderStyle.SINGLE, size: 20, color: hex },
        bottom: { style: BorderStyle.SINGLE, size: 6, color: hex },
        top:    { style: BorderStyle.SINGLE, size: 6, color: hex },
        right:  { style: BorderStyle.SINGLE, size: 4, color: hex },
      },
      indent: { left: 200 },
    }),
    spacer(0, 160),
  ];
}

// ─── Shared document factory ──────────────────────────────────────────────────
function makeDocument(children: Array<Paragraph | Table>): Document {
  return new Document({
    styles: {
      default: {
        document: {
          run: { font: FONT, size: 22, color: C.bodyText },
          paragraph: { spacing: { after: 120, line: 288 } },
        },
        heading1: {
          run: { font: FONT, size: 34, bold: true, color: C.heading1 },
          paragraph: { spacing: { before: 480, after: 160 } },
        },
        heading2: {
          run: { font: FONT, size: 28, bold: true, color: C.heading2 },
          paragraph: { spacing: { before: 360, after: 120 } },
        },
        heading3: {
          run: { font: FONT, size: 24, bold: true, color: C.heading3 },
          paragraph: { spacing: { before: 280, after: 80 } },
        },
      },
    },
    numbering: {
      config: [
        {
          reference: 'ordered-list',
          levels: [
            {
              level: 0,
              format: NumberFormat.DECIMAL,
              text: '%1.',
              alignment: AlignmentType.START,
              style: {
                paragraph: { indent: { left: 440, hanging: 320 } },
                run: { font: FONT, size: 22 },
              },
            },
          ],
        },
      ],
    },
    sections: [
      {
        properties: {
          page: { margin: { top: MARGIN, bottom: MARGIN, left: MARGIN, right: MARGIN } },
        },
        children,
      },
    ],
  });
}

// ─── Public export: single-document analysis ─────────────────────────────────
export async function exportToDocx(
  document: UploadedDocument,
  analyses: Array<Analysis & { agent: Agent }>,
  synthesisResult?: string,
  lang: Language = 'nl'
): Promise<void> {
  const locale = lang === 'en' ? 'en-GB' : 'nl-NL';
  const dateStr = new Date().toLocaleDateString(locale, { dateStyle: 'long' });
  const children: Array<Paragraph | Table> = [];

  children.push(
    new Paragraph({
      children: [new TextRun({ text: t(lang, 'exportTitle'), bold: true, size: 44, color: C.heading2, font: FONT })],
      heading: HeadingLevel.TITLE,
      alignment: AlignmentType.LEFT,
      spacing: { after: 100 },
      border: { bottom: { style: BorderStyle.SINGLE, size: 8, color: C.tableBorderOuter } },
    }),
    spacer(0, 80),
    new Paragraph({
      children: [new TextRun({ text: document.name, size: 26, color: C.muted, font: FONT })],
      spacing: { after: 280 },
    })
  );

  children.push(
    metaTable([
      [t(lang, 'exportGenerated'), dateStr],
      [lang === 'en' ? 'Document' : 'Document', document.name],
      [
        lang === 'en' ? 'Agents' : 'Agents',
        analyses.filter((a) => a.status === 'completed').map((a) => a.agent.name).join(', '),
      ],
    ])
  );
  children.push(spacer(240, 0));

  for (const analysis of analyses) {
    if (analysis.status !== 'completed') continue;
    const color = analysis.agent.color ?? '#2563EB';
    children.push(...agentDivider(color, analysis.agent.name, analysis.agent.role));
    children.push(...blocksToDocx(parseMarkdown(analysis.result), { agentColor: color.replace('#', '') }));
  }

  if (synthesisResult) {
    children.push(
      spacer(560, 0),
      new Paragraph({
        children: [
          new TextRun({ text: t(lang, 'exportSynthesis'), bold: true, size: 30, color: C.synthesisAccent, font: FONT }),
        ],
        shading: { fill: C.synthesisBg, type: ShadingType.SOLID, color: 'auto' },
        spacing: { before: 0, after: 0 },
        border: {
          left:   { style: BorderStyle.SINGLE, size: 20, color: C.synthesisAccent },
          bottom: { style: BorderStyle.SINGLE, size: 6, color: C.synthesisAccent },
          top:    { style: BorderStyle.SINGLE, size: 6, color: C.synthesisAccent },
          right:  { style: BorderStyle.SINGLE, size: 4, color: C.synthesisAccent },
        },
        indent: { left: 200 },
      }),
      spacer(0, 160)
    );
    children.push(...blocksToDocx(parseMarkdown(synthesisResult)));
  }

  const doc = makeDocument(children);
  const blob = await Packer.toBlob(doc);
  downloadBlob(blob, `analyse-${document.name.replace(/\.[^.]+$/, '')}.docx`);
}

// ─── Public export: systematic review ────────────────────────────────────────
export async function exportReviewToDocx(
  reviewText: string,
  documentCount: number,
  lang: Language = 'nl'
): Promise<void> {
  const locale = lang === 'en' ? 'en-GB' : 'nl-NL';
  const dateStr = new Date().toLocaleDateString(locale, { dateStyle: 'long' });
  const children: Array<Paragraph | Table> = [];

  const title = lang === 'en' ? 'Systematic Review' : 'Systematische Review';
  const countLabel =
    lang === 'en'
      ? `Integrated review of ${documentCount} article${documentCount !== 1 ? 's' : ''}`
      : `Ge\u00EFntegreerde review van ${documentCount} artikel${documentCount !== 1 ? 'en' : ''}`;

  children.push(
    new Paragraph({
      children: [new TextRun({ text: title, bold: true, size: 44, color: C.heading2, font: FONT })],
      heading: HeadingLevel.TITLE,
      alignment: AlignmentType.LEFT,
      spacing: { after: 80 },
    }),
    new Paragraph({
      children: [new TextRun({ text: countLabel, size: 24, color: C.muted, font: FONT })],
      spacing: { after: 240 },
    })
  );

  children.push(
    metaTable([
      [t(lang, 'exportGenerated'), dateStr],
      [lang === 'en' ? 'Articles included' : 'Artikelen', String(documentCount)],
    ])
  );
  children.push(spacer(320, 0));

  children.push(...blocksToDocx(parseMarkdown(reviewText), { agentColor: '2563EB' }));

  const doc = makeDocument(children);
  const blob = await Packer.toBlob(doc);
  downloadBlob(blob, `systematic-review-${new Date().toISOString().slice(0, 10)}.docx`);
}

// ─── PPTX export ─────────────────────────────────────────────────────────────
export async function exportToPptx(
  document: UploadedDocument,
  analyses: Array<Analysis & { agent: Agent }>,
  synthesisResult?: string,
  lang: Language = 'nl'
): Promise<void> {
  const PptxGenJS = (await import('pptxgenjs')).default;
  const pptx = new PptxGenJS();

  pptx.layout = 'LAYOUT_WIDE';
  pptx.title = `Analyse: ${document.name}`;

  const COLORS = {
    bg: '0f172a',
    slide: '1e293b',
    accent: '3b82f6',
    text: 'f1f5f9',
    subtext: '94a3b8',
    white: 'ffffff',
    tableHeader: 'DBEAFE',
    tableRow: 'EFF6FF',
    tableAlt: 'FFFFFF',
    tableText: 'e2e8f0',
    tableBorder: '475569',
  };

  const locale = lang === 'en' ? 'en-GB' : 'nl-NL';

  const titleSlide = pptx.addSlide();
  titleSlide.background = { color: COLORS.bg };
  titleSlide.addText(t(lang, 'posterTitle'), {
    x: 0.5, y: 2, w: '90%', h: 1.2,
    fontSize: 40, bold: true, color: COLORS.white, align: 'center',
  });
  titleSlide.addText(document.name, {
    x: 0.5, y: 3.4, w: '90%', h: 0.6,
    fontSize: 20, color: COLORS.accent, align: 'center',
  });
  titleSlide.addText(new Date().toLocaleDateString(locale, { dateStyle: 'long' }), {
    x: 0.5, y: 4.2, w: '90%', h: 0.4,
    fontSize: 14, color: COLORS.subtext, align: 'center',
  });

  for (const analysis of analyses) {
    if (analysis.status !== 'completed') continue;

    const agentHex = analysis.agent.color.replace('#', '');
    const blocks = parseMarkdown(analysis.result);
    const textBlocks = blocks.filter((b) => b.type !== 'table');
    const tableBlocks = blocks.filter((b) => b.type === 'table');

    if (textBlocks.length > 0) {
      const slide = pptx.addSlide();
      slide.background = { color: COLORS.slide };
      slide.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: '100%', h: 1.0, fill: { color: agentHex } });
      slide.addText(analysis.agent.name, { x: 0.4, y: 0.08, w: '85%', h: 0.52, fontSize: 24, bold: true, color: COLORS.white });
      slide.addText(analysis.agent.role, { x: 0.4, y: 0.6, w: '85%', h: 0.32, fontSize: 13, color: COLORS.white + 'cc' });
      slide.addText(buildPptxTextArray(textBlocks, COLORS), {
        x: 0.4, y: 1.15, w: '92%', h: 4.8,
        fontSize: 12, color: COLORS.text, valign: 'top', wrap: true,
      });
    }

    for (const tBlock of tableBlocks) {
      if (tBlock.type !== 'table') continue;
      const slide = pptx.addSlide();
      slide.background = { color: COLORS.slide };
      slide.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: '100%', h: 0.55, fill: { color: agentHex } });
      slide.addText(`${analysis.agent.name} \u2014 tabel`, { x: 0.4, y: 0.08, w: '85%', h: 0.4, fontSize: 16, bold: true, color: COLORS.white });
      slide.addTable(buildPptxTable(tBlock.headers, tBlock.rows, COLORS), {
        x: 0.4, y: 0.7, w: 12.4,
        border: { pt: 0.5, color: COLORS.tableBorder },
        fontSize: 11,
      });
    }
  }

  if (synthesisResult) {
    const synBlocks = parseMarkdown(synthesisResult);
    const synTextBlocks = synBlocks.filter((b) => b.type !== 'table');
    const synTableBlocks = synBlocks.filter((b) => b.type === 'table');

    if (synTextBlocks.length > 0) {
      const slide = pptx.addSlide();
      slide.background = { color: COLORS.bg };
      slide.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: '100%', h: 1.0, fill: { color: 'ef4444' } });
      slide.addText(t(lang, 'exportSynthesis'), { x: 0.4, y: 0.08, w: '85%', h: 0.84, fontSize: 24, bold: true, color: COLORS.white, valign: 'middle' });
      slide.addText(buildPptxTextArray(synTextBlocks, COLORS), {
        x: 0.4, y: 1.15, w: '92%', h: 4.8,
        fontSize: 12, color: COLORS.text, valign: 'top', wrap: true,
      });
    }

    for (const tBlock of synTableBlocks) {
      if (tBlock.type !== 'table') continue;
      const slide = pptx.addSlide();
      slide.background = { color: COLORS.bg };
      slide.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: '100%', h: 0.55, fill: { color: 'ef4444' } });
      slide.addText(`${t(lang, 'exportSynthesis')} \u2014 tabel`, { x: 0.4, y: 0.08, w: '85%', h: 0.4, fontSize: 16, bold: true, color: COLORS.white });
      slide.addTable(buildPptxTable(tBlock.headers, tBlock.rows, COLORS), {
        x: 0.4, y: 0.7, w: 12.4,
        border: { pt: 0.5, color: COLORS.tableBorder },
        fontSize: 11,
      });
    }
  }

  await pptx.writeFile({ fileName: `analyse-${document.name.replace(/\.[^.]+$/, '')}.pptx` });
}

function buildPptxTextArray(blocks: MdBlock[], COLORS: Record<string, string>): object[] {
  const arr: object[] = [];
  for (const block of blocks) {
    if (block.type === 'heading') {
      const fontSize = block.level === 1 ? 18 : block.level === 2 ? 15 : 13;
      arr.push({ text: block.text + '\n', options: { bold: true, fontSize, color: COLORS.white, breakLine: false } });
    } else if (block.type === 'paragraph') {
      for (const r of block.runs) arr.push({ text: r.text, options: { bold: r.bold, color: COLORS.text } });
      arr.push({ text: '\n', options: { bold: false, color: COLORS.text } });
    } else if (block.type === 'bullet') {
      const prefix = block.ordered ? `${block.index ?? '\u2022'}.  ` : '\u2022  ';
      arr.push({ text: prefix, options: { bold: false, color: COLORS.subtext } });
      for (const r of block.runs) arr.push({ text: r.text, options: { bold: r.bold, color: COLORS.text } });
      arr.push({ text: '\n', options: { bold: false, color: COLORS.text } });
    } else if (block.type === 'code') {
      arr.push({ text: block.text + '\n', options: { bold: false, color: COLORS.subtext, fontFace: 'Courier New', fontSize: 10 } });
    } else if (block.type === 'rule') {
      arr.push({ text: '\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\n', options: { bold: false, color: COLORS.tableBorder } });
    }
  }
  return arr;
}

function buildPptxTable(headers: string[], rows: string[][], COLORS: Record<string, string>): object[][] {
  const colCount = Math.max(headers.length, ...rows.map((r) => r.length), 1);
  const headerRow = Array.from({ length: colCount }, (_, i) => ({
    text: headers[i] ?? '',
    options: { bold: true, fontSize: 11, color: COLORS.white, fill: { color: COLORS.tableHeader }, align: 'left' },
  }));
  const dataRows = rows.map((cols, ri) =>
    Array.from({ length: colCount }, (_, ci) => ({
      text: cols[ci] ?? '',
      options: { bold: false, fontSize: 10, color: COLORS.tableText, fill: { color: ri % 2 === 0 ? COLORS.tableRow : COLORS.tableAlt }, align: 'left' },
    }))
  );
  return [headerRow, ...dataRows];
}

// ─── Poster export ────────────────────────────────────────────────────────────
export async function exportToPoster(
  document: UploadedDocument,
  analyses: Array<Analysis & { agent: Agent }>,
  synthesisResult?: string,
  lang: Language = 'nl'
): Promise<void> {
  const W = 4370;
  const H = 3091;
  const canvas = window.document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d')!;

  const hex = (h: string) => h.startsWith('#') ? h : `#${h}`;

  function fillRect(x: number, y: number, w: number, h: number, color: string) {
    ctx.fillStyle = hex(color);
    ctx.fillRect(x, y, w, h);
  }

  function drawText(str: string, x: number, y: number, opts: { size?: number; color?: string; bold?: boolean; align?: CanvasTextAlign; maxWidth?: number }) {
    const { size = 28, color = '#f1f5f9', bold = false, align = 'left', maxWidth } = opts;
    ctx.font = `${bold ? '700' : '400'} ${size}px Inter, system-ui, sans-serif`;
    ctx.fillStyle = hex(color);
    ctx.textAlign = align;
    if (maxWidth) ctx.fillText(str, x, y, maxWidth);
    else ctx.fillText(str, x, y);
  }

  function wrapText(str: string, x: number, y: number, maxWidth: number, lineHeight: number, opts: { size?: number; color?: string; bold?: boolean }) {
    const { size = 26, color = '#94a3b8', bold = false } = opts;
    ctx.font = `${bold ? '700' : '400'} ${size}px Inter, system-ui, sans-serif`;
    ctx.fillStyle = hex(color);
    ctx.textAlign = 'left';
    const words = str.replace(/\*\*(.+?)\*\*/g, '$1').replace(/#+\s?/g, '').split(' ');
    let line = '';
    let cy = y;
    for (const word of words) {
      const test = line ? `${line} ${word}` : word;
      if (ctx.measureText(test).width > maxWidth && line) {
        ctx.fillText(line, x, cy);
        line = word;
        cy += lineHeight;
      } else {
        line = test;
      }
    }
    if (line) ctx.fillText(line, x, cy);
    return cy + lineHeight;
  }

  fillRect(0, 0, W, H, '0f172a');
  fillRect(0, 0, 18, H, 'b45309');
  fillRect(18, 0, W - 18, 220, '1e293b');
  fillRect(18, 0, W - 18, 6, 'f59e0b');

  const locale = lang === 'en' ? 'en-GB' : 'nl-NL';
  drawText(t(lang, 'posterTitle'), W / 2 + 9, 80, { size: 64, bold: true, color: 'f1f5f9', align: 'center' });
  const shortName = document.name.length > 90 ? document.name.slice(0, 87) + '\u2026' : document.name;
  drawText(shortName, W / 2 + 9, 148, { size: 36, color: 'f59e0b', align: 'center' });
  drawText(new Date().toLocaleDateString(locale, { dateStyle: 'long' }), W / 2 + 9, 196, { size: 26, color: '64748b', align: 'center' });

  const TOP = 240;
  const PAD = 42;
  const COL_GAP = 30;
  const completedAnalyses = analyses.filter((a) => a.status === 'completed');
  const nCols = Math.min(completedAnalyses.length, 3);
  const colW = nCols > 0 ? Math.floor((W - 18 - PAD * 2 - COL_GAP * (nCols - 1)) / nCols) : W - 18 - PAD * 2;

  completedAnalyses.slice(0, 3).forEach((analysis, ci) => {
    const cx = 18 + PAD + ci * (colW + COL_GAP);
    const agentColor = analysis.agent.color.replace('#', '');
    fillRect(cx, TOP, colW, 70, agentColor + '33');
    fillRect(cx, TOP, 8, 70, agentColor);
    drawText(analysis.agent.name, cx + 20, TOP + 28, { size: 30, bold: true, color: 'f1f5f9' });
    drawText(analysis.agent.role, cx + 20, TOP + 58, { size: 22, color: 'a' + agentColor.slice(1) });
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(cx, TOP + 78);
    ctx.lineTo(cx + colW, TOP + 78);
    ctx.stroke();

    const bodyY = TOP + 96;
    const maxBodyH = synthesisResult ? H - bodyY - 480 : H - bodyY - 60;
    const maxLines = Math.floor(maxBodyH / 36);
    const stripped = analysis.result.replace(/\*\*(.+?)\*\*/g, '$1').replace(/#+\s?/g, '').replace(/\|.+/g, '').trim();
    const lines = stripped.split('\n').filter((l) => l.trim()).slice(0, maxLines);
    let ly = bodyY;
    for (const line of lines) {
      ly = wrapText(line, cx, ly, colW - 10, 36, { size: 25, color: 'cbd5e1' });
      if (ly > bodyY + maxBodyH) break;
    }
  });

  if (synthesisResult) {
    const synY = H - 430;
    fillRect(18, synY, W - 18, 6, 'f59e0b');
    fillRect(18, synY + 6, W - 18, 424, '1e293b');
    drawText(t(lang, 'posterSubtitle'), 18 + PAD, synY + 54, { size: 30, bold: true, color: 'f59e0b' });
    const synStripped = synthesisResult
      .replace(/\|.+\|/g, '').replace(/\*\*(.+?)\*\*/g, '$1').replace(/#+\s?/g, '')
      .replace(/^[-=]{3,}\s*$/gm, '').replace(/\n{3,}/g, '\n\n').trim();
    const synLines = synStripped.split('\n').filter((l) => l.trim()).slice(0, 10);
    const synColW = Math.floor((W - 18 - PAD * 2 - COL_GAP * 2) / 3);
    let col = 0;
    let sy = synY + 86;
    let colStartY = sy;
    const colXs = [18 + PAD, 18 + PAD + synColW + COL_GAP, 18 + PAD + 2 * (synColW + COL_GAP)];
    const maxSynH = 300;
    for (const line of synLines) {
      const nextY = wrapText(line, colXs[col], sy, synColW, 34, { size: 24, color: 'cbd5e1' });
      if (nextY - colStartY > maxSynH && col < 2) {
        col++;
        colStartY = synY + 86;
        sy = colStartY;
        wrapText(line, colXs[col], sy, synColW, 34, { size: 24, color: 'cbd5e1' });
        sy = synY + 86 + 34;
      } else {
        sy = nextY;
      }
    }
  }

  fillRect(18, H - 46, W - 18, 46, '0f172a');
  drawText(t(lang, 'posterFooter'), W / 2 + 9, H - 16, { size: 22, color: '1e293b', align: 'center' });

  canvas.toBlob((blob) => {
    if (blob) downloadBlob(blob, `poster-${document.name.replace(/\.[^.]+$/, '')}.png`);
  }, 'image/png');
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = window.document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
