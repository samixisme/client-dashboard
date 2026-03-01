# PRD: Code Review Swarm Fixes

## Overview

This PRD captures all actionable findings from a 9-agent code review swarm run against the full uncommitted changeset of the Client Dashboard project. The review covered 92 files (+6,536 / −9,328 lines) across security, frontend, backend, state management, architecture, and performance domains.

The goal is to resolve all critical and high-severity issues, address medium-severity issues where practical, and leave low-severity items documented for future consideration.

---

## 1. Fix Storage Rules `isAdmin()` Custom Claims Mismatch

**Severity:** HIGH
**File:** `storage.rules`

### Problem
`isAdmin()` in storage rules checks `request.auth.token.admin == true` (a Firebase custom claim), but the codebase determines admin role via Firestore `user.role === 'admin'`. No Cloud Function or Admin SDK call ever sets the custom claim. This means brand uploads under `/brands/**` and other admin-gated storage paths silently fail for all users, including actual admins.

### Requirements
- Either create a Cloud Function (or server-side endpoint using Firebase Admin SDK) that sets `admin: true` custom claim via `admin.auth().setCustomUserClaims(uid, { admin: true })` whenever a user's Firestore `role` field is set to `'admin'`, OR rewrite storage rules to not rely on `token.admin` (e.g., remove the admin-only write restriction on brands and use Firestore-side validation instead).
- Whichever approach is chosen, verify that brand image uploads work for admin users after the fix.
- Add a test or manual verification step to confirm the fix.

---

## 2. Fix Firestore Tasks Rule Missing `assignees` Guard

**Severity:** HIGH
**File:** `firestore.rules`, line ~134

### Problem
The tasks collection update/delete rule uses `resource.data.assignees.hasAny([request.auth.uid])`, which throws a rules error if the `assignees` field is missing or null on a task document. This blocks all updates to tasks that don't have assignees set.

### Requirements
- Add a guard: `('assignees' in resource.data && resource.data.assignees.hasAny([request.auth.uid])) || isAdmin()`.
- Verify that tasks without assignees can still be updated by admins.
- Verify that tasks with assignees can still be updated by assigned users.

---

## 3. Add `useMemo` / `useCallback` to AdminContext Value

**Severity:** HIGH
**File:** `contexts/AdminContext.tsx`

### Problem
The context `value={{ isAdminMode, toggleAdminMode, userRole, isAdmin, isLoadingAdminCheck }}` creates a new object reference on every render, causing all `useAdmin()` consumers (the entire app tree under AdminProvider) to re-render unnecessarily.

### Requirements
- Wrap `toggleAdminMode` in `useCallback`.
- Wrap the context value object in `useMemo` with appropriate dependencies: `[isAdminMode, userRole, isAdmin, isLoadingAdminCheck]`.
- Verify no behavioral change — admin toggle and role checks should work identically.

---

## 4. Guard `app.listen()` Behind `require.main === module`

**Severity:** HIGH
**File:** `api/server.ts`

### Problem
`app.listen(port)` executes at module scope. Any test file that imports `server.ts` (e.g., integration tests) starts a real HTTP server, which can cause port conflicts and test flakiness.

### Requirements
- Wrap `app.listen(port, ...)` in `if (require.main === module) { ... }`.
- Continue exporting `app` for test use.
- Verify existing integration tests in `__tests__/integration/` still pass.

---

## 5. Add Re-entry Guard to Paymenter Sync Effect

**Severity:** HIGH
**File:** `pages/PaymentsPage.tsx`

### Problem
`syncPaymenterStatuses` runs inside a `useEffect` with `allInvoices` as a dependency. It fires N parallel fetch calls (one per linked invoice). If any sync writes back to Firestore, the `onSnapshot` listener updates `allInvoices`, which re-triggers the effect in a cascade loop.

### Requirements
- Add a `useRef` flag (`hasSyncedRef`) to ensure the sync runs only once on mount, not on every `allInvoices` change.
- Alternatively, move the dependency to a stable value (e.g., invoice IDs joined as a string) and debounce.
- Verify that Paymenter status sync still works on initial page load.
- Verify no infinite loop or repeated fetch calls in the network tab.

---

## 6. Verify `onSave` Prop Removal from EditClientModal

**Severity:** HIGH
**File:** `components/clients/EditClientModal.tsx`

