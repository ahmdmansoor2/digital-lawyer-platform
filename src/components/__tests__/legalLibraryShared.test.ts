/**
 * Tests for legalLibraryShared — extracted helpers.
 */
import { describe, it, expect } from 'vitest';
import { mergeById, normalizeArabic, highlightSearchTerm } from '../legalLibraryShared';

describe('mergeById', () => {
  it('merges two arrays, overlaying on base by id', () => {
    const base = [{ id: 'a', v: 1 }, { id: 'b', v: 2 }];
    const overlay = [{ id: 'b', v: 99 }, { id: 'c', v: 3 }];
    const result = mergeById(base, overlay);
    expect(result).toHaveLength(3);
    const byId = new Map(result.map(r => [r.id, r.v]));
    expect(byId.get('a')).toBe(1);
    expect(byId.get('b')).toBe(99); // overlay wins
    expect(byId.get('c')).toBe(3);
  });

  it('returns base when overlay is empty', () => {
    const base = [{ id: 'a', v: 1 }];
    expect(mergeById(base, [])).toEqual(base);
  });

  it('returns overlay when base is empty', () => {
    const overlay = [{ id: 'a', v: 1 }];
    expect(mergeById([], overlay)).toEqual(overlay);
  });
});

describe('normalizeArabic', () => {
  it('strips diacritics', () => {
    expect(normalizeArabic('مَرْحَبًا')).toBe('مرحبا');
  });

  it('lowercases', () => {
    expect(normalizeArabic('Hello')).toBe('hello');
  });

  it('trims whitespace', () => {
    expect(normalizeArabic('  hello  ')).toBe('hello');
  });

  it('collapses internal whitespace', () => {
    expect(normalizeArabic('hello   world')).toBe('hello world');
  });
});

describe('highlightSearchTerm', () => {
  it('wraps matched term in <mark>', () => {
    const result = highlightSearchTerm('hello world', 'world');
    expect(result).toContain('<mark');
    expect(result).toContain('world');
    expect(result).toContain('</mark>');
  });

  it('returns original text when term not found', () => {
    const text = 'hello world';
    expect(highlightSearchTerm(text, 'foo')).toBe(text);
  });

  it('highlights multiple occurrences', () => {
    const result = highlightSearchTerm('foo bar foo', 'foo');
    const matches = result.match(/<mark/g) || [];
    expect(matches.length).toBe(2);
  });

  it('returns text when term is empty', () => {
    const text = 'hello world';
    expect(highlightSearchTerm(text, '')).toBe(text);
  });

  it('handles Arabic text with diacritics', () => {
    const result = highlightSearchTerm('هذا نص تجريبي', 'نص');
    expect(result).toContain('<mark');
  });
});
