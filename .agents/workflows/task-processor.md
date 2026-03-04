---
description: Run the task-processor pipeline to discover, analyze, decompose, execute, and review pending tasks natively in Antigravity.
---

# Task Processor Pipeline (Antigravity)

**Overview:**
This workflow replaces the Claude `clink` pipeline with a native Antigravity process. Antigravity drives the phases directly, reading and updating `.taskmaster/processor-state.json`.

**How you run this:**
As the Antigravity agent, you will step through these phases directly. You do not need to spawn subagents. You will act as the processor.

## Pre-requisites

- Ensure you have access to the Task Master MCP tools (`mcp__taskmaster-ai__*`).
- Project root: `c:/Users/Sami/client-dashboard`

## Shared Project Context (Must Follow)

- **Stack:** React 18 + TypeScript + Vite + Firebase + Express API
- **Router:** react-router-dom v6 HashRouter (`<Link>` and `useNavigate` only). NEVER `next/link` or `next/router`.
- **CSS tokens:** `bg-glass`, `bg-glass-light`, `border-border-color`, `text-text-primary`, `text-text-secondary`, `text-primary`, `bg-primary`
- **Context nesting order (MUST NOT change):** `NotificationHistoryProvider -> UserProvider -> AdminProvider -> DataProvider -> TimerProvider -> CalendarProvider -> SearchProvider`
- **Zod:** always `.safeParse()`, never `.parse()`
- **Express route conventions:** Use `import logger from './logger'`, `isAdminInitialized` from `./firebaseAdmin`. Handle async errors explicitly. All responses: `{ success: boolean, data?: T, error?: string }`
- **Auth token (client):** `getAuth().currentUser?.getIdToken()`

---

## Phase 1: DISCOVER

1. **Stale Recovery:** Call `mcp__taskmaster-ai__get_tasks(status: "in-progress")`. If any tasks are in-progress but not in the state file (or state file is missing), reset them to `pending`.
2. **Fetch Pending:** Call `mcp__taskmaster-ai__get_tasks(status: "pending")`.
3. **Filter:** Keep tasks where `dependencies` is empty or all dependencies are `done`.
4. **Select Batch:** Select up to 3-6 tasks based on priority (high priority or unblocking other tasks).
5. **Mark In-Progress:** Call `mcp__taskmaster-ai__set_task_status(id, "in-progress")` for the selected tasks.
6. **Initialize State:** Create/Update `.taskmaster/processor-state.json` with `phase: "DISCOVER"` and the selected task details.

## Phase 2: ANALYZE

1. Read the batch tasks from the state file.
2. **Analyze Codebase:** Using your file search and read tools, analyze the codebase for the selected tasks.
3. Identify exactly which files need changes, existing patterns, cross-file dependencies, and exact line numbers.
4. **Save Findings:** Update the state file `phase: "ANALYZE"` and save a concise summary in `analysisFindings`.

## Phase 3: PLAN

1. Based on `analysisFindings`, create a zero-ambiguity implementation plan.
2. Specify exact file paths, line numbers, and what to replace.
3. Determine wave ordering (which files/tasks must be changed first).
4. **Save Plan:** Update the state file `phase: "PLAN"` and save the plan in `planSummary`.

## Phase 4: DECOMPOSE

1. Break down the plan into wave-based micro-tasks.
2. **Structure:**
   - Wave 1: independent files.
   - Wave 2: files depending on Wave 1, etc.
3. **Save Decompositions:** Update the state file `phase: "DECOMPOSE"` and write the `decompositions` object containing the waves and micro-tasks per task.

## Phase 5: EXECUTE

1. Process waves in order. For each wave:
   - Identify all files to edit in the current wave.
   - Apply the edits using your `replace_file_content` or `multi_replace_file_content` tools.
   - _Antigravity advantage:_ You can edit files directly without external clink calls.
   - Verify syntax (e.g., using a quick bash `npx tsc --noEmit` if appropriate, though use your judgment to avoid breaking the flow).
2. Mark completed micro-tasks as `"done"` in the state file.
3. Once all waves complete, update the state file `phase: "EXECUTE"`.

## Phase 6: REVIEW

1. Review the files you just modified against the severity checklist:
   - **CRITICAL:** `next/link` usage, `.parse()` instead of `.safeParse()`, missing `try/catch` in async Express routes, hardcoded secrets, `console.log`.
   - **HIGH:** Missing `key` in `.map()`, incorrect API response shapes, direct React state mutation, `as any`.
2. Record any findings in the state file under `reviewFindings` and set `phase: "REVIEW"`.

## Phase 7: FIX

1. If any CRITICAL or HIGH issues were found, immediately fix them using your file editing tools.
2. Maximum 2 fix cycles.
3. Update state file `phase: "FIX"` and mark issues as fixed.

## Phase 8: COMPLETE

1. For successfully executed tasks, call `mcp__taskmaster-ai__set_task_status(id, "done")`.
2. Log implementation notes using `mcp__taskmaster-ai__update_subtask`.
3. Clean up: Delete `.taskmaster/processor-state.json`.
4. Report the final session summary to the user.
