<div align="center">

<img src="https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react" />
<img src="https://img.shields.io/badge/TypeScript-5.9-3178C6?style=for-the-badge&logo=typescript" />
<img src="https://img.shields.io/badge/Tailwind_CSS-4-06B6D4?style=for-the-badge&logo=tailwindcss" />
<img src="https://img.shields.io/badge/Express.js-4-000000?style=for-the-badge&logo=express" />
<img src="https://img.shields.io/badge/Supabase-PostgreSQL-3FCF8E?style=for-the-badge&logo=supabase" />
<img src="https://img.shields.io/badge/Gemini_1.5_Pro-AI-4285F4?style=for-the-badge&logo=google" />

<br /><br />

# 🛡️ CodeGuard AI

### **AI-Powered Code Review & Security Analysis Platform**

*Ship secure code with confidence. Detect bugs, vulnerabilities, and performance issues before they reach production.*

<br />

[🚀 Live Demo](#-live-demo) · [✨ Features](#-features) · [🛠️ Tech Stack](#-tech-stack) · [📸 Screenshots](#-screenshots) · [⚡ Quick Start](#-quick-start) · [🏛️ Architecture](#-architecture)

<br /><br />

</div>

---

## 🌟 Overview

**CodeGuard AI** is a full-stack web application that acts as your **Lead Software Architect and Security Engineer**. Paste any code, and the AI instantly analyzes it for bugs, security vulnerabilities, performance bottlenecks, and architectural flaws — then provides a complete optimized solution you can copy directly into your project.

<div align="center">

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   Frontend    │────▶│   Backend    │────▶│  Gemini AI   │
│  React + Vite │     │   Express    │     │  1.5 Pro     │
└──────┬───────┘     └──────┬───────┘     └──────────────┘
       │                    │
       └──────────▶ ┌──────────────┐
                    │   Supabase   │
                    │  PostgreSQL  │
                    └──────────────┘
```

</div>

---

## 🚀 Live Demo

Live URL = 

---

## ✨ Features

### 🔍 AI Code Review
- **Gemini 3 Flash Preview** analyzes code with a security-engineer persona
- Structured Markdown output: Issues → Security Risks → Optimized Solution → Architecture Tips
- Supports **15+ programming languages**

### 💬 Conversational Chat
- ChatGPT-like follow-up chat after every review
- Context-aware — AI remembers your code and previous findings
- Ask about fixes, alternatives, best practices

### 👻 Ghost Mode
- Privacy toggle — when ON, code is analyzed but **never stored** in the database
- Unlimited reviews in Ghost Mode (no credit deduction)

### 📊 Dashboard
- Stats: Total reviews, critical issues found, languages used, credits remaining
- Full review history with expand-to-view code + AI analysis
- ChatGPT-style sidebar for quick navigation between reviews

### 🔐 Security
- Supabase Auth (email/password)
- Row Level Security (RLS) — users can only access their own data
- JWT token-based API authentication
- Server-side credit validation

### 🎨 Design
- **Midnight Gold** aesthetic — dark charcoal with metallic gold accents
- Glassmorphism cards with gold glow effects
- Particle canvas background animation
- Framer Motion entrance animations
- Fully responsive (mobile + desktop)

---

## 🛠️ Tech Stack

| Category | Technology |
|----------|-----------|
| **Frontend** | React 19, TypeScript, Vite, Tailwind CSS 4 |
| **Animations** | Framer Motion |
| **Code Editor** | Monaco Editor (@monaco-editor/react) |
| **Icons** | Lucide React |
| **AI Engine** | Google Gemini 3 Flash Preview |
| **Backend** | Node.js, Express 4 |
| **Database** | Supabase (PostgreSQL) |
| **Auth** | Supabase Auth with RLS |
| **Deployment** | Vercel (frontend) + Render (backend) |

---

## 📸 Screenshots

### Landing Page
> High-conversion landing page with particle background, animated code preview, bento feature grid, security gauge, pricing, testimonials, FAQ accordion

### Auth Page
> Glassmorphism sign in/sign up with email, password, username — Supabase Auth

### Workspace (ChatGPT-style)
> Left sidebar with review history + new review button + user menu
> Center: Full Monaco code editor + AI review panel + chat interface

### Dashboard
> Stats cards, quick actions, review history table with expand-to-view

---

## ⚡ Quick Start

### Prerequisites
- Node.js 18+ and npm 9+
- [Google Gemini API Key](https://aistudio.google.com/apikey)
- [Supabase Account](https://supabase.com)

### 1. Clone & Install
```bash
git clone https://github.com/Owais-Ahmed-Siddiqui
cd codeguard-ai

# Frontend
npm install

# Backend
cd server
npm install
cd ..
```

### 2. Set Up Supabase
1. Create a new project at [supabase.com/dashboard](https://supabase.com/dashboard)
2. Go to **SQL Editor** → **New Query**
3. Copy and run the entire contents of `SUPABASE_SCHEMA.sql`
4. Go to **Settings → API** and copy:
   - Project URL
   - anon public key
   - service_role key

### 3. Configure Environment

**Frontend** (root `.env`):
```env
VITE_API_URL=http://localhost:3001
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

**Backend** (`server/.env`):
```env
PORT=3001
GEMINI_API_KEY=your-gemini-key
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
FRONTEND_URL=http://localhost:5173
```

### 4. Run

**Terminal 1 — Backend:**
```bash
cd server
npm run dev
```

**Terminal 2 — Frontend:**
```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173)

---

## 🏛️ Architecture

### Project Structure
```
codeguard-ai/
├── src/                          # Frontend (React + Vite)
│   ├── lib/
│   │   ├── supabase.ts          # Supabase client init
│   │   └── api.ts               # API service layer
│   ├── contexts/
│   │   └── AuthContext.tsx       # Auth state (user, session, signIn, signUp, signOut)
│   ├── pages/
│   │   ├── LandingPage.tsx      # Marketing landing page
│   │   ├── AuthPage.tsx         # Sign in / Sign up
│   │   ├── Workspace.tsx        # ChatGPT-style layout (sidebar + main)
│   │   ├── DashboardPage.tsx    # Stats & review history
│   │   └── EditorPage.tsx       # Monaco editor + AI review + chat
│   ├── data/
│   │   └── sampleCodes.ts       # 4 buggy sample codes (JS, Python, Java, C++)
│   ├── App.tsx                  # Root: routing + auth persistence
│   ├── main.tsx                 # Entry point
│   ├── index.css                # Tailwind + custom styles
│   └── vite-env.d.ts            # TypeScript env declarations
│
├── server/                       # Backend (Express)
│   ├── index.js                 # All routes + Gemini integration
│   ├── package.json             # Backend dependencies
│   └── .env.example             # Backend env template
│
├── SUPABASE_SCHEMA.sql           # Full DB schema with RLS + triggers
├── .env.example                  # Frontend env template
├── .gitignore
├── SETUP.md                      # Detailed setup guide
├── README.md                     # This file
├── package.json                  # Frontend dependencies
└── vite.config.ts                # Vite configuration
```

### Database Schema
```sql
users (id, username, email, daily_count, last_review_date, plan)
  │
  ├── reviews (id, user_id, code, language, ai_feedback JSONB, created_at)
  │     │
  │     └── chats (id, review_id, role, content, created_at)
  │
  └── RLS: Users can only CRUD their own data
```

### API Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/api/health` | No | Health check + service status |
| `GET` | `/api/credits` | Yes | Get user's remaining credits |
| `POST` | `/api/review` | Yes | Submit code for AI review |
| `POST` | `/api/chat` | Yes | Chat with AI about a review |
| `GET` | `/api/history` | Yes | Get review history + stats |
| `DELETE` | `/api/reviews/:id` | Yes | Delete a review |

### User Flow
```
Landing Page
    │
    ├── [Get Started] → Auth Page (if not logged in)
    │                       │
    │                       └── [Sign In/Up] → Workspace
    │
    └── [Get Started] → Workspace (if logged in)
                            │
                            ├── Sidebar: Review History
                            ├── [New Review] → Editor
                            ├── [Click Review] → Editor (pre-filled)
                            └── [User Menu] → Dashboard / Sign Out
```

### AI Persona
The AI is instructed to act as a **Lead Software Architect and Security Engineer** with structured output:

```
## 🚩 Issues Found        → Severity badges, line numbers, impact analysis
## 🛡️ Security Risks       → OWASP table, CVSS scores, security score
## ✅ Optimized Solution    → Complete corrected code with explanations
## 💡 Architecture Tips     → 5-8 actionable recommendations
```

---

## 🚢 Deployment

### Vercel (Frontend)
1. Import GitHub repo → Framework: **Vite**
2. Build Command: `npm run build` → Output: `dist`
3. Env vars: `VITE_API_URL`, `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`

### Render (Backend)
1. New Web Service → Root Directory: **server**
2. Build: `npm install` → Start: `node index.js`
3. Env vars: `GEMINI_API_KEY`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `FRONTEND_URL`

### Post-Deploy
Copy Render URL → Update `VITE_API_URL` on Vercel → Redeploy frontend.

---

## 🧑‍💻 Credits

**Designed & Developed by Owais Ahmed**
**Roll No: 2467-2024**

Built with ❤️ using React, Tailwind CSS, Gemini AI, and Supabase.

---

## 📄 License

This project is for educational and portfolio purposes. All rights reserved.

<div align="center">
<br />

**[⬆ Back to Top](#-️-codeguard-ai)**

</div>
