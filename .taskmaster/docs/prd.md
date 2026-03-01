# Client Dashboard - Codebase Audit PRD

> Generated from a deep audit of the entire codebase on 2026-02-25.
> Covers 70 pages, 14+ component directories, 7 contexts, Express API layer, security rules, tests, and data model.

---

## 1. Stub Implementations & Non-Functional Handlers

### 1.1 Social Media Page - Dead Event Handlers

**Files:** `pages/SocialMediaPage.tsx:298-300, 331`

The `ScheduledPostCard` component receives three handlers that only `console.log`:

- `onEdit={(id) => console.log('Edit post:', id)}`
- `onDelete={(id) => console.log('Delete post:', id)}`
- `onPublishNow={(id) => console.log('Publish now:', id)}`

The `AnomalyAlertsBanner` also has a dead handler:

- `onDismiss={(id) => console.log('Dismiss anomaly:', id)}`

**Requirements:**

- Implement edit scheduled post: open a modal pre-filled with post data, persist changes to Firestore `scheduled_posts`
- Implement delete scheduled post: confirmation dialog, then delete from Firestore
- Implement publish-now: call the social API to publish immediately, update status to `published`, remove from scheduled list
- Implement dismiss anomaly: update anomaly doc in Firestore with `dismissed: true`, filter from the UI

### 1.2 Social Media Account Connection Stub

**File:** `components/social-media/AccountsList.tsx:109`

The "Connect First Account" button logs to console and does nothing.

**Requirements:**

- Wire the button to the OAuth flow already partially built in `api/social.ts`

### 1.3 Feedback Item Card - Edit/Save Stubs

**File:** `components/feedback/FeedbackItemCard.tsx:85, 92-97`

Edit and save buttons contain `console.log` instead of actual persistence logic.

**Requirements:**

- Wire edit button to toggle inline editing mode (UI state already exists)
- Wire save button to call Firestore update on the `feedbackItems` document
- Show error toast on failure

### 1.4 Feedback Video Description Not Persisted

**File:** `pages/FeedbackVideoDetailPage.tsx:492`

The save button for video description has `// TODO: Save description to Firebase` and only toggles editing state.

**Requirements:**

- Persist the description to the Firestore `feedbackItems` document on save

### 1.5 Proposals Page - Entirely Hardcoded

**File:** `pages/ProposalsPage.tsx:5-12`

The entire page uses a hardcoded array with fake names (`Alice Johnson`, `Bob Williams`, etc.). No Firestore integration.

**Requirements:**

- Create a `proposals` Firestore collection
- Add `Proposal` interface to `types.ts`
- Add Firestore rules for proposals (admin write, authenticated read)
- Wire ProposalsPage to read/write from Firestore
- Add full CRUD (create, edit, delete)
- Add status workflow (Pending -> Approved/Rejected)

---

## 2. Webhook Handlers - No Persistence

### 2.1 Instagram Webhook Event Handlers

**File:** `api/webhooks.ts:95-147`

Four webhook handlers only log to console with explicit TODO comments:

| Handler | Line | TODO |
|---------|------|------|
| `handleCommentEvent` | 103 | Store in Firebase, notify user |
| `handleMessageEvent` | 119 | Store in Firebase, send notification |
| `handleMediaEvent` | 132 | Sync new post to Firebase `socialPosts` |
| `handleMentionEvent` | 146 | Store mention notification in Firebase |

**Requirements:**

- `handleCommentEvent`: Write to `socialComments` collection, trigger Novu notification
- `handleMessageEvent`: Write to `socialMessages` collection, trigger notification
- `handleMediaEvent`: Write to `socialPosts` collection with media metadata
- `handleMentionEvent`: Write to `socialMentions` collection, trigger notification
- Add error handling with retry logic for Firestore writes
- Add webhook event deduplication (Meta sends duplicates)

---

## 3. Security Hardening

### 3.1 Storage Rules - Wide Open (CRITICAL)

**File:** `storage.rules:4-6`

