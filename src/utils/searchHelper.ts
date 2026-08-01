export interface SnippetResult {
  before: string;
  match: string;
  after: string;
}

export interface MatchSnippet {
  fieldName: string;
  before: string;
  match: string;
  after: string;
}

export function getMatchingSnippet(text?: string, query?: string, padding = 45): SnippetResult | null {
  if (!text || !query) return null;
  const index = text.toLowerCase().indexOf(query.toLowerCase());
  if (index === -1) return null;

  const start = Math.max(0, index - padding);
  const end = Math.min(text.length, index + query.length + padding);

  return {
    before: (start > 0 ? '...' : '') + text.substring(start, index),
    match: text.substring(index, index + query.length),
    after: text.substring(index + query.length, end) + (end < text.length ? '...' : '')
  };
}

export function findMatchSnippet(
  fields: Record<string, string | undefined>,
  query: string,
  labels: Record<string, string>
): MatchSnippet | null {
  if (!query) return null;
  for (const [key, value] of Object.entries(fields)) {
    if (!value) continue;
    const snippet = getMatchingSnippet(value, query);
    if (snippet) {
      return {
        fieldName: labels[key] || key,
        ...snippet
      };
    }
  }
  return null;
}
