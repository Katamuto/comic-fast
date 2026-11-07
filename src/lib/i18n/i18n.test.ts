import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { detectLanguage, interpolate, pickDocument, slug, sortLanguages, translate, TKError } from './core';
import { inline, parseDoc } from './markdown';

const SRC = join(__dirname, '..', '..');
const dict = (code: string): Record<string, string> => JSON.parse(readFileSync(join(SRC, 'locales', `${code}.json`), 'utf8'));
const codes = readdirSync(join(SRC, 'locales'))
  .filter((f) => f.endsWith('.json'))
  .map((f) => f.replace('.json', ''));
const holders = (s: string) => (s.match(/\{\w+\}/g) ?? []).sort().join(',');

describe('núcleo de traducción', () => {
  const d = { es: { a: 'hola {n}', solo: 'solo es' }, en: { a: 'hello {n}' } };
  it('interpola parámetros y deja los desconocidos', () => {
    expect(interpolate('x {n} {z}', { n: 2 })).toBe('x 2 {z}');
  });
  it('cadena de reserva: idioma → inglés → español → texto → clave', () => {
    expect(translate(d, 'en', 'a', { n: 1 })).toBe('hello 1');
    expect(translate(d, 'ja', 'a', { n: 1 })).toBe('hello 1');
    expect(translate(d, 'en', 'solo')).toBe('solo es');
    expect(translate(d, 'en', 'nada', undefined, 'reserva')).toBe('reserva');
    expect(translate(d, 'en', 'nada')).toBe('nada');
  });
  it('detecta el idioma del sistema', () => {
    const have = ['es', 'en', 'ja', 'zh', 'pt'];
    expect(detectLanguage(['ja-JP'], have)).toBe('ja');
    expect(detectLanguage(['xx', 'pt-BR'], have)).toBe('pt');
    expect(detectLanguage(['zh-TW'], have)).toBe('zh');
    expect(detectLanguage(['zh-TW'], [...have, 'zh-TW'])).toBe('zh-TW');
    expect(detectLanguage(['de-DE'], have)).toBe('en');
    expect(detectLanguage([], have)).toBe('en');
  });
  it('ordena: español, inglés, japonés, coreano, francés, chino, portugués y luego el resto', () => {
    expect(sortLanguages(['pt', 'de', 'fr', 'ja', 'en', 'es', 'zh', 'ko', 'ar'])).toEqual(['es', 'en', 'ja', 'ko', 'fr', 'zh', 'pt', 'ar', 'de']);
  });
  it('pickDocument usa región, base, inglés y español', () => {
    expect(pickDocument({ en: 'E', es: 'S', 'pt-BR': 'B' }, 'pt-BR')).toBe('B');
    expect(pickDocument({ en: 'E', es: 'S', pt: 'P' }, 'pt-BR')).toBe('P');
    expect(pickDocument({ en: 'E', es: 'S' }, 'ja')).toBe('E');
    expect(pickDocument({ es: 'S' }, 'ja')).toBe('S');
  });
  it('slug y TKError', () => {
    expect(slug('Plantillas de página')).toBe('plantillas_de_pagina');
    expect(slug('Viñeta suelta')).toBe('vineta_suelta');
    const e = new TKError('err.x', 'msg', { n: 1 });
    expect(e.key).toBe('err.x');
    expect(e.message).toBe('msg');
  });
});

describe('mini-Markdown', () => {
  it('escapa el HTML', () => {
    expect(inline('<script>x</script>')).not.toContain('<script>');
    expect(inline('**a** *b* `c`')).toBe('<b>a</b> <i>b</i> <code>c</code>');
  });
  it('solo admite enlaces https', () => {
    expect(inline('[x](javascript:alert(1))')).not.toContain('href');
    expect(inline('[x](https://a.b)')).toContain('href="https://a.b"');
  });
  it('separa título y secciones, y arma listas', () => {
    const d = parseDoc('# T\n\n## A\n- uno\n- dos\n\n## B\n1. x\n\ntexto');
    expect(d.title).toBe('T');
    expect(d.sections.map((s) => s.title)).toEqual(['A', 'B']);
    expect(d.sections[0].html).toContain('<ul>');
    expect(d.sections[1].html).toContain('<ol>');
    expect(d.sections[1].html).toContain('<p>texto</p>');
  });
});

describe('archivos de idioma', () => {
  it('están los siete idiomas previstos', () => {
    for (const c of ['es', 'en', 'ja', 'ko', 'fr', 'zh', 'pt']) expect(codes).toContain(c);
  });
  it('todos tienen lang.name y las mismas claves que el español', () => {
    const es = dict('es');
    for (const c of codes) {
      const d = dict(c);
      expect(d['lang.name'], c).toBeTruthy();
      const missing = Object.keys(es).filter((k) => !(k in d));
      expect(missing, `${c} sin: ${missing.slice(0, 5)}`).toEqual([]);
      for (const k of Object.keys(es)) {
        expect(holders(d[k] ?? ''), `${c}:${k}`).toBe(holders(es[k]));
        expect(d[k].trim(), `${c}:${k}`).not.toBe('');
      }
    }
  });
  it('cada idioma tiene su guía con secciones y un EULA existe al menos en es y en', () => {
    for (const c of codes) {
      const md = readFileSync(join(SRC, 'locales', 'guide', `${c}.md`), 'utf8');
      expect(parseDoc(md).sections.length, c).toBeGreaterThan(5);
    }
    for (const c of ['es', 'en']) expect(parseDoc(readFileSync(join(SRC, 'assets', 'eula', `${c}.md`), 'utf8')).sections.length).toBeGreaterThan(1);
  });
  it('todas las claves usadas en el código existen en es.json', () => {
    const es = dict('es');
    const found = new Set<string>();
    const walk = (dir: string) => {
      for (const e of readdirSync(dir, { withFileTypes: true })) {
        const p = join(dir, e.name);
        if (e.isDirectory()) walk(p);
        else if (/\.(ts|svelte)$/.test(e.name) && !e.name.endsWith('.test.ts')) {
          const s = readFileSync(p, 'utf8');
          for (const m of s.matchAll(/\bt\(\s*'([\w.-]+)'/g)) found.add(m[1]);
          for (const m of s.matchAll(/TKError\(\s*'([\w.-]+)'/g)) found.add(m[1]);
        }
      }
    };
    walk(SRC);
    const missing = [...found].filter((k) => !(k in es));
    expect(missing).toEqual([]);
  });
  it('ningún componente usa «t» (la función de traducción) como si fuera otra cosa', () => {
    // Pasó una vez: un bucle {#each TOOLS as t} chocaba con t() y los iconos de la barra desaparecieron.
    const bad: string[] = [];
    const walk = (dir: string) => {
      for (const e of readdirSync(dir, { withFileTypes: true })) {
        const p = join(dir, e.name);
        if (e.isDirectory()) walk(p);
        else if (e.name.endsWith('.svelte')) {
          const s = readFileSync(p, 'utf8');
          if (!/import\s*\{[^}]*\bt\b[^}]*\}\s*from\s*'[^']*i18n/.test(s)) continue;
          if (/\bt\[|\bt\.(?!length)\w|\bas t\b|\(t\)\s*=>|\bconst t\b|\blet t\b/.test(s)) bad.push(e.name);
        }
      }
    };
    walk(join(SRC, 'lib'));
    expect(bad).toEqual([]);
  });
});