```
match /{allPaths=**} {
  allow read, write: if request.auth != null;
}
```

Any authenticated user can read/write ANY file in storage, including other users' uploads.

**Requirements:**

- Path-based rules: users write only to `users/{uid}/`
- Project assets: scoped to project members
- Feedback attachments: scoped to project members
- Moodboard assets: creator or admin only
- Brand assets: admin-only write, authenticated read
- Max file size limits (e.g., 10MB images, 100MB videos)
- Content type restrictions (no executables)

### 3.2 Webhook Verify Token Fallback (CRITICAL)

**File:** `api/webhooks.ts:7`

```typescript
const WEBHOOK_VERIFY_TOKEN = process.env.WEBHOOK_VERIFY_TOKEN || 'your-webhook-verify-token-here';
```

Falls back to a publicly visible default string.

**Requirements:**

- Remove the fallback default
- Fail fast if `WEBHOOK_VERIFY_TOKEN` is not set (return 503 on webhook routes)
- Log warning at server startup if missing

### 3.3 Firestore Catch-All Rule

**File:** `firestore.rules:242-244`

```
match /{document=**} {
  allow read: if isAuthenticated();
  allow write: if isAdmin();
}
```

Any authenticated user can read any document in any collection not explicitly matched above.

**Requirements:**

- Audit all collections actually used
- Add explicit rules for every collection
- Change catch-all to deny-by-default: `allow read, write: if false;`
- Test no features break after tightening

---

## 4. Console.log Cleanup

### 4.1 Production Console Statements

| Area | Files Affected | Approx. Count |
|------|---------------|----------------|
| Pages | 30+ | ~80 |
| Components | 15+ | ~35 |
| API layer | 10+ | ~50 |
| Contexts | 5 | ~8 |
| Utils | 3+ | ~5 |

**Total: ~178 console statements in production code.**

**Requirements:**

- **API layer**: Replace with structured logger (`pino` or `winston`) supporting log levels
- **Frontend**: Remove all `console.log` debug statements; convert `console.error` in catch blocks to user-facing toasts
- **Contexts**: Replace `console.error` with error boundaries or toasts
- Keep `console.warn` only behind `import.meta.env.DEV` guard

### 4.2 Specific Debug Logs Left In Production

**File:** `pages/FeedbackMockupScreensSelectionPage.tsx:77,84,105`
- `console.log('Updating main item name:', newName)`
- `console.log('Successfully updated main item name')`
- `console.log('Successfully updated image name:', newName)`

**File:** `pages/FeedbackVideosPage.tsx:42,51`
- `console.log('Updating video:', { videoId, newName, newDescription })`
- `console.log('Successfully updated video')`

**File:** `pages/SocialMediaPage.tsx:298-300`
- Three `console.log` stubs (covered in section 1.1)

---

## 5. Type Safety

### 5.1 `as any` Type Assertions (36 instances across 21 files)

**Key offenders:**

| File | Count |
|------|-------|
| `pages/AdminDashboardPage.tsx` | 4 |
| `pages/ClientDetailPage.tsx` | 4 |
| `components/roadmap/TimelineView.tsx` | 3 |
| `pages/ToolsPage.tsx` | 3 |
| `components/feedback/FeedbackSidebar.tsx` | 2 |
| `pages/FeedbackMockupScreensSelectionPage.tsx` | 2 |
| `utils/diagnoseDrive.ts` | 2 |

**Requirements:**

- Eliminate all `as any` by adding proper type definitions
- For external libraries with missing types, create `.d.ts` declaration files
- For Firestore document data, use typed converters or Zod schemas at the boundary

---

## 6. Test Coverage Gaps

### 6.1 Current State

**Unit tests (10 files):**

