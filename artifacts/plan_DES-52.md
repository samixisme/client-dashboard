# Implementation Plan: DES-52 (Collections Retrieval)

## Goal Description

Implement retrieval of collections from the Linkwarden API based on the `/api/v1/collections` endpoint. This will establish the data structures, the authentication-capable low-level HTTP client method, and the robust application-level domain service.

## Proposed Changes

### 1. Data Structures (DES-59)

#### [MODIFY] types.ts

- Define `LinkwardenRawCollection` (id, name, description, etc.)
- Define `LinkwardenCollection` (parsed structure)
- Define `LinkwardenCollectionsResponse`
- Add Zod schemas: `LinkwardenRawCollectionSchema`, `LinkwardenCollectionsResponseSchema`
- Endpoint constant: `LINKWARDEN_COLLECTIONS_PATH`

#### [MODIFY] index.ts

- Export the newly added types, constants, and endpoints.

---

### 2. HTTP Client & Domain Service (DES-57 & DES-61)

#### [NEW] collections.ts

- Define `LinkwardenCollectionsClient`
- Takes `LinkwardenClientConfig` in constructor (with `LinkwardenAuth` mechanism)
- Implement `fetchCollections()` method:
  - Calls `GET /api/v1/collections` with Bearer auth headers
  - Performs `.safeParse()` on response using `LinkwardenCollectionsResponseSchema`
  - Maps to `LinkwardenCollection[]`
  - Uses `try/catch` wrapping for networking, and translates into `LinkwardenCollectionError` domain errors

## Verification Plan

### Automated Tests

- Unit/Integration tests simulating the `/api/v1/collections` endpoint
- Test parsing successful response, handling parsing failures, handling HTTP 4xx/5xx failures.
