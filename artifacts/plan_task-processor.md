# Plan: Update Task-Processor Workflow for AI Agent Autopilot Integration

## Goal Description

Integrate the TaskMaster Autopilot TDD workflow (`autopilot_*` MCP tools) into the native Antigravity `task-processor.md` workflow, while maintaining the exact structural 8-phase pipeline (DISCOVER to COMPLETE) that currently exists.

## Proposed Changes

### [MODIFY] task-processor.md

The file `c:/Users/Sami/client-dashboard/.agents/workflows/task-processor.md` will be modified in the following ways to integrate the AI agent TDD loop without disrupting the `processor-state.json` outer batch loop.

- **Pre-requisites:** Add the requirement to have access to the `autopilot_*` MCP tools.
- **Phase 1 to Phase 4:** Remain essentially the same. The `processor-state.json` manages the high-level task batch.
- **Phase 5 (EXECUTE):** This phase will be completely overhauled.
  Instead of identifying files and replacing content manually directly:
  1. For each task in the wave, start the Autopilot loop: `autopilot_start { taskId, projectRoot }`.
  2. Implement a `while` loop equivalent via `autopilot_next`:
     - If `action === "generate_test"` (RED Phase): Write failing tests, run the test suite, and call `autopilot_complete_phase` reporting the parsed JSON results (where `failed > 0`).
     - If `action === "implement_code"` (GREEN Phase): Write implementation to satisfy the tests, run test suite, and call `autopilot_complete_phase` (where `failed === 0`).
     - If `action === "commit_changes"`: Call `autopilot_commit`.
- **Phase 6 & 7 (REVIEW/FIX):** Will remain as a supplemental human-like review of the changes applied during execution to catch semantic errors.
- **Phase 8 (COMPLETE):** Clean up the `.taskmaster/processor-state.json` and optionally check `autopilot_status`. Mention that TaskMaster handles setting the tasks to `done` under the hood when appropriate.

## Verification Plan

After updating the workflow file, I will view the file to ensure the structure (Phases 1-8) has not been structurally deformed and that the TDD Autopilot constraints correctly replace the old manual execution constraints.
