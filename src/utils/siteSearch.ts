/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * siteSearch — مكتبة البحث الموحدة في محتوى الموقع.
 * يستخدمها HeroSearchBar و SiteSearchModal معاً:
 * تطبيع عربي، ترتيب ذكي، إبراز المطابقات، أنواع المحتوى.
 */

export type IndexType = 'blog' | 'pillar' | 'page' | 'radar' | 'form' | 'court';

export interface IndexItem {
  id: string;
  title: string;
  description: string;
  url: string;
  type: IndexType;
  category: string;
  keywords: string;
  image: string;
  snippet: string;
  wordCount: number;
}

export interface SearchIndex {
  generatedAt: string;
  baseUrl: string;
  count: number;
  totalWords: number;
  items: IndexItem[];
}

export interface RankedResult {
  item: IndexItem;
  score: number;
}

/** تطبيع النص العربي واللاتيني للمقارنة */
export function normalize(s: string): string {
  return (s || '')
    .toLowerCase()
    .replace(/[\u064B-\u0652\u0670\u0640]/g, '')
    .replace(/[إأآٱا]/g, 'ا')
    .replace(/[ىي]/g, 'ي')
    .replace(/ة/g, 'ه')
    .replace(/[^\u0600-\u06FFa-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function escapeHtml(s: string): string {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** إبراز الكلمات المطابقة بوسم <mark> */
export function highlight(text: string, q: string): string {
  if (!text) return '';
  if (!q || !q.trim()) return escapeHtml(text);
  const tokens = q.trim().split(/\s+/).filter(Boolean);
  let out = escapeHtml(text);
  for (const t of tokens) {
    if (t.length < 2) continue;
    try {
      out = out.replace(new RegExp('(' + escapeRegex(t) + ')', 'gi'), '<mark>$1</mark>');
    } catch {
      /* تجاهل الرموز غير الصالحة */
    }
  }
  return out;
}

/** ترتيب عنصر واحد مقابل الاستعلام */
export function scoreItem(item: IndexItem, q: string): number {
  const qn = normalize(q);
  if (!qn) return 0;
  const title = normalize(item.title);
  const desc = normalize(item.description || '');
  const cat = normalize(item.category || '');
  const kw = normalize(item.keywords || '');
  const snip = normalize(item.snippet || '');
  const tokens = qn.split(/\s+/).filter(Boolean);
  if (!tokens.length) return 0;

  let s = 0;
  for (const t of tokens) {
    if (title.includes(t)) s += 20;
    if (desc.includes(t)) s += 8;
    if (cat.includes(t)) s += 5;
    if (kw.includes(t)) s += 4;
    if (snip.includes(t)) s += 2;
    if (title === qn) s += 30;
    // مطابقة كلمة كاملة في العنوان
    if (new RegExp('\\b' + escapeRegex(t) + '\\b', 'i').test(item.title)) s += 5;
  }
  return s;
}

/** البحث الكامل وإرجاع أفضل النتائج مرتبة */
export function search(index: SearchIndex | null, q: string, limit = 12): RankedResult[] {
  if (!index || !q.trim()) return [];
  const results: RankedResult[] = [];
  for (const item of index.items) {
    const s = scoreItem(item, q);
    if (s > 0) results.push({ item, score: s });
  }
  results.sort((a, b) => b.score - a.score);
  return results.slice(0, limit);
}

/** تحميل فهرس الموقع (مرة واحدة، مع تخزين مؤقت خارجي اختياري) */
export async function loadSearchIndex(): Promise<SearchIndex> {
  const r = await fetch('/search-index.json');
  if (!r.ok) throw new Error('HTTP ' + r.status);
  return r.json() as Promise<SearchIndex>;
}
