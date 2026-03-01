# Client Dashboard (Admin Dashboard)

## Project Overview

This project is a modern, professional full-stack admin dashboard application. It provides a multi-page experience with features like a dark mode theme, sidebar navigation, and various third-party integrations.

**Key Technologies:**
- **Frontend:** React 18, Vite, TypeScript, Tailwind CSS, Zustand (State Management), Radix UI, BlockSuite (Rich Text/Block Editor), and GSAP for animations.
- **Backend API:** Node.js, Express, TypeScript, Firebase Admin SDK.
- **Integrations:**
  - **Firebase:** Authentication, Firestore database, and Cloud Functions.
  - **Paymenter:** Dockerized billing and subscription management setup (MariaDB, Redis).
  - **Novu:** Notification infrastructure.
  - **Meilisearch:** Fast search engine.
  - **Google GenAI:** AI-assisted features (like brand asset generation and text color extraction).

## Project Structure

- `api/`: Express.js backend server code (`server.ts`, route handlers for proxy, admin, payments, notifications, drive, etc.).
- `src/`: React frontend source code (components, pages, hooks, stores).
- `paymenter/`: Configuration and volumes for the Paymenter Docker setup.
- `docker-compose.paymenter.yml`: Docker Compose configuration for the Paymenter service and its dependencies.
- `ecosystem.config.js`: PM2 configuration for deploying the API and frontend in production.
- `firebase.json` / `firestore.rules` / `storage.rules`: Firebase configuration and security rules.
- `package.json`: Project dependencies and scripts.

## Building and Running

**Prerequisites:** Node.js, Docker (for Paymenter), and a configured `.env` file (see `.env.local` or environment setup instructions).

### Core Commands

- **Install Dependencies:**
  ```bash
  npm install
  ```

- **Run Development Environment (Frontend + API):**
  ```bash
  npm run dev
  ```
  *(This uses `concurrently` to run Vite and the Express API server simultaneously.)*

- **Build for Production:**
  ```bash
  npm run build
  ```

- **Run Tests:**
  - Unit Tests (Jest): `npm run test`
  - E2E Tests (Playwright): `npm run test:e2e`
  - Test Watch Mode: `npm run test:watch`

### Paymenter Commands (Dockerized)

- **Start Paymenter:** `npm run paymenter:start`
- **Stop Paymenter:** `npm run paymenter:stop`
- **View Paymenter Logs:** `npm run paymenter:logs`

## Development Conventions

- **Language:** The project relies heavily on **TypeScript** across both the frontend React app and the backend Node.js API.
- **State Management:** Uses **Zustand** for global state on the frontend.
- **Styling:** **Tailwind CSS** combined with utility libraries like `clsx` and `tailwind-merge`.
- **API Routing:** The backend API uses standard Express routing with middleware for rate-limiting (`express-rate-limit`), security (`helmet`), and CORS.
- **Production Deployment:** Designed to be run via **PM2** (`ecosystem.config.js`) on a VPS, serving the built Vite files via a static server and running the Express API as a clustered Node.js application. Deployment documentation can be found in `DEPLOYMENT.md` and `DEPLOYMENT_RUNBOOK.md`.
- **Security:** Ensure environment variables (like API keys and Firebase credentials) are securely stored and never committed to version control. Reference `SECURITY.md` and `GITHUB_SECRETS_GUIDE.md` for best practices.
