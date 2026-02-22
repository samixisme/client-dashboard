import { MeiliSearch } from 'meilisearch';

let _meili: MeiliSearch | null = null;

export function getMeili(): MeiliSearch {
  if (!_meili) {
    const host = process.env.MEILISEARCH_HOST;
    if (!host) {
      throw new Error('MEILISEARCH_HOST is not configured. Add it to your .env file.');
    }
    _meili = new MeiliSearch({ host, apiKey: process.env.MEILISEARCH_MASTER_KEY });
  }
  return _meili;
}

/** @deprecated Use getMeili() instead — avoids crash on startup when env vars are missing */
export const meili = new Proxy({} as MeiliSearch, {
  get(_target, prop) {
    return (getMeili() as never as Record<string | symbol, unknown>)[prop];
  },
});
