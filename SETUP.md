# 🛡️ CodeGuard AI — Complete Setup Guide

## Architecture Overview

```
┌─────────────┐     ┌──────────────┐     ┌──────────────┐
│   Frontend   │────▶│   Backend    │────▶│   Gemini AI  │
│  (Vite+React)│     │  (Express)   │     │  1.5 Pro     │
│  Port 5173   │     │  Port 3001   │     │              │
└──────┬───────┘     └──────┬───────┘     └──────────────┘
       │                    │
       │    ┌───────────────┘
       │    ▼
       │  ┌──────────────┐
       └─▶│   Supabase   │
          │  (PostgreSQL) │
          │  Auth + DB    │
          └──────────────┘
```

## Prerequisites

- **Node.js** 18+ and npm 9+
- **Google Gemini API Key** — [Get here](https://aistudio.google.com/apikey)
- **Supabase Account** — [Sign up here](https://supabase.com)

---

## Step 1: Clone & Install

```bash
# Clone the repository
git clone <your-repo-url>
cd codeguard-ai

# Install frontend dependencies
npm install

# Install backend dependencies
cd server
npm install
cd ..
```

---

## Step 2: Set Up Supabase Database

### 2.1 Create a Supabase Project

1. Go to [supabase.com/dashboard](https://supabase.com/dashboard)
2. Click **"New Project"**
3. Enter a project name (e.g., `codeguard-ai`)
4. Set a strong database password
5. Choose the closest region
6. Click **"Create new project"**
7. Wait for the project to finish provisioning (~2 minutes)

### 2.2 Run the Database Schema

1. In your Supabase dashboard, go to **SQL Editor** (left sidebar)
2. Click **"New Query"**
3. Copy the ENTIRE contents of `SUPABASE_SCHEMA.sql` from the project root
4. Paste it into the SQL editor
5. Click **"Run"** (or press Ctrl+Enter)
6. You should see "Success" messages for all statements

> **⚠️ If you already ran the old schema:** Re-run the new `SUPABASE_SCHEMA.sql`. It drops old policies, adds a missing INSERT policy on users, and backfills profiles for existing auth users. This is safe to re-run.

### 2.3 Get Your Supabase Credentials

1. Go to **Settings** → **API**
2. Copy these values:
   - **Project URL** → `https://xxxxx.supabase.co`
   - **anon public** key → `eyJhbGci...` (safe for frontend)
   - **service_role** key → `eyJhbGci...` (backend only, keep secret!)

### 2.4 Configure Email Auth (Optional but Recommended)

1. Go to **Authentication** → **Providers**
2. Ensure **Email** is enabled
3. Under **Email Templates**, you can customize the confirmation email
4. For development, you can disable "Confirm email" in **Settings**:
   - Go to **Authentication** → **Settings**
   - Toggle OFF **"Enable email confirmations"** (for testing only!)

---

## Step 3: Get Google Gemini API Key

1. Go to [Google AI Studio](https://aistudio.google.com/apikey)
2. Click **"Create API Key"**
3. Select your Google Cloud project (or create one)
4. Copy the API key

---

## Step 4: Configure Environment Variables

### 4.1 Frontend (root directory)

```bash
# Create .env from template
cp .env.example .env
```

Edit `.env` and fill in your values:

```env
VITE_API_URL=http://localhost:3001
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

### 4.2 Backend (server directory)

```bash
# Create server/.env from template
cp server/.env.example server/.env
```

Edit `server/.env` and fill in your values:

```env
PORT=3001
NODE_ENV=development
FRONTEND_URL=http://localhost:5173
GEMINI_API_KEY=your-gemini-api-key-here
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
```

---

## Step 5: Run the Application

### Development Mode (Local)

You need **two terminal windows**:

**Terminal 1 — Backend:**
```bash
cd server
npm run dev
```
You should see:
```
╔══════════════════════════════════════════╗
║   🛡️  CodeGuard AI API Server           ║
║   Running on http://localhost:3001       ║
║                                          ║
║   Gemini AI:  ✅ Connected               ║
║   Supabase:   ✅ Connected               ║
╚══════════════════════════════════════════╝
```

**Terminal 2 — Frontend:**
```bash
npm run dev
```
Open [http://localhost:5173](http://localhost:5173) in your browser.

### Production Build

```bash
# Build frontend
npm run build
# Output: dist/index.html (single file)

# Start backend in production
cd server
NODE_ENV=production node index.js
```

---

## Step 6: Deploy

### Frontend → Vercel

1. Push your code to GitHub
2. Go to [vercel.com](https://vercel.com) → **"New Project"**
3. Import your GitHub repository
4. Configure:
   - **Root Directory:** `.` (root)
   - **Framework Preset:** Vite
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
5. Add environment variables:
   - `VITE_API_URL` = `https://your-backend.onrender.com`
   - `VITE_SUPABASE_URL` = your Supabase URL
   - `VITE_SUPABASE_ANON_KEY` = your Supabase anon key
6. Click **"Deploy"**

### Backend → Render

1. Go to [render.com](https://render.com) → **"New"** → **"Web Service"**
2. Connect your GitHub repository
3. Configure:
   - **Root Directory:** `server`
   - **Build Command:** `npm install`
   - **Start Command:** `node index.js`
   - **Environment:** Node
4. Add environment variables:
   - `PORT` = `10000` (Render provides this)
   - `NODE_ENV` = `production`
   - `FRONTEND_URL` = `https://your-app.vercel.app`
   - `GEMINI_API_KEY` = your Gemini API key
   - `SUPABASE_URL` = your Supabase URL
   - `SUPABASE_SERVICE_ROLE_KEY` = your Supabase service role key
5. Click **"Create Web Service"**

### Database → Supabase

Already set up in Step 2! No additional deployment needed.

---

## Step 7: Update CORS for Production

After deploying, update `server/.env` (or Render env vars):

```env
FRONTEND_URL=https://your-actual-vercel-app.vercel.app
```

And update the CORS origin list in `server/index.js` if needed.

---

## Features & How They Work

| Feature | Implementation |
|---------|---------------|
| **AI Code Review** | Gemini 3 Flash Preview with structured system prompt |
| **Auth (Sign Up/In)** | Supabase Auth with email/password |
| **Dashboard** | Stats, review history, expand to view code + AI feedback |
| **Credit System** | Server-side daily count (5 free/day) |
| **Ghost Mode** | Frontend toggle → backend skips DB save |
| **Chat with AI** | Gemini chat with review context |
| **Sample Codes** | Pre-loaded buggy code for 4 languages |
| **Monaco Editor** | Full VS Code-like editing experience |
| **Markdown Review** | Rendered AI response with copy support |
| **Auto Profile** | Backend creates missing user profiles automatically |

### User Flow
```
Landing Page → Sign In / Sign Up → Dashboard → New Review → Editor
                  ↑                    ↓              ↑
                  └────── Sign Out ←───┘──────────────┘
```
- Dashboard shows all past reviews, stats, credits, and quick actions
- Click any review to expand and view the code + AI analysis
- Click the external link icon to re-open a review in the editor

---

## API Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/health` | No | Health check |
| GET | `/api/credits` | Yes | Get remaining credits |
| POST | `/api/review` | Yes | Submit code for AI review |
| POST | `/api/chat` | Yes | Chat with AI about a review |
| GET | `/api/history` | Yes | Get review history |
| DELETE | `/api/reviews/:id` | Yes | Delete a review |

All authenticated endpoints require: `Authorization: Bearer <supabase-access-token>`

---

## Troubleshooting

### "Backend not connected" error
- Ensure the backend is running on the correct port
- Check `VITE_API_URL` in your frontend `.env`
- Verify CORS settings in `server/index.js`

### "Invalid token" error
- User session may have expired. Sign out and sign in again.
- Check that Supabase URL and keys are correct

### "AI analysis failed" error
- Verify `GEMINI_API_KEY` is set in `server/.env`
- Check that you have Gemini API quota remaining
- Look at server console for detailed error messages

### Supabase connection error
- Verify `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are correct
- Ensure the database schema has been run (Step 2.2)
- Check that RLS policies are set up correctly

### Build fails
- Run `npm install` to ensure all dependencies are installed
- Delete `node_modules` and run `npm install` again
- Check that `.env` files exist with proper values

---

## Project Structure

```
codeguard-ai/
├── src/                        # Frontend (React + Vite)
│   ├── lib/
│   │   ├── supabase.ts        # Supabase client
│   │   └── api.ts             # API service layer
│   ├── contexts/
│   │   └── AuthContext.tsx     # Auth state management
│   ├── pages/
│   │   ├── LandingPage.tsx    # Marketing landing page
│   │   ├── AuthPage.tsx       # Sign in / Sign up
│   │   └── EditorPage.tsx     # Code editor + AI review
│   ├── data/
│   │   └── sampleCodes.ts     # Sample buggy code snippets
│   ├── App.tsx                # Root component with routing
│   ├── main.tsx               # Entry point
│   ├── index.css              # Global styles + Tailwind
│   └── vite-env.d.ts          # TypeScript env declarations
├── server/                     # Backend (Express)
│   ├── index.js               # All routes + Gemini integration
│   ├── package.json           # Backend dependencies
│   └── .env.example           # Backend env template
├── SUPABASE_SCHEMA.sql         # Database schema + RLS
├── .env.example                # Frontend env template
├── SETUP.md                    # This file
├── package.json                # Frontend dependencies
└── vite.config.ts              # Vite configuration
```

---

## Tech Stack

- **Frontend:** React 19, TypeScript, Vite, Tailwind CSS 4, Framer Motion, Monaco Editor
- **Backend:** Node.js, Express, @google/generative-ai, @supabase/supabase-js
- **Database:** Supabase (PostgreSQL) with Row Level Security
- **AI Engine:** Google Gemini 3 Flash Preview
- **Icons:** Lucide React
- **Deployment:** Vercel (frontend) + Render (backend) + Supabase (database)