| Test File | Covers |
|-----------|--------|
| `sample.test.tsx` | Basic sanity |
| `utils.test.ts` | Utility functions |
| `calendarSync.test.ts` | Calendar sync |
| `activityPersistence.test.ts` | Activity persistence |
| `urlValidator.test.ts` | URL validation |
| `UserContext.test.tsx` | User context |
| `DataContext.test.tsx` | Data context |
| `InvoiceDownloadButton.test.tsx` | PDF download button |
| `AdminUsersPage.test.tsx` | Admin users page |
| `invoiceService.test.ts` | Invoice service |

**E2E tests (4 files):**

| Test File | Covers |
|-----------|--------|
| `auth.spec.ts` | Auth flow |
| `client-flow.spec.ts` | Client management |
| `invoice-flow.spec.ts` | Invoice workflow |
| `feedback.spec.ts` | Feedback tool |

### 6.2 Missing Coverage - Priority Targets

**Pages with no tests (60+ pages untested):**

- `PaymentsPage.tsx` - Financial data, must be correct
- `ProjectBoardPage.tsx` - Core feature, complex DnD state
- `LoginPage.tsx` - Auth flow, security-sensitive
- `SettingsPage.tsx` - User profile mutations
- `MoodboardCanvasPage.tsx` - Complex canvas interactions
- `SocialMediaPage.tsx` - Multiple tab views, data filtering
- `FeedbackWebsiteDetailPage.tsx` - Proxy integration
- `DashboardPage.tsx` - Main landing page
- `SubscriptionsPage.tsx` - Paymenter API integration

**Components with no tests:**

- `components/board/` - Kanban (3 views)
- `components/feedback/` - Comment system, versions
- `components/moodboard/` - Canvas tools
- `components/payments/` - Invoice/estimate forms, subscriptions
- `components/TaskModal.tsx` - Core task modal
- `components/social-media/` - All social components

**API routes with no tests:**

- `api/proxy.ts` - SSRF protection, HTML rewriting
- `api/social.ts` - OAuth flows, token management
- `api/webhooks.ts` - Webhook verification
- `api/paymenterRoutes.ts` - Payment integration
- `api/notifications.ts` - Notification system
- `api/adminRoutes.ts` - Admin user management
- `api/searchRoutes.ts` - Meilisearch integration
- `api/searchSync.ts` - Firestore-to-Meilisearch sync

**Contexts with no tests:**

- `AdminContext.tsx`
- `TimerContext.tsx`
- `CalendarContext.tsx`
- `SearchContext.tsx`
- `NotificationHistoryContext.tsx`

**Requirements:**

- Achieve 60%+ overall test coverage
- All API routes must have integration tests
- All contexts must have unit tests
- Core pages (payments, board, login, settings) must have component tests
- Add E2E tests for: social media scheduling, moodboard creation, document editing

---

## 7. Error Boundaries

### 7.1 No Error Boundaries Exist

No React error boundaries exist in the component tree. Any render-time exception crashes the entire app to a white screen.

**Requirements:**

- Add top-level `ErrorBoundary` wrapping the router in `App.tsx`
- Add feature-level error boundaries around:
  - Moodboard canvas (WebGL can crash)
  - Feedback iframe (external content loading)
  - Doc editor (BlockSuite)
  - LiquidEther background (Three.js WebGL)
- Each boundary shows a user-friendly fallback with "Try Again" button

---

## 8. Data Connect Schema Alignment

### 8.1 Schema vs TypeScript Types

**File:** `dataconnect/schema/schema.gql`

The schema was updated from movie boilerplate to dashboard entities but is minimal compared to `types.ts`.

**Entities missing from schema:**

- `SocialAccount`, `SocialPost`, `ScheduledPost`
- `EmailTemplate`
- `RoadmapItem`
- `Comment` (task + feedback comments)
- `Activity`, `TimeLog`
- `MoodboardItem`
- `Doc` (BlockSuite documents)
- `Proposal`
- `Notification`

**Fields missing from existing schema entities:**