### Problem
The `onSave` prop changed from required to optional (and is now unused inside the modal). Parent components that pass `onSave` callbacks will silently stop receiving save notifications.

### Requirements
- Search all call sites of `EditClientModal` across the codebase.
- Verify each caller either: (a) doesn't pass `onSave`, or (b) relies on Firestore `onSnapshot` listeners to pick up changes instead.
- If any caller depends on `onSave` being called, restore the callback invocation inside the modal's save handler.
- Remove the `onSave` prop from the interface entirely if no callers use it.

---

## 7. Extract Inline Firestore Logic from ProposalsPage

**Severity:** HIGH
**File:** `pages/ProposalsPage.tsx`

### Problem
The page grew from 84 to 375 lines and now contains raw `addDoc`, `updateDoc`, `deleteDoc` Firestore calls inline in the component. This violates separation of concerns and the project's data access patterns.

### Requirements
- Extract all Firestore operations into a `useProposals()` custom hook or add proposal CRUD to `DataContext`.
- The page component should only call hook methods like `addProposal(data)`, `updateProposal(id, data)`, `deleteProposal(id)`.
- Keep the `onSnapshot` real-time listener in the hook.
- Verify proposals CRUD still works after extraction.

---

## 8. Decompose Large Admin Pages into Sub-Components

**Severity:** HIGH
**Files:** `pages/admin/AdminSettingsPage.tsx` (512 lines), `AdminAICreatorPage.tsx` (+456), `AdminDashboardPage.tsx` (+437), `AdminUsersPage.tsx` (+416), `AdminPaymentsPage.tsx` (+393)

### Problem
Five admin pages approach or exceed the project's 500-line file limit. Each page contains inline form sections, chart sections, data tables, and modals that should be separate components.

### Requirements
- For each page, extract logical sections into sub-components in the same directory or `components/admin/`.
- Target: each page file should be under 300 lines after extraction.
- Specifically:
  - `AdminDashboardPage`: extract chart sections (line/bar/area/pie) into `AdminDashboardCharts.tsx`.
  - `AdminSettingsPage`: extract each tab panel into its own component (`GeneralSettingsTab`, `FirebaseSettingsTab`, etc.).
  - `AdminUsersPage`: extract user table and user edit modal.
  - `AdminPaymentsPage`: extract invoice table and payment stats.
  - `AdminAICreatorPage`: extract form sections.
- Verify no functional regression after decomposition.

---

## 9. Remove Misleading Mock Security Rules from AdminSettingsPage

**Severity:** CRITICAL
**File:** `pages/admin/AdminSettingsPage.tsx`

### Problem
When the `/settings` API endpoint doesn't respond, the page falls back to `MOCK_DATA` containing the old permissive Firestore rules (`allow read, write: if request.auth != null`). An admin viewing this could believe those are the live rules. Additionally, the page includes a text editor for rules, which is dangerous without server-side validation.

### Requirements
- Remove the `rules` field from mock data entirely.
- Remove the rules editing tab/section from the settings page, OR make it strictly read-only and fetch actual rules from the Firebase Admin SDK via a server endpoint.
- If keeping a read-only display, add a clear disclaimer: "These rules are fetched from Firebase and cannot be edited here."

---

## 10. Standardize Data Access Patterns

**Severity:** HIGH

### Problem
Three different data access patterns coexist:
1. `DataContext` with `onSnapshot` listeners (e.g., `PaymentsPage`)
2. `useAdminApi` hook with REST calls (admin pages)
3. Raw Firestore SDK calls (e.g., `ProposalsPage`)

This inconsistency makes maintenance harder and increases the risk of bugs.

### Requirements
- Document the intended pattern for each context:
  - Client-facing pages: use `DataContext` or dedicated hooks with `onSnapshot`.
  - Admin pages: use `useAdminApi` hook for server-mediated operations.
  - No raw Firestore calls in page components.
- Refactor `ProposalsPage` (covered in task 7) as the primary example.
- Add a brief comment or section to CLAUDE.md documenting the data access convention.

---

## 11. Replace `console.error` with Proper Error Handling in AdminContext

**Severity:** MEDIUM
**File:** `contexts/AdminContext.tsx`, line ~42

### Problem
`console.error('Error during admin role check', error)` exists in production code. The project coding style prohibits `console.log`/`console.error` in production.

