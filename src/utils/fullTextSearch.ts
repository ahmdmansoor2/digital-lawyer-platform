import MiniSearch from 'minisearch';
import { LawArticle, CourtPrecedent, LegalBook } from '../types';

let lawSearch: MiniSearch<any> | null = null;
let precedentSearch: MiniSearch<any> | null = null;
let bookSearch: MiniSearch<any> | null = null;

export function buildLawIndex(laws: LawArticle[]) {
  lawSearch = new MiniSearch({
    fields: ['lawName', 'articleNumber', 'content', 'chapterName', 'tags'],
    storeFields: ['id', 'lawName', 'articleNumber', 'content', 'chapterName', 'tags'],
    searchOptions: {
      boost: { lawName: 3, articleNumber: 2, content: 1, chapterName: 1.5, tags: 2.5 },
      fuzzy: 0.2,
      prefix: true,
    },
  });
  lawSearch.addAll(laws.map(l => ({ ...l, tags: (l.tags || []).join(' ') })));
}

export function buildPrecedentIndex(precedents: CourtPrecedent[]) {
  precedentSearch = new MiniSearch({
    fields: ['principle', 'courtName', 'rulingNumber', 'detailedDecision', 'category', 'tags'],
    storeFields: ['id', 'principle', 'courtName', 'rulingNumber', 'detailedDecision', 'category', 'tags'],
    searchOptions: {
      boost: { principle: 3, courtName: 1.5, rulingNumber: 2, detailedDecision: 1, category: 2, tags: 2 },
      fuzzy: 0.2,
      prefix: true,
    },
  });
  precedentSearch.addAll(precedents.map(p => ({ ...p, tags: (p.tags || []).join(' ') })));
}

export function buildBookIndex(books: LegalBook[]) {
  bookSearch = new MiniSearch({
    fields: ['title', 'author', 'description', 'category', 'tags'],
    storeFields: ['id', 'title', 'author', 'description', 'category', 'tags'],
    searchOptions: {
      boost: { title: 3, author: 1.5, description: 1, category: 2, tags: 2 },
      fuzzy: 0.2,
      prefix: true,
    },
  });
  bookSearch.addAll(books.map(b => ({ ...b, tags: (b.tags || []).join(' ') })));
}

export function searchLaws(query: string): LawArticle[] {
  if (!lawSearch || !query.trim()) return [];
  return lawSearch.search(query).map(r => r as any);
}

export function searchPrecedents(query: string): CourtPrecedent[] {
  if (!precedentSearch || !query.trim()) return [];
  return precedentSearch.search(query).map(r => r as any);
}

export function searchBooks(query: string): LegalBook[] {
  if (!bookSearch || !query.trim()) return [];
  return bookSearch.search(query).map(r => r as any);
}

export function rebuildAllIndexes(laws: LawArticle[], precedents: CourtPrecedent[], books: LegalBook[]) {
  buildLawIndex(laws);
  buildPrecedentIndex(precedents);
  buildBookIndex(books);
}
