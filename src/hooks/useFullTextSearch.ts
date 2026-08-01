/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * useFullTextSearch — محرك بحث متقدم (Full-Text Search).
 *
 * يستخدم minisearch للبحث السريع في:
 *  - القضايا (caseNumber, claimSubject, notes, opponentName)
 *  - الموكلين (name, phone, nationalId, address, email)
 *  - الجلسات (objective, decision, judgeName)
 *  - المواعيد (title, lawReference)
 *  - المهام (title, description)
 *  - المعاملات المالية (description, caseNumber)
 *  - المستندات (name, fileName, type)
 *
 * المميزات:
 *  - بحث فوري (real-time)
 *  - Fuzzy matching (يقبل أخطاء إملائية بسيطة)
 *  - Highlight للكلمات المطابقة
 *  - بحث في HTML (يستخرج النص من TipTap)
 */

import { useState, useMemo, useCallback } from 'react';
import MiniSearch from 'minisearch';
import {
  Case, Client, Session, LegalDeadline, LawTask, Transaction, LawDocument
} from '../types';

export interface SearchResult {
  type: 'case' | 'client' | 'session' | 'deadline' | 'task' | 'transaction' | 'document';
  id: string;
  title: string;
  description: string;
  reference: string; // رقم القضية / اسم الموخل / الخ
  href?: string;
  // Snippet with highlighted match
  snippet: string;
  score: number;
  data: any;
}

interface SearchOptions {
  cases: Case[];
  clients: Client[];
  sessions: Session[];
  deadlines: LegalDeadline[];
  tasks: LawTask[];
  transactions: Transaction[];
  documents: LawDocument[];
}

function stripHtml(html: string): string {
  if (!html) return '';
  return html
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, ' ')
    .trim();
}

function makeSnippet(text: string, query: string, maxLen: number = 150): string {
  if (!text) return '';
  const lowerText = text.toLowerCase();
  const lowerQuery = query.toLowerCase();
  const idx = lowerText.indexOf(lowerQuery);

  if (idx === -1) {
    return text.substring(0, maxLen) + (text.length > maxLen ? '...' : '');
  }

  const start = Math.max(0, idx - 40);
  const end = Math.min(text.length, idx + query.length + 80);
  let snippet = text.substring(start, end);
  if (start > 0) snippet = '...' + snippet;
  if (end < text.length) snippet = snippet + '...';
  return snippet;
}

export function useFullTextSearch(opts: SearchOptions) {
  const [query, setQuery] = useState('');
  const [filters, setFilters] = useState<Set<string>>(new Set());

  const searchIndex = useMemo(() => {
    const ms = new MiniSearch({
      fields: ['title', 'description', 'reference', 'raw'],
      storeFields: ['type', 'id', 'title', 'description', 'reference', 'data'],
      searchOptions: {
        boost: { title: 3, reference: 2 },
        fuzzy: 0.2,
        prefix: true
      }
    });

    const docs: any[] = [];

    opts.cases.forEach(c => {
      docs.push({
        id: `case-${c.id}`,
        type: 'case',
        data: c,
        title: `${c.caseNumber} - ${c.clientName}`,
        description: stripHtml(c.claimSubject || '') + ' ' + stripHtml(c.notes || ''),
        reference: c.caseNumber,
        raw: `${c.caseNumber} ${c.clientName} ${c.opponentName} ${c.court} ${c.circuit} ${stripHtml(c.claimSubject || '')} ${stripHtml(c.notes || '')}`
      });
    });

    opts.clients.forEach(cl => {
      docs.push({
        id: `client-${cl.id}`,
        type: 'client',
        data: cl,
        title: cl.name,
        description: `${cl.phone} ${cl.address} ${stripHtml(cl.notes || '')}`,
        reference: cl.nationalId || cl.phone,
        raw: `${cl.name} ${cl.phone} ${cl.nationalId} ${cl.address} ${cl.email || ''} ${stripHtml(cl.notes || '')}`
      });
    });

    opts.sessions.forEach(s => {
      docs.push({
        id: `session-${s.id}`,
        type: 'session',
        data: s,
        title: `جلسة ${s.caseNumber} - ${s.court}`,
        description: `${s.objective} ${s.decision || ''} ${s.judgeName || ''}`,
        reference: s.caseNumber,
        raw: `${s.caseNumber} ${s.court} ${s.circuit} ${s.objective} ${s.decision || ''} ${s.judgeName || ''}`
      });
    });

    opts.deadlines.forEach(d => {
      docs.push({
        id: `deadline-${d.id}`,
        type: 'deadline',
        data: d,
        title: d.title,
        description: stripHtml(d.lawReference || ''),
        reference: d.caseNumber,
        raw: `${d.title} ${stripHtml(d.lawReference || '')} ${d.caseNumber}`
      });
    });

    opts.tasks.forEach(t => {
      docs.push({
        id: `task-${t.id}`,
        type: 'task',
        data: t,
        title: t.title,
        description: stripHtml(t.description || ''),
        reference: t.caseNumber,
        raw: `${t.title} ${stripHtml(t.description || '')} ${t.assignedTo} ${t.caseNumber}`
      });
    });

    opts.transactions.forEach(t => {
      docs.push({
        id: `transaction-${t.id}`,
        type: 'transaction',
        data: t,
        title: `${t.type} - ${t.ioType}`,
        description: stripHtml(t.description || ''),
        reference: t.caseNumber || '',
        raw: `${t.type} ${t.ioType} ${stripHtml(t.description || '')} ${t.caseNumber || ''}`
      });
    });

    opts.documents.forEach(d => {
      docs.push({
        id: `document-${d.id}`,
        type: 'document',
        data: d,
        title: d.name,
        description: `${d.type} - ${d.fileName}`,
        reference: d.caseNumber || '',
        raw: `${d.name} ${d.type} ${d.fileName} ${d.caseNumber || ''}`
      });
    });

    ms.addAll(docs);
    return ms;
  }, [opts.cases, opts.clients, opts.sessions, opts.deadlines, opts.tasks, opts.transactions, opts.documents]);

  const results: SearchResult[] = useMemo(() => {
    if (!query.trim() || query.length < 2) return [];

    const searchResults = searchIndex.search(query).slice(0, 50);

    let filtered = searchResults;
    if (filters.size > 0) {
      filtered = filtered.filter(r => filters.has((r as any).type));
    }

    return filtered.map(r => {
      const data = (r as any).data;
      const type = (r as any).type as SearchResult['type'];
      const title = (r as any).title;
      const description = (r as any).description;
      const reference = (r as any).reference;
      const id = String((r as any).id).replace(`${type}-`, '');

      return {
        type,
        id,
        title,
        description,
        reference,
        snippet: makeSnippet(description || title, query),
        score: r.score,
        data
      } as SearchResult;
    });
  }, [searchIndex, query, filters]);

  const toggleFilter = useCallback((type: string) => {
    setFilters(prev => {
      const next = new Set(prev);
      if (next.has(type)) next.delete(type);
      else next.add(type);
      return next;
    });
  }, []);

  const clearFilters = useCallback(() => {
    setFilters(new Set());
  }, []);

  return {
    query,
    setQuery,
    results,
    filters,
    toggleFilter,
    clearFilters,
    hasQuery: query.trim().length >= 2
  };
}
