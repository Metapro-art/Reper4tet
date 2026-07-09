import type { ReactNode } from 'react';

/**
 * Parser Markdown mínimo para el manual bundleado (src/content/ayuda.md).
 * Subconjunto soportado: encabezados (#..####), listas con viñeta (-),
 * listas numeradas (1.), párrafos y **negrita** en línea. Las líneas
 * indentadas bajo un ítem de lista se anexan a ese ítem (continuación).
 *
 * Devuelve nodos React (no usa dangerouslySetInnerHTML): el contenido se
 * renderiza como elementos, sin riesgo de inyección de HTML.
 */

function renderInline(text: string): ReactNode[] {
  // divide en segmentos **negrita**; los índices impares son negrita
  return text
    .split(/\*\*(.+?)\*\*/g)
    .map((part, i) =>
      i % 2 === 1 ? <strong key={i}>{part}</strong> : <span key={i}>{part}</span>,
    );
}

const HEADING = /^(#{1,4})\s+(.*)$/;
const UL_ITEM = /^-\s+(.*)$/;
const OL_ITEM = /^\d+\.\s+(.*)$/;
const INDENTED = /^\s+\S/;

function collectList(
  lines: string[],
  start: number,
  itemRe: RegExp,
): { items: string[]; next: number } {
  const items: string[] = [];
  let i = start;
  while (i < lines.length) {
    const m = itemRe.exec(lines[i]);
    if (m) {
      items.push(m[1].trim());
      i++;
    } else if (INDENTED.test(lines[i]) && items.length > 0) {
      items[items.length - 1] += ' ' + lines[i].trim();
      i++;
    } else {
      break;
    }
  }
  return { items, next: i };
}

export function renderMarkdown(md: string): ReactNode[] {
  const lines = md.replace(/\r\n/g, '\n').split('\n');
  const blocks: ReactNode[] = [];
  let i = 0;
  let key = 0;

  while (i < lines.length) {
    const line = lines[i];

    if (line.trim() === '') {
      i++;
      continue;
    }

    const h = HEADING.exec(line);
    if (h) {
      const content = renderInline(h[2].trim());
      const k = `b${key++}`;
      const level = h[1].length;
      if (level === 1) blocks.push(<h1 key={k}>{content}</h1>);
      else if (level === 2) blocks.push(<h2 key={k}>{content}</h2>);
      else if (level === 3) blocks.push(<h3 key={k}>{content}</h3>);
      else blocks.push(<h4 key={k}>{content}</h4>);
      i++;
      continue;
    }

    if (UL_ITEM.test(line)) {
      const { items, next } = collectList(lines, i, UL_ITEM);
      blocks.push(
        <ul key={`b${key++}`}>
          {items.map((it, n) => (
            <li key={n}>{renderInline(it)}</li>
          ))}
        </ul>,
      );
      i = next;
      continue;
    }

    if (OL_ITEM.test(line)) {
      const { items, next } = collectList(lines, i, OL_ITEM);
      blocks.push(
        <ol key={`b${key++}`}>
          {items.map((it, n) => (
            <li key={n}>{renderInline(it)}</li>
          ))}
        </ol>,
      );
      i = next;
      continue;
    }

    // párrafo: agrupa líneas planas consecutivas
    const para: string[] = [];
    while (
      i < lines.length &&
      lines[i].trim() !== '' &&
      !HEADING.test(lines[i]) &&
      !UL_ITEM.test(lines[i]) &&
      !OL_ITEM.test(lines[i])
    ) {
      para.push(lines[i].trim());
      i++;
    }
    blocks.push(<p key={`b${key++}`}>{renderInline(para.join(' '))}</p>);
  }

  return blocks;
}
