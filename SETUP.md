# 🌿 Digital Detach — Local Setup Guide

> The **frontend is already live** at **https://digital-detach.vercel.app/**  
> You only need to run the **backend** on your machine and tunnel it to the internet using Ngrok.

---

## How This Project Works

```
Your Browser / Phone
       │
       ▼
https://digital-detach.vercel.app   ← Hosted on Vercel (always on)
       │
       │  API calls via HTTPS
       ▼
https://dislike-film-unaudited.ngrok-free.dev  ← Ngrok static domain (tunnel)
       │
       │  forwards to
       ▼
http://localhost:8000   ← FastAPI backend running on YOUR machine
```

The frontend is deployed and always online. The backend (ML model + AI) runs locally on whoever's machine is hosting it, and Ngrok creates a permanent public HTTPS URL that the frontend uses to reach it.

---

## Prerequisites

Before starting, make sure you have:

- **Python 3.10+** — [Download here](https://www.python.org/downloads/)  
  ⚠️ During installation, **check "Add python.exe to PATH"** before clicking Install
- **Git** — [Download here](https://git-scm.com/)
- **Ngrok** — No account needed, no sign up required

---

## Step 1 — Clone the Repository

Open a terminal and run:

```bash
git clone https://github.com/dummy2408/digital-detach.git
cd digital-detach
```

---

## Step 2 — Set Up the Credentials

> ⚠️ **The `.env.local` file is NOT included in the repo** (it contains secret API keys and must never be committed to GitHub).  
> You need to create it manually using the credentials below.

Create a file at `frontend/.env.local` and paste the credentials from the **`CREDENTIALS.txt`** file you received privately:

```env
GEMINI_API_KEY=<from CREDENTIALS.txt>
NEXT_PUBLIC_SUPABASE_URL=<from CREDENTIALS.txt>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<from CREDENTIALS.txt>
NEXT_PUBLIC_API_URL=https://dislike-film-unaudited.ngrok-free.dev
```

> 💡 `CREDENTIALS.txt` is **not in the repo** for security reasons. The project owner will share it with you directly (via WhatsApp or email).

---

## Step 3 — Install Backend Dependencies

Navigate into the `backend` folder and install all Python packages:

```bash
cd backend
pip install -r requirements.txt
```

> This will install FastAPI, XGBoost, SHAP, Pandas, Gemini SDK, and all other required libraries.  
> It may take a few minutes the first time.

---

## Step 4 — Start the Backend Server

From inside the `backend` folder, run:

```bash
uvicorn api.index:app --port 8000
```

You should see output like:
```
INFO:     Uvicorn running on http://127.0.0.1:8000 (Press CTRL+C to quit)
```

> 🔴 **Keep this terminal window open.** The backend stops if you close it.

---

## Step 5 — Start the Ngrok Tunnel

Open a **brand new CMD window** (keep the backend one running). Run these 3 commands one by one:

> ✅ **No ngrok account or sign up needed** — just copy and paste the commands below.

### Command 1 — Install Ngrok

**On Windows:**
```
winget install ngrok
```

⚠️ After it finishes, **close this CMD window completely and open a fresh new one** — Windows won't recognise `ngrok` until you do this.

**On Mac:**
```
brew install ngrok
```

### Command 2 — Activate the Project's Ngrok Auth Token

In the new CMD window, run this exactly:

```
ngrok config add-authtoken 3FJ6zKtq9Zi54gPVuV6Upv3aDZH_79fhMXAg5LCnkGL6vjQKa
```

You should see: `Authtoken saved to configuration file`

### Command 3 — Start the Tunnel

```
ngrok http --domain=dislike-film-unaudited.ngrok-free.dev 8000
```

You should see:
```
Forwarding   https://dislike-film-unaudited.ngrok-free.dev -> http://localhost:8000
```

> 🔴 **Keep this CMD window open.** The tunnel stops the moment you close it.

---

## Step 6 — You're Live! 🎉

Once both the backend and ngrok are running:

1. Go to **https://digital-detach.vercel.app/** on any device
2. The website will automatically connect to your machine's backend through the ngrok tunnel
3. All AI predictions, ML models, and screenshot extraction will work end-to-end

---

## Recap — What Should Be Running

| What | Where | Command |
|---|---|---|
| FastAPI backend | Terminal 1 (inside `backend/`) | `uvicorn api.index:app --port 8000` |
| Ngrok tunnel | Terminal 2 (anywhere) | `ngrok http --domain=dislike-film-unaudited.ngrok-free.dev 8000` |
| Frontend | Already live on Vercel | — |

---

## Troubleshooting

| Problem | Fix |
|---|---|
| `pip` not found | Make sure Python was installed with "Add to PATH" checked |
| `ngrok: command not found` | Close and reopen your terminal after installing ngrok |
| `ModuleNotFoundError` on startup | Run `pip install -r requirements.txt` again |
| Website shows "Backend unavailable" | Make sure both terminals (uvicorn + ngrok) are still running |
| `shap` install fails | Try `pip install shap --no-build-isolation` |

---

## Project Structure (for reference)

```
digital-detach/
├── frontend/          ← Next.js app (deployed on Vercel)
│   ├── .env.local     ← ⚠️ YOU must create this (not in repo)
│   └── src/
├── backend/           ← FastAPI + ML backend (runs locally)
│   ├── requirements.txt
│   └── api/
│       ├── index.py   ← Main API routes
│       └── extract.py ← Screenshot extraction (Gemini Vision)
├── ml/
│   └── xgboost_model/ ← Trained ML model files (.pkl)
└── docs/              ← Project documentation
```