- `Task`: missing `description`, `assignees`, `dueDate`, `tags`, `attachments`, `recurring`
- `Project`: missing `logoUrl`, `clientId`, `dueDate`
- `Client`: missing `company`, `address`, `notes`, array `managedBy`
- `Invoice/Estimate`: missing `items`, `dueDate`, `notes`, `currency`, `taxRate`
- `Brand`: missing `colors`, `fonts`, `guidelines`, `assets`

**Requirements:**

- Decide: Is Data Connect actively used, or is everything through Firestore? If Firestore-only, document this and remove unused Data Connect code
- If Data Connect is used: update schema to match all `types.ts` interfaces, add relationships, regenerate SDK

---

## 9. Recurring Tasks Engine

### 9.1 Server-Side Task Generation

**Files:** `types.ts:38-44`, `utils/recurringTasks.ts`

The `Task` type defines a `recurring` field and a utility file exists, but there is no evidence of a scheduled job or Cloud Function that actually generates recurring task instances.

**Requirements:**

- Implement server-side Cloud Function or cron job that:
  - Queries tasks where `recurring.nextDueDate <= today`
  - Creates the next occurrence in the correct stage
  - Updates `nextDueDate` based on frequency/interval
  - Respects `repeatOnlyWhenCompleted` flag
- Add UI indicator on task cards showing recurrence pattern
- Add ability to stop/modify recurrence from TaskModal

---

## 10. Notification System Completeness

### 10.1 Novu Integration Coverage

**File:** `src/hooks/useNovuTrigger.ts`

The hook exists but needs audit of where it's actually called.

**Requirements:**

- Audit and ensure notifications fire for:
  - Task assigned to user
  - Comment on user's task
  - Feedback comment added
  - Invoice/estimate status changed
  - Calendar event reminder
  - Social media webhook events (once section 2 is implemented)
  - User approval status changed
- Verify SettingsPage notification preferences are respected

---

## 11. Admin Social Media - TODO Comment

### 11.1 Modal Components Verification

**File:** `pages/admin/AdminSocialMediaPage.tsx:421`

Comment: `{/* Modals - TODO: Create these components */}`

The `DeleteConfirmationModal` appears to be implemented already. Need to verify:

**Requirements:**

- Verify `AddEditSocialAccountModal` covers create/edit for all platforms
- Verify `SchedulePostModal` handles all scheduling options
- Ensure delete confirmation works for accounts, posts, and anomalies
- Remove the TODO comment once verified

---

## Priority Matrix

| Priority | Category | Section | Description |
|----------|----------|---------|-------------|
| **P0** | Security | 3.1 | Storage rules wide open - any auth user can read/write all files |
| **P0** | Security | 3.2 | Webhook verify token has public default fallback |
| **P0** | Functionality | 1.1 | Social media edit/delete/publish handlers are console.log stubs |
| **P0** | Functionality | 2.1 | All 4 webhook event handlers log only, no persistence |
| **P1** | Functionality | 1.4 | Feedback video description save not persisted |
| **P1** | Functionality | 1.5 | Proposals page entirely hardcoded with fake data |
| **P1** | Functionality | 1.2 | Social account connection button is a stub |
| **P1** | Quality | 7.1 | No error boundaries - any render crash = white screen |
| **P1** | Quality | 4.1 | ~178 console statements in production code |
| **P1** | Testing | 6.2 | 0 tests for API routes, 60+ pages untested |
| **P2** | Type Safety | 5.1 | 36 `as any` casts across 21 files |
| **P2** | Security | 3.3 | Firestore catch-all allows any auth user to read any collection |
| **P2** | Data | 8.1 | Data Connect schema incomplete vs types.ts |
| **P2** | Features | 9.1 | Recurring tasks engine has no server-side execution |
| **P2** | Features | 10.1 | Notification triggers not wired to all user actions |
| **P2** | Testing | 6.2 | Context tests, component tests, E2E expansion |
| **P3** | Cleanup | 4.2 | Debug console.logs in feedback/video pages |
| **P3** | Cleanup | 1.3 | Feedback item card edit/save stubs |
| **P3** | Admin | 11.1 | Social media modal TODO comment verification |
