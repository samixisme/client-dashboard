import { getMeili } from './meiliClient';

/**
 * Interface defining the configuration for a Meilisearch index.
 */
export interface IndexConfig {
  searchableAttributes: string[];
  filterableAttributes: string[];
  sortableAttributes: string[];
  rankingRules: string[];
  typoTolerance: {
    enabled: boolean;
    minWordSizeForTypos: {
      oneTypo: number;
      twoTypos: number;
    };
  };
}

/**
 * Common ranking rules for all indexes, optimized for business data.
 */
const COMMON_RANKING_RULES = [
  'words',
  'typo',
  'proximity',
  'attribute',
  'sort',
  'exactness',
];

/**
 * Common typo tolerance settings.
 */
const COMMON_TYPO_TOLERANCE = {
  enabled: true,
  minWordSizeForTypos: {
    oneTypo: 4,
    twoTypos: 8,
  },
};

/**
 * Complete configuration for all 7 Meilisearch indexes.
 */
export const INDEX_CONFIGS: Record<string, IndexConfig> = {
  projects: {
    searchableAttributes: ['name', 'description', 'tags'],
    filterableAttributes: ['status', 'clientId', 'priority', 'createdAt', 'updatedAt'],
    sortableAttributes: ['name', 'createdAt', 'updatedAt', 'priority'],
    rankingRules: COMMON_RANKING_RULES,
    typoTolerance: COMMON_TYPO_TOLERANCE,
  },
  tasks: {
    searchableAttributes: ['title', 'description', 'assignee'],
    filterableAttributes: ['status', 'priority', 'projectId', 'dueDate', 'createdAt', 'assignee'],
    sortableAttributes: ['dueDate', 'priority', 'createdAt', 'title'],
    rankingRules: COMMON_RANKING_RULES,
    typoTolerance: COMMON_TYPO_TOLERANCE,
  },
  brands: {
    searchableAttributes: ['name', 'description', 'industry'],
    filterableAttributes: ['industry', 'createdAt'],
    sortableAttributes: ['name', 'createdAt'],
    rankingRules: COMMON_RANKING_RULES,
    typoTolerance: COMMON_TYPO_TOLERANCE,
  },
  feedback_items: {
    searchableAttributes: ['title', 'content'],
    filterableAttributes: ['type', 'status', 'priority', 'projectId', 'createdAt'],
    sortableAttributes: ['createdAt', 'priority'],
    rankingRules: COMMON_RANKING_RULES,
    typoTolerance: COMMON_TYPO_TOLERANCE,
  },
  invoices: {
    searchableAttributes: ['number', 'clientName'],
    filterableAttributes: ['status', 'dueDate', 'createdAt', 'amount'],
    sortableAttributes: ['dueDate', 'createdAt', 'amount', 'number'],
    rankingRules: COMMON_RANKING_RULES,
    typoTolerance: COMMON_TYPO_TOLERANCE,
  },
  clients: {
    searchableAttributes: ['name', 'email', 'company'],
    filterableAttributes: ['industry', 'status', 'createdAt'],
    sortableAttributes: ['name', 'company', 'createdAt'],
    rankingRules: COMMON_RANKING_RULES,
    typoTolerance: COMMON_TYPO_TOLERANCE,
  },
  drive_files: {
    searchableAttributes: ['name', 'description'],
    filterableAttributes: ['type', 'projectId', 'createdAt'],
    sortableAttributes: ['name', 'createdAt'],
    rankingRules: COMMON_RANKING_RULES,
    typoTolerance: COMMON_TYPO_TOLERANCE,
  },
};

export interface ConfigureIndexesResult {
  index: string;
  status: 'success' | 'failed';
  error?: string;
}

/**
 * Idempotently applies the INDEX_CONFIGS to the Meilisearch instance.
 * Handles missing indexes (Meilisearch creates them lazily on first add or settings update).
 */
export async function configureIndexes(): Promise<ConfigureIndexesResult[]> {
  const results: ConfigureIndexesResult[] = [];
  let client;

  try {
    client = getMeili();
  } catch (err: unknown) {
    const defaultMsg = 'Meilisearch client initialization failed';
    const message = err instanceof Error ? err.message : defaultMsg;
    console.error(`[searchConfig] \${message}`);
    // If client cannot be instantiated, all indexes fail
    return Object.keys(INDEX_CONFIGS).map(index => ({
      index,
      status: 'failed',
      error: message,
    }));
  }

  for (const [indexName, config] of Object.entries(INDEX_CONFIGS)) {
    try {
      const index = client.index(indexName);
      
      // Call updateSettings to apply the complete configuration.
      // This is idempotent and will create the index if it doesn't already exist.
      await index.updateSettings(config);
      
      console.log(`[searchConfig] Successfully configured index: \${indexName} at \${new Date().toISOString()}`);
      results.push({ index: indexName, status: 'success' });
    } catch (err: unknown) {
      const defaultMsg = 'Unknown error occurred while configuring index';
      const message = err instanceof Error ? err.message : defaultMsg;
      console.error(`[searchConfig] Failed to configure index: \${indexName}. Error: \${message}`);
      
      results.push({ index: indexName, status: 'failed', error: message });
    }
  }

  return results;
}