### Requirements
- Replace with `toast.error('Failed to verify admin role')` for user-visible feedback.
- Optionally add structured logging if a logger utility exists.
- Remove or guard the `console.error` call.

---

## 12. Clear Stale Errors in Social Media Store

**Severity:** MEDIUM
**File:** `stores/socialMediaStore.ts`

### Problem
Error state is set via `set({ error: ... })` on failures, but successful operations don't clear it. Stale error messages may persist in the UI after recovery.

### Requirements
- Add `set({ error: null })` at the start of each async action (fetch, post, connect, disconnect).
- Verify that error toasts or UI indicators clear after a successful retry.

---

## 13. Add Double-Submit Guard to Feedback Form

**Severity:** MEDIUM
**File:** `components/feedback/AddNewFeedbackItemForm.tsx`

### Requirements
- Add a `submitting` state that disables the submit button and shows a spinner while the form is being submitted.
- Prevent duplicate feedback items from being created by rapid clicks.

---

## 14. Fix `getTimestampSeconds` to Handle `Date` Objects

**Severity:** MEDIUM
**File:** `types.ts`

### Problem
The function returns `0` for `Date` instances since they don't have a `seconds` property. Only Firebase `Timestamp` objects and raw `{ seconds, nanoseconds }` shapes are handled.

### Requirements
- Add an `instanceof Date` check that returns `Math.floor(date.getTime() / 1000)`.
- Add unit tests for all input shapes: `Timestamp`, `Date`, `{ seconds, nanoseconds }`, `string`, `null`, `undefined`.

---

## 15. Fix AdminDashboardPage Mock Data Regeneration

**Severity:** MEDIUM
**File:** `pages/AdminDashboardPage.tsx`

### Problem
`MOCK_DATA.taskCompletionTrend` uses `Math.random()` at module scope, generating different values on each HMR reload or re-import. This causes chart flickering during development.

### Requirements
- Replace `Math.random()` calls with deterministic seed-based values or static fixture data.
- Move mock data to a separate file if it's used for development/demo purposes.
- Inline admin-specific types (`DashboardStats`, `ChartPoint`, `ActivityItem`, `DashboardData`) into `types.ts`.

---

## 16. Code-Split Heavy Dependencies for Admin Pages

**Severity:** MEDIUM

### Problem
- `recharts` (~200KB) is imported synchronously in `AdminDashboardPage.tsx`.
- `framer-motion` (~150KB) is imported for simple tab animations in `AdminSettingsPage.tsx`.

Admin pages are visited infrequently by a small number of users, so these libraries should not be in the main bundle.

### Requirements
- Wrap `AdminDashboardPage` in `React.lazy()` with a `Suspense` fallback at the route level.
- Evaluate whether `framer-motion` can be replaced with CSS transitions for the tab animation in `AdminSettingsPage`. If so, remove the dependency. If not, ensure the admin route is code-split.
- Verify bundle size impact with `npm run build` and check output chunk sizes.

---

## 17. Document the Deny-by-Default Firestore Catch-All

**Severity:** MEDIUM
**File:** `firestore.rules`

### Problem
The new catch-all `allow read, write: if false` is a critical security improvement, but any future Firestore collection added without an explicit rule above it will silently fail. This needs documentation so future developers don't get blocked.

### Requirements
- Add a prominent comment in `firestore.rules` above the catch-all explaining the pattern.
- Add a note in `CLAUDE.md` under "Gotchas & Warnings" explaining that every new Firestore collection requires an explicit rule.
- Consider adding a CI check or test that verifies all collections referenced in code have corresponding rules.

---

## 18. Verify New Admin Route Files Use Auth Middleware

**Severity:** MEDIUM
**Files:** All new `api/admin*Routes.ts` files (untracked)

### Problem
Multiple new admin route files were added (`adminClientsRoutes.ts`, `adminPaymentsRoutes.ts`, `adminUsersRoutes.ts`, etc.) but they are untracked and need verification that they all use proper authentication and authorization middleware.

### Requirements
- Verify every `admin*Routes.ts` file uses `adminAuthMiddleware` (or equivalent) on all routes.
- Verify input validation (preferably Zod) on all POST/PUT/PATCH endpoints.
- Verify error responses follow the `ApiResponse` pattern from the coding style guide.
- Add at least one integration test per admin route file.
