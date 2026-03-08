import { getMeili } from './meiliClient';
import { INDEX_CONFIGS } from './searchConfig';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface SynonymConfigResult {
  index: string;
  type: 'synonyms' | 'stopWords';
  status: 'success' | 'failed';
  error?: string;
}

// ── Synonym Definitions ───────────────────────────────────────────────────────
// Format follows Meilisearch API: each key maps to an array of synonymous terms.
// Bidirectional: "client" → ["customer","account"] AND "customer" → ["client","account"], etc.

export const SYNONYMS: Record<string, string[]> = {
  // Business entity synonyms
  client:       ['customer', 'account'],
  customer:     ['client', 'account'],
  account:      ['client', 'customer'],

  project:      ['job', 'engagement', 'initiative'],
  job:          ['project', 'engagement'],
  engagement:   ['project', 'job'],
  initiative:   ['project'],

  task:         ['ticket', 'todo', 'item', 'work item'],
  ticket:       ['task', 'todo', 'item'],
  todo:         ['task', 'ticket', 'item'],

  bug:          ['issue', 'defect', 'problem'],
  issue:        ['bug', 'defect', 'problem'],
  defect:       ['bug', 'issue', 'problem'],
  problem:      ['bug', 'issue', 'defect'],

  feature:      ['enhancement', 'improvement', 'request'],
  enhancement:  ['feature', 'improvement'],
  improvement:  ['feature', 'enhancement'],
  request:      ['feature'],

  invoice:      ['bill', 'payment'],
  bill:         ['invoice', 'payment'],
  payment:      ['invoice', 'bill'],

  brand:        ['company', 'organisation', 'organization'],
  company:      ['brand', 'organisation', 'organization'],

  feedback:     ['review', 'comment', 'note'],
  review:       ['feedback', 'comment'],
  comment:      ['feedback', 'review', 'note'],

  file:         ['document', 'attachment', 'asset'],
  document:     ['file', 'attachment'],
  attachment:   ['file', 'document'],
  asset:        ['file', 'document'],

  active:       ['ongoing', 'in progress', 'current'],
  ongoing:      ['active', 'in progress'],
  completed:    ['done', 'finished', 'closed'],
  done:         ['completed', 'finished', 'closed'],

  // Common tech/business abbreviations → full terms (directional)
  ui:           ['user interface'],
  ux:           ['user experience'],
  api:          ['endpoint', 'service', 'integration'],
  db:           ['database', 'data store'],
  qa:           ['quality assurance', 'testing'],
  pm:           ['project manager', 'product manager'],
  dev:          ['developer', 'development'],
  prod:         ['production'],
  staging:      ['pre-production'],
  repo:         ['repository'],
  cr:           ['code review'],
  pr:           ['pull request'],
  ci:           ['continuous integration'],
  cd:           ['continuous deployment'],
  cms:          ['content management'],
  seo:         ['search engine optimization'],
  crm:          ['customer relationship management'],
};

// ── Stop Words ────────────────────────────────────────────────────────────────
// Common English words that add noise but no search value.

export const STOP_WORDS: string[] = [
  // Articles
  'the', 'a', 'an',
  // Prepositions
  'in', 'on', 'at', 'to', 'from', 'by', 'for', 'with', 'of', 'about', 'into',
  // Conjunctions
  'and', 'or', 'but', 'nor', 'so', 'yet', 'because',
  // Common verbs / auxiliaries
  'is', 'are', 'was', 'were', 'be', 'been', 'being',
  'have', 'has', 'had', 'having',
  'do', 'does', 'did',
  'will', 'would', 'shall', 'should', 'may', 'might', 'can', 'could',
  // Pronouns
  'it', 'its', 'this', 'that', 'these', 'those',
  // Other common low-value words
  'not', 'no', 'also', 'just', 'than', 'then', 'very', 'too',
];

// ── Indexes to configure ──────────────────────────────────────────────────────
// Use the index names from INDEX_CONFIGS (all 7 indexes).
const ALL_INDEX_NAMES = Object.keys(INDEX_CONFIGS);

// ── Configuration Functions ───────────────────────────────────────────────────

/**
 * Applies synonym mappings to all searchable Meilisearch indexes.
 * Idempotent — running multiple times produces the same result.
 */
export async function configureSynonyms(): Promise<SynonymConfigResult[]> {
  const results: SynonymConfigResult[] = [];
  let client;

  try {
    client = getMeili();
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Meilisearch client init failed';
    console.error(`[searchSynonyms] ${message}`);
    return ALL_INDEX_NAMES.map(index => ({
      index,
      type: 'synonyms' as const,
      status: 'failed' as const,
      error: message,
    }));
  }

  for (const indexName of ALL_INDEX_NAMES) {
    try {
      await client.index(indexName).updateSynonyms(SYNONYMS);
      console.log(`[searchSynonyms] Synonyms applied to "${indexName}" at ${new Date().toISOString()}`);
      results.push({ index: indexName, type: 'synonyms', status: 'success' });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      console.error(`[searchSynonyms] Failed to apply synonyms to "${indexName}": ${message}`);
      results.push({ index: indexName, type: 'synonyms', status: 'failed', error: message });
    }
  }

  return results;
}

/**
 * Applies stop word list to all searchable Meilisearch indexes.
 * Idempotent — running multiple times produces the same result.
 */
export async function configureStopWords(): Promise<SynonymConfigResult[]> {
  const results: SynonymConfigResult[] = [];
  let client;

  try {
    client = getMeili();
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Meilisearch client init failed';
    console.error(`[searchSynonyms] ${message}`);
    return ALL_INDEX_NAMES.map(index => ({
      index,
      type: 'stopWords' as const,
      status: 'failed' as const,
      error: message,
    }));
  }

  for (const indexName of ALL_INDEX_NAMES) {
    try {
      await client.index(indexName).updateStopWords(STOP_WORDS);
      console.log(`[searchSynonyms] Stop words applied to "${indexName}" at ${new Date().toISOString()}`);
      results.push({ index: indexName, type: 'stopWords', status: 'success' });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      console.error(`[searchSynonyms] Failed to apply stop words to "${indexName}": ${message}`);
      results.push({ index: indexName, type: 'stopWords', status: 'failed', error: message });
    }
  }

  return results;
}
