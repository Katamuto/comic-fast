/**
 * Escritor de PDF mínimo: una imagen JPEG por página, sin dependencias.
 * Estructura: 1 Catalog, 2 Pages, 3 Info, y por cada página i (0-based)
 * los objetos 4+3i (Page), 5+3i (Contents) y 6+3i (Image XObject).
 */
export interface PdfPage {
  /** Bytes de un JPEG (DeviceRGB, 8 bits). */
  jpeg: Uint8Array;
  pxW: number;
  pxH: number;
  /** Tamaño de página en puntos (1/72 in). */
  ptW: number;
  ptH: number;
}

const num = (n: number) => (Math.round(n * 100) / 100).toString();

/** Cadena de texto PDF en UTF-16BE (admite acentos y ñ). */
function pdfText(s: string): string {
  let hex = 'FEFF';
  for (let i = 0; i < s.length; i++) hex += s.charCodeAt(i).toString(16).padStart(4, '0').toUpperCase();
  return `<${hex}>`;
}

export function buildPdf(pages: PdfPage[], title = 'Comic Fast'): Uint8Array {
  const enc = new TextEncoder();
  const chunks: Uint8Array[] = [];
  const offsets: number[] = [];
  let pos = 0;

  const write = (d: string | Uint8Array) => {
    const b = typeof d === 'string' ? enc.encode(d) : d;
    chunks.push(b);
    pos += b.length;
  };
  const begin = (n: number) => {
    offsets[n] = pos;
    write(`${n} 0 obj\n`);
  };
  const end = () => write('endobj\n');

  write(new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x34, 0x0a, 0x25, 0xe2, 0xe3, 0xcf, 0xd3, 0x0a]));

  const n = pages.length;
  const kids = pages.map((_, i) => `${4 + 3 * i} 0 R`).join(' ');

  begin(1);
  write('<< /Type /Catalog /Pages 2 0 R >>\n');
  end();
  begin(2);
  write(`<< /Type /Pages /Kids [${kids}] /Count ${n} >>\n`);
  end();
  begin(3);
  write(`<< /Title ${pdfText(title)} /Producer ${pdfText('Comic Fast')} >>\n`);
  end();

  pages.forEach((p, i) => {
    const pageObj = 4 + 3 * i;
    const contentObj = pageObj + 1;
    const imageObj = pageObj + 2;

    begin(pageObj);
    write(
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${num(p.ptW)} ${num(p.ptH)}] ` +
        `/Resources << /XObject << /Im0 ${imageObj} 0 R >> >> /Contents ${contentObj} 0 R >>\n`
    );
    end();

    const content = `q ${num(p.ptW)} 0 0 ${num(p.ptH)} 0 0 cm /Im0 Do Q\n`;
    begin(contentObj);
    write(`<< /Length ${content.length} >>\nstream\n${content}endstream\n`);
    end();

    begin(imageObj);
    write(
      `<< /Type /XObject /Subtype /Image /Width ${p.pxW} /Height ${p.pxH} ` +
        `/ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${p.jpeg.length} >>\nstream\n`
    );
    write(p.jpeg);
    write('\nendstream\n');
    end();
  });

  const total = 3 + 3 * n;
  const xrefPos = pos;
  write(`xref\n0 ${total + 1}\n`);
  write('0000000000 65535 f \n');
  for (let i = 1; i <= total; i++) write(`${String(offsets[i]).padStart(10, '0')} 00000 n \n`);
  write(`trailer\n<< /Size ${total + 1} /Root 1 0 R /Info 3 0 R >>\nstartxref\n${xrefPos}\n%%EOF\n`);

  const out = new Uint8Array(pos);
  let o = 0;
  for (const c of chunks) {
    out.set(c, o);
    o += c.length;
  }
  return out;
}
