---
description: Run the task-processor pipeline to discover, analyze, decompose, execute, and review pending tasks from Hamster (tryhamster.com).
---

# Task Processor Pipeline (Antigravity + Hamster)

**Overview:**
This workflow processes tasks from the Hamster cloud brief via the `task-master` CLI. The task details in Hamster are the **single source of truth** — they specify exactly which files to create/modify, acceptance criteria, and implementation approach.

**How you run this:**
As the Antigravity agent, you will step through these phases directly. You do not need to spawn subagents. You will act as the processor.

**Task Source:** Hamster cloud brief (authenticated via `task-master` CLI).
Tasks use IDs like `DES-1`, `DES-2`, etc.

## Pre-requisites

- **task-master CLI** must be installed: `npx -y task-master@latest`
- **Authenticated:** Run `npx task-master auth login <token> -y` if not already logged in.
- **Context set:** Run `npx task-master context <brief-url>` to point to the correct Hamster brief.
- Verify with: `npx task-master list` — you should see tasks.
- Project root: `c:/Users/Sami/client-dashboard`

## CLI Command Reference

| Action               | Command                                                  |
| -------------------- | -------------------------------------------------------- |
| List all tasks       | `npx task-master list`                                   |
| List with subtasks   | `npx task-master list --with-subtasks`                   |
| Show task details    | `npx task-master show <ID>`                              |
| Get next task        | `npx task-master next`                                   |
| Set status           | `npx task-master set-status --id=<ID> --status=<STATUS>` |
| Expand into subtasks | `npx task-master expand --id=<ID>`                       |
| Update task notes    | `npx task-master update-task --id=<ID> --prompt="..."`   |

## Reading CLI Output (IMPORTANT — Do Not Skip)

The `task-master` CLI renders output with Unicode box-drawing characters that **get garbled** in terminal tool responses. **NEVER try to parse task-master output directly from `command_status`.** Instead, always:

1. **Redirect output to a file:**
   ```powershell
   npx task-master show DES-1 > .taskmaster/des-1.txt 2>&1
   ```
2. **Read the saved file** with `view_file` to get clean, readable text.
3. **Use this pattern for every read command** (`show`, `next`, `list`):
   ```powershell
   npx task-master next > .taskmaster/next-result.txt 2>&1
   npx task-master list --with-subtasks > .taskmaster/task-list.txt 2>&1
   ```
4. After reading, you may delete the temp files or leave them for the COMPLETE phase cleanup.

> **Why:** The `command_status` tool truncates and garbles box-drawing chars (`╭─╮│╰`), causing infinite loops where you repeatedly re-run the same command trying to read the output. Saving to file and using `view_file` avoids this entirely.

// turbo-all

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

1. **Get Next Task:** Run `npx task-master next` to find the highest-priority unblocked task.
2. **Read Parent Task:** Run `npx task-master show <ID>` to get the title, description, and subtask list.
3. **Mark In-Progress:** Run `npx task-master set-status --id=<ID> --status=in-progress`.
4. **Initialize State:** Create/Update `.taskmaster/processor-state.json` with `phase: "DISCOVER"` and the selected task details.

## Phase 2: READ & ANALYZE SUBTASK DETAILS (Critical Step)

**Hamster subtasks contain the implementation instructions.** This phase reads all subtask details, identifies groupings, and builds a mental model before planning.

### Step 2a: Enumerate subtasks

1. From the parent task's `show` output, list **every subtask** with its ID, title, and status.
2. Note which subtasks are already `done` or `in-progress` — skip those.

### Step 2b: Read each subtask in detail

1. **For each pending subtask**, run `npx task-master show <SUBTASK-ID>` and save the output to `.taskmaster/<id>.txt`.
2. **Read each saved file** to extract:
   - **File to create/modify** (e.g., `api/searchConfig.ts`)
   - **Implementation approach** (exact attributes, functions, patterns)
   - **Acceptance criteria** (what must be true when done)
   - **Technical constraints** (what to avoid, what SDK methods to use)

### Step 2c: Identify logical groupings

Some subtasks overlap or target the same file/feature. Group them:

- Example: DES-5 and DES-20 both create `api/searchConfig.ts` → implement together.
- Example: DES-6 and DES-23 both define synonyms/stop words → implement together.
- Record these groupings in the state file as `subtaskGroups`.

### Step 2d: Update task_boundary

Use a `task_boundary` call like:

> **TaskName:** "Task Processor: Analyze and Plan DES-X"
> **TaskSummary:** "Read DES-X details from Hamster. It has N subtasks: DES-A (desc), DES-B (desc), ..."

This keeps the user informed of what was discovered before execution begins.

4. **Save Findings:** Update state file `phase: "ANALYZE"` with a summary of all subtask requirements and groupings.

## Phase 3: PLAN

1. Based on subtask details, determine execution order:
   - Which subtasks have no dependencies → execute first (Wave 1)
   - Which subtasks depend on others → execute after (Wave 2+)
2. Specify exact file paths and changes per wave.
3. **Save Plan:** Update state file `phase: "PLAN"`.

## Phase 4: EXECUTE

1. Process subtasks in dependency order. For each subtask:
   - Run `npx task-master set-status --id=<SUBTASK-ID> --status=in-progress`.
   - Write the code exactly as specified in the subtask's implementation details.
   - Verify syntax with `npx tsc --noEmit` (use judgment on when to check).
   - Run `npx task-master set-status --id=<SUBTASK-ID> --status=done`.
2. Update state file `phase: "EXECUTE"` once all subtasks are complete.

## Phase 5: REVIEW

1. Review the files you just modified against the severity checklist:
   - **CRITICAL:** `next/link` usage, `.parse()` instead of `.safeParse()`, missing `try/catch` in async Express routes, hardcoded secrets, `console.log`.
   - **HIGH:** Missing `key` in `.map()`, incorrect API response shapes, direct React state mutation, `as any`.
2. Check all acceptance criteria from subtask details are met.
3. Record findings in state file under `reviewFindings` and set `phase: "REVIEW"`.

## Phase 6: FIX

1. If any CRITICAL or HIGH issues were found, immediately fix them.
2. Maximum 2 fix cycles.
3. Update state file `phase: "FIX"`.

## Phase 7: COMPLETE

1. Mark parent task done: `npx task-master set-status --id=<ID> --status=done`.
2. Log implementation notes: `npx task-master update-task --id=<ID> --prompt="Implementation notes: ..."`.
3. **Clean up all temp files** to leave a clean slate for the next run:
   ```powershell
   Remove-Item -Path .taskmaster/processor-state.json -ErrorAction SilentlyContinue
   Remove-Item -Path .taskmaster/des*.txt -ErrorAction SilentlyContinue
   Remove-Item -Path .taskmaster/next-result.txt -ErrorAction SilentlyContinue
   Remove-Item -Path .taskmaster/task-list.txt -ErrorAction SilentlyContinue
   ```
   > **Why:** CLI output files and the processor state accumulate across runs. Removing them ensures the next `/task-processor` invocation starts fresh with no stale data.
4. Report the final session summary to the user.
