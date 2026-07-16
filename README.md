# Intern DevOps Starter

A small monorepo for practicing Git, pull requests, reviews, and frontend/backend integration.

## Goal

Build a form that saves records through a REST API.

## Layout

```
frontend/  Vite + TypeScript single-page app
backend/   FastAPI + SQLite REST API
```

## API contract

The form sends:

```json
{ "name": "Ada", "email": "ada@example.com", "message": "Hello" }
```

| Method | Path | Purpose |
| --- | --- | --- |
| `POST` | `/records` | Save a form submission |
| `GET` | `/records` | List saved submissions |

The API runs on `http://localhost:8000`. The frontend runs on `http://localhost:5173`.

## Work split

- Backend: FastAPI app, SQLite persistence, API tests, CORS for the frontend.
- Frontend: form validation, API client, success/error states, record list.
- Both: agree changes to this contract in a PR before relying on them.

## Git workflow

1. Create a branch from `main`: `feature/frontend-form` or `feature/api-records`.
2. Make one focused change.
3. Open a pull request to `main`.
4. Address review comments and ensure checks pass.
5. Merge only after approval.

Do not commit directly to `main`.

## Later exercises

- Add CI to run frontend and backend checks on pull requests.
- Containerize both services with Docker.
- Add an environment-specific deployment configuration.