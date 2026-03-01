# Gemini CLI Context: Client Dashboard

## Project Overview
This is a full-stack TypeScript client dashboard for managing projects, feedback, brands, and collaboration. It features Kanban boards, a feedback annotation tool, moodboards, payments, and calendar integration. 

**Tech Stack:** React 18, TypeScript, Vite, Firebase, Express (proxy server), TailwindCSS, Zustand, Lucide, GSAP, and BlockSuite.

## Architecture
- **Dual Servers:** The project runs a Vite dev server for the frontend (port 3000) and an Express API server (port 3001) concurrently. The API proxies requests and handles the feedback tool injection.
- **Dual Build System:** Builds two separate bundles: the main application and a standalone feedback widget (`dist/feedback.js`) injected into external websites.
- **Context Management:** React Contexts in `App.tsx` have a strict, mandatory nesting order (`NotificationHistoryProvider` -> `UserProvider` -> `AdminProvider` -> `DataProvider` -> `TimerProvider` -> `CalendarProvider` -> `SearchProvider`). Do not alter this order.
- **Routing:** Uses `HashRouter` (URLs contain `#`) for static hosting compatibility. Two distinct layouts exist (`/admin/*` for CMS, everything else for the main dashboard).

## Building and Running
- **Install Dependencies:** `npm install`
- **Start Development Servers:** `npm run dev` (Runs both Vite and Express concurrently). Both must be running for full functionality.
- **Run Unit Tests:** `npm test` or `npm run test:watch` (Jest).
- **Run E2E Tests:** `npm run test:e2e` (Playwright).
- **Production Build:** `npm run build` (Builds app and copies the feedback widget to `public/`).

## Development Conventions & Rules

### 1. Antigravity Artifact-First Protocol (CRITICAL)
This workspace enforces the Antigravity rules engine:
- **Planning First:** Before modifying any complex code in `src/`, you **MUST** generate a plan artifact at `artifacts/plan_[task_id].md`.
- **Evidence:** Save testing output logs to `artifacts/logs/`.
- **Visuals:** If modifying the UI/Frontend, acknowledge visual changes in the artifact description (e.g., "Generates Artifact: Screenshot").

### 2. Task Master AI Integration
The project uses "Task Master" for agentic workflow management.
- Interact with tasks using the provided MCP tools (e.g., `get_tasks`, `next_task`, `get_task`, `set_task_status`, `update_subtask`).
- **Never** manually edit `.taskmaster/tasks/tasks.json` or `.taskmaster/config.json`.
- Before starting implementation, check the task context, and upon completion, update the task status to `done`. Use `update_subtask` to log implementation notes.

### 3. General Coding Standards
- **Component Placement:** New components should be placed in their respective feature directories (e.g., `components/board/`, `components/feedback/`). Admin pages go in `pages/admin/`.
- **Security:** Current Firestore rules and API authentication are intentionally relaxed for development. Do not strictly lock them down unless explicitly requested.
- **Data Model:** Be aware that the `dataconnect/schema/schema.gql` contains boilerplate (movies/reviews) and does not reflect the actual Firestore data models defined in `types.ts`.
