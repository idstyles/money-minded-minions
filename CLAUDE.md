# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Personal finance tracking app with AI-powered expense analysis. Users log expenses against a monthly budget and receive Azure OpenAI-driven advice on spending necessity and budget status.

## Commands

### Backend (run from `backend/`)
```bash
npm install
npm run dev       # nodemon hot-reload on port 5000
```

### Frontend (run from `frontend/`)
```bash
npm install
npm start         # React dev server on port 3000
npm run build     # Production bundle
npm test          # Jest (watch mode)
```

## Environment Setup

Backend requires `backend/.env`:
```
AZURE_OPENAI_API_KEY=...
AZURE_OPENAI_ENDPOINT=https://<resource>.openai.azure.com
AZURE_OPENAI_DEPLOYMENT=<deployment-name>
MONGO_URI=mongodb://localhost:27017/money-minded-minions
```

## Architecture

**Monorepo** with separate `frontend/` (React 19 + Create React App) and `backend/` (Express 5 + MongoDB/Mongoose) directories.

### Backend API (`backend/index.js`)

Two endpoints:

- `POST /add-expense` — persists expense to MongoDB, returns `{ totalSpent, percentage, status }` where status is `"Normal" | "Warning" | "Overspending"`
- `POST /analyze-expense-ai` — calls Azure OpenAI with a structured prompt, returns `{ category, necessity, budgetStatus, explanation }` as strict JSON

### AI Layer (`backend/ai/`)

- `azureOpenAi.js` — thin wrapper around the OpenAI SDK targeting Azure endpoints
- `prompts/financeAgent.txt` — system prompt defining expense classification rules (mandatory vs. discretionary) and enforcing JSON-only output (temperature 0.2, max tokens 200)

### Frontend (`frontend/src/App.js`)

Single-component React app using `useState`. Calls `http://localhost:5000` directly (hardcoded). No routing, no global state manager.

## Key Constraints

- Frontend URL to backend is hardcoded as `http://localhost:5000` — update both sides if the port changes.
- The AI prompt enforces a strict JSON schema; changes to `financeAgent.txt` must preserve that contract or `azureOpenAi.js` parsing will break.
- MongoDB must be running before starting the backend.
