import { describe, expect, it } from 'vitest';
import { proxySize, pickUrl } from './proxy';

describe('proxy', () => {
  it('proxySize reduce solo lo grande', () => {
    expect(proxySize(1000, 800, 1400)).toBeNull();
    expect(proxySize(4000, 2000, 1400)).toEqual({ w: 1400, h: 700 });
    expect(proxySize(1000, 4000, 320)).toEqual({ w: 80, h: 320 });
  });
  it('pickUrl respalda al original', () => {
    const a = { url: 'u', viewUrl: 'v', thumbUrl: 't' };
    expect(pickUrl(a, 'full')).toBe('u');
    expect(pickUrl(a, 'view')).toBe('v');
    expect(pickUrl(a, 'thumb')).toBe('t');
    expect(pickUrl({ url: 'u' }, 'thumb')).toBe('u');
  });
});
