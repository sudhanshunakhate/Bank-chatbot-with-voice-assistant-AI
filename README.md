# FinAdvisor — Smart expense & AI financial advisor

Full-stack demo: **FastAPI** (Python, JWT auth, SQLAlchemy, scikit-learn intent model, optional OpenAI) and **React + Vite** UI with a light, dashboard-style layout.

## Prerequisites

- Python 3.11+
- Node.js 18+

## Backend

```powershell
cd backend
pip install -r requirements.txt
uvicorn main:app --reload --host 127.0.0.1 --port 8000
```

- API: `http://127.0.0.1:8000`
- Health: `GET /health`
- SQLite database file: `backend/finadvisor.db` (created on first run)

Optional `.env` in `backend/`:

- `SECRET_KEY` — JWT signing secret
- `OPENAI_API_KEY` — if set, chat replies are enriched via OpenAI `gpt-4o-mini`
- `CORS_ORIGINS` — comma-separated origins (default includes Vite dev server)

## Frontend

```powershell
cd frontend
npm install
npm run dev
```

Open `http://127.0.0.1:5173`. The dev server proxies `/api` to the backend on port 8000.

To point the UI at a remote API instead, set `VITE_API_URL` (for example `https://your-api.example.com`) and rebuild.

## Try it

1. Register a user (starts with a simulated **₹10,000** balance).
2. Add **expenses** with categories — charts and AI spending answers use this data.
3. Register a **second** user in another browser (or after logout) to test **transfers** by email.
4. Open **AI Advisor** and ask natural questions (balance, transactions, spending, savings, fraud).

## Project layout

- `backend/` — FastAPI app, routes, services (`ai_engine`, `fraud_detection`), SQLite models
- `frontend/` — React UI: dashboard, transactions, expenses, advisor chat, profile
