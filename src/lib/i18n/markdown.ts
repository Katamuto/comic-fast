/**
 * Mini-Markdown para la guía y el EULA. Admite: # / ## / ### títulos, párrafos,
 * listas con «- » o «1. », **negrita**, *cursiva*, `código` y [texto](https://enlace).
 * Todo el texto se escapa: nunca se interpreta HTML escrito en los archivos.
 */
const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export function inline(text: string): string {
  return esc(text)
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>')
    .replace(/(^|[^*])\*([^*\s][^*]*)\*/g, '$1<i>$2</i>')
    .replace(/\[([^\]]+)\]\((https:\/\/[^)\s]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');
}

export interface DocSection {
  /** Texto del título (sin #). Vacío para lo que va antes del primer «## ». */
  title: string;
  html: string;
}

export interface ParsedDoc {
  title: string;
  sections: DocSection[];
}

function blocks(md: string): string {
  const out: string[] = [];
  let list: 'ul' | 'ol' | null = null;
  let para: string[] = [];
  const flushPara = () => {
    if (para.length) out.push(`<p>${inline(para.join(' '))}</p>`);
    para = [];
  };
  const closeList = () => {
    if (list) out.push(`</${list}>`);
    list = null;
  };
  for (const raw of md.split('\n')) {
    const line = raw.trimEnd();
    const h = /^(#{3,4})\s+(.*)$/.exec(line);
    const ul = /^\s*[-*]\s+(.*)$/.exec(line);
    const ol = /^\s*\d+[.)]\s+(.*)$/.exec(line);
    if (line.trim() === '') {
      flushPara();
      closeList();
    } else if (h) {
      flushPara();
      closeList();
      out.push(`<h4>${inline(h[2])}</h4>`);
    } else if (ul || ol) {
      flushPara();
      const kind = ul ? 'ul' : 'ol';
      if (list !== kind) {
        closeList();
        out.push(`<${kind}>`);
        list = kind;
      }
      out.push(`<li>${inline((ul ?? ol)![1])}</li>`);
    } else {
      closeList();
      para.push(line.trim());
    }
  }
  flushPara();
  closeList();
  return out.join('\n');
}

/** Convierte un texto en HTML (párrafos, listas, **negrita**…), todo escapado. Para mensajes cortos. */
export function renderMarkdown(md: string): string {
  return blocks(md.replace(/\r\n?/g, '\n'));
}

/** Divide un documento: «# Título» + secciones «## …». */
export function parseDoc(md: string): ParsedDoc {
  const lines = md.replace(/\r\n?/g, '\n').split('\n');
  let title = '';
  const sections: { title: string; body: string[] }[] = [{ title: '', body: [] }];
  for (const line of lines) {
    const t1 = /^#\s+(.*)$/.exec(line);
    const t2 = /^##\s+(.*)$/.exec(line);
    if (t1 && !title) title = t1[1].trim();
    else if (t2) sections.push({ title: t2[1].trim(), body: [] });
    else sections[sections.length - 1].body.push(line);
  }
  return {
    title,
    sections: sections.map((s) => ({ title: s.title, html: blocks(s.body.join('\n')) })).filter((s) => s.title || s.html)
  };
}
