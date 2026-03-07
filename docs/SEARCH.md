# Meilisearch Integration Documentation

## Architecture Overview

The search system is powered by Meilisearch to provide instant, sub-50ms search capabilities across the Client Dashboard. We employ an API Proxy architecture rather than exposing the Meilisearch instance directly to the frontend.

### Data Flow

1. **Mutation**: Data is modified in Firestore via normal API calls.
2. **Synchronization**: A Background Sync Job (`api/searchSync.ts`) polls Firestore/Drive periodically or on-demand, fetching changes and pushing them to Meilisearch.
3. **Querying**:
   - Frontend calls `GET /api/search?q=keyword`.
   - API resolves the query, routes it to Meilisearch `client.multiSearch()`.
   - The result is parsed and surfaced to the UI.

```mermaid
graph TD;
  Frontend-->|GET /api/search|API_Proxy;
  API_Proxy-->|Meilisearch Client|Meilisearch;
  Firestore-->|Sync Job|Meilisearch;
  API_Proxy.-Fallback.->Firestore;
```

---

## Index Configuration Reference

We maintain 7 different indexes for cross-cutting entity search.

| Index Name       | Searchable Attributes      | Filterable Attributes | Sortable Attributes |
| ---------------- | -------------------------- | --------------------- | ------------------- |
| `projects`       | name, description, brandId | status, priority      | createdAt           |
| `tasks`          | title, description         | status, priority      | dueDate             |
| `brands`         | name, industry, brandVoice | industry              | createdAt           |
| `feedback_items` | name, description, type    | status, type          | createdAt           |
| `invoices`       | invoiceNumber, clientId    | status                | date                |
| `clients`        | name, adresse, ice         | -                     | createdAt           |
| `drive_files`    | name, folderPath           | mimeType              | modifiedTime        |

Index settings are strictly versioned in `api/searchConfig.ts`.

---

## API Endpoints

### 1. Execute Search

`GET /api/search`
Parameters:

- `q`: (string) The search query.
- `types`: (string) Comma-separated list of index names (e.g. `projects,tasks`).
- `filters`: (string) Meilisearch filter string (e.g., `status = 'active'`).
- `facets`: (string) Comma-separated fields to compute facet distributions.
- `sort`: (string) Comma-separated sort attributes (e.g. `dueDate:asc`).
- `page`: (number) Page number (offset multiplier).
- `limit`: (number) Items per page (default: 5, max: 50).

**Example Request:**

```
/api/search?q=redesign&types=projects,tasks&filters=status='active'&limit=10
```

### 2. Search Analytics

Powered by `api/searchAnalytics.ts` (Firestore backed with HMAC-SHA256 privacy).

- `GET /api/search/analytics/popular`: Returns most queried terms.
- `GET /api/search/analytics/trending`: Returns trending terms (last 7 days).
- `GET /api/search/analytics/no-results`: Returns common queries yielding 0 results.
- `POST /api/search/analytics/click`: Log result interactions.

### 3. Health & Status

- `GET /api/search/health`: Evaluates Meilisearch connectivity, queues, sync jobs, and internal p50/p95/p99 latency. Returns `200` if healthy, `503` if degraded.

---

## Frontend Components

The global search UI relies on a context-driven setup.

**Using the Hook:**

```typescript
import { useSearch } from "@/hooks/useSearch";

const { query, setQuery, results, isLoading, applyFilter } = useSearch();
```

**Global Component (`src/components/search/GlobalSearch.tsx`):**
Available throughout the dashboard, usually bound to `Ctrl + K`. It renders `ResultCard` components highlighting matches using `<mark>` tags provided dynamically by Meilisearch.

---

## Sync Job

The synchronization logic is located in `api/searchSync.ts`.

- **Full Sync:** Truncates all existing Meilisearch domains and re-imports documents via batched ingestion directly from Firestore arrays and Google Drive.
- **Partial Sync:** Single document delta updates (for real-time consistency) exposed via `POST /api/search/sync/:type/:id`.

**Monitoring Sync:** Errors and check-pointing are persisted statefully via `searchState.ts`.

---

## Operations Guide

We expose utility CLI commands (via `package.json` scripts) to easily manage the Meilisearch instance.

| Command                    | Description                                                         |
| -------------------------- | ------------------------------------------------------------------- |
| `npm run search:configure` | Idempotently applies mapping configurations from `searchConfig.ts`. |
| `npm run search:reindex`   | Full wipe and restoration from absolute truth (Firestore/Drive).    |
| `npm run search:status`    | Outputs instance health and index sizes.                            |
| `npm run search:clear`     | Deletes index documents. Interactive confirmation provided.         |
| `npm run search:swap`      | Swaps two active index aliases with absolute zero downtime.         |

---

## Troubleshooting Guide

**1. "Search Results are Stale"**  
**Resolution:** Run `npm run search:status` to ensure task queues aren't backed up. Investigate failing full-sync jobs or hook into `GET /api/search/health` to view replication delays. Run `npm run search:reindex` to force consistency.

**2. "Document not appearing in search"**  
**Resolution:** Verify the field containing the text value is defined inside the `searchableAttributes` array in `searchConfig.ts`. Stop-words or synonyms may also affect visibility.

**3. "Meilisearch Connection Error"**  
**Resolution:** Ensure `.env` contains `MEILISEARCH_HOST` and `MEILISEARCH_MASTER_KEY`. Restart via `docker compose restart meilisearch`. Note: the backend automatically initiates a DB Query Fallback mechanism to ensure end-users can still find data while it's down.

---

## Performance Optimization Tips

- Filter push-down limits unnecessary processing constraint.
- Request explicit pagination limits (`limit=20` max per response).
- Full syncs partition documents into 10K record chunks (`BATCH_SIZE`) to prevent blowing memory limits within Node.js.

---

## FAQ

**Q: How do I add a new searchable field?**
Modify the array mapping inside `INDEX_CONFIGS` (`api/searchConfig.ts`) and execute `npm run search:configure`.

**Q: Can I search across multiple indexes simultaneously?**
Yes. Omitting `types=` automatically spans all 7 core indexes concurrently.

**Q: What happens if Meilisearch crashes?**
The proxy implements a Circuit Breaker pattern. If consecutive failures exceed limits, the system dynamically reroutes subsequent searches toward a rudimentary prefix/text search via Firestore to prevent full failure.
