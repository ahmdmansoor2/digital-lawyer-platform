/**
 * Tests for sanitizer.ts — XSS protection
 */
import { describe, it, expect } from 'vitest';
import { sanitizeHtml, sanitizeHtmlRich, sanitizeText } from '../sanitizer';

describe('sanitizeHtml', () => {
  it('strips <script> tags', () => {
    const malicious = '<p>Safe</p><script>alert(1)</script>';
    const result = sanitizeHtml(malicious);
    expect(result).not.toContain('<script>');
    expect(result).toContain('<p>Safe</p>');
  });

  it('strips <script> with attributes', () => {
    const malicious = '<script src="evil.js"></script><p>OK</p>';
    expect(sanitizeHtml(malicious)).not.toContain('<script');
  });

  it('strips onerror handlers', () => {
    const malicious = '<img src="x" onerror="alert(1)">';
    expect(sanitizeHtml(malicious)).not.toContain('onerror');
  });

  it('strips onclick handlers', () => {
    const malicious = '<a href="#" onclick="steal()">click</a>';
    expect(sanitizeHtml(malicious)).not.toContain('onclick');
  });

  it('strips javascript: URLs', () => {
    const malicious = '<a href="javascript:alert(1)">click</a>';
    expect(sanitizeHtml(malicious)).not.toContain('javascript:');
  });

  it('strips data: URLs in <a>', () => {
    const malicious = '<a href="data:text/html,<script>alert(1)</script>">click</a>';
    expect(sanitizeHtml(malicious)).not.toContain('data:text/html');
  });

  it('strips <iframe>', () => {
    const malicious = '<iframe src="evil.com"></iframe>';
    expect(sanitizeHtml(malicious)).not.toContain('<iframe');
  });

  it('allows safe HTML (TipTap content)', () => {
    const safe = '<p>Hello <strong>world</strong></p>';
    expect(sanitizeHtml(safe)).toContain('<strong>world</strong>');
  });

  it('forces links to open in new tab with noopener', () => {
    const html = '<a href="https://example.com">link</a>';
    const result = sanitizeHtml(html);
    expect(result).toContain('target="_blank"');
    expect(result).toContain('rel="noopener noreferrer"');
  });

  it('handles nested attacks', () => {
    const malicious = '<div><script>alert(1)</script><p onclick="bad()">Hi</p></div>';
    const result = sanitizeHtml(malicious);
    expect(result).not.toContain('script');
    expect(result).not.toContain('onclick');
  });

  it('returns empty string for empty input', () => {
    expect(sanitizeHtml('')).toBe('');
  });

  it('preserves tables', () => {
    const html = '<table><tr><td>Cell</td></tr></table>';
    const result = sanitizeHtml(html);
    expect(result).toContain('<table>');
    expect(result).toContain('<td>');
  });
});

describe('sanitizeHtmlRich', () => {
  it('allows pre and code tags', () => {
    const html = '<pre><code>const x = 1;</code></pre>';
    const result = sanitizeHtmlRich(html);
    expect(result).toContain('<pre>');
    expect(result).toContain('<code>');
  });

  it('still strips scripts', () => {
    const html = '<pre>code</pre><script>alert(1)</script>';
    expect(sanitizeHtmlRich(html)).not.toContain('script');
  });
});

describe('sanitizeText', () => {
  it('removes all HTML, keeps text', () => {
    const html = '<p>Hello <strong>world</strong></p>';
    const result = sanitizeText(html);
    expect(result).toContain('Hello');
    expect(result).toContain('world');
    expect(result).not.toContain('<');
  });

  it('handles script tag as text only', () => {
    const html = '<script>alert(1)</script>after';
    const result = sanitizeText(html);
    expect(result).toContain('after');
  });
});
