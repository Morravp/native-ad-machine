# Native Ad Machine

A full-stack native ad copywriting tool for ecommerce operators. Generates advertorial-style native ad copy using Claude AI, with brand management, global rules, and a format library.

---

## Stack

- **Frontend + Backend**: Next.js 16 (App Router)
- **Database**: Railway PostgreSQL
- **AI**: Anthropic Claude API (claude-sonnet-4-20250514)
- **Hosting**: Railway

---

## Setup: Step by Step

### 1. Create a Railway account and project

1. Go to [railway.app](https://railway.app) → sign up / log in
2. Click **New Project** → **Empty project**

### 2. Add a PostgreSQL database

1. Inside your Railway project → **+ New** → **Database** → **Add PostgreSQL**
2. Railway provisions a Postgres instance in ~30 seconds
3. Click the PostgreSQL service → **Variables** tab → copy the `DATABASE_URL` value (starts with `postgresql://`)

### 3. Run the database schema

1. In Railway → click your PostgreSQL service → **Data** tab → **Query**  
   *(or use any Postgres client with the `DATABASE_URL`)*
2. Paste the entire contents of `schema.sql` and run it

### 4. Get your Anthropic API key

1. Go to [console.anthropic.com](https://console.anthropic.com)
2. **API Keys** → Create Key → copy it

### 5. Run locally

```bash
cp .env.local.example .env.local
```

Edit `.env.local`:

```
DATABASE_URL=postgresql://...   ← paste your Railway DATABASE_URL
ANTHROPIC_API_KEY=sk-ant-...    ← paste your Anthropic key
```

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## Deploy to Railway

### 1. Deploy the app service

**Option A — GitHub (recommended)**

1. Push this project to a GitHub repo
2. In Railway → **+ New** → **GitHub Repo** → select your repo
3. Railway auto-detects Next.js and builds it

**Option B — Railway CLI**

```bash
npm install -g @railway/cli
railway login
railway link        # link to your project
railway up          # deploy
```

### 2. Add environment variables

In Railway → click your **app service** → **Variables** tab → **+ New Variable**:

| Variable | Value |
|---|---|
| `DATABASE_URL` | Copy from your Railway PostgreSQL service variables |
| `ANTHROPIC_API_KEY` | Your Anthropic API key |

> **Tip**: Railway can auto-inject the database URL. Click **+ New Variable** → **Add Reference** → select your PostgreSQL service → choose `DATABASE_URL`. This way it stays in sync automatically.

### 3. Get your public URL

Railway assigns a URL automatically (e.g. `https://native-ad-machine-production.up.railway.app`). Find it under your app service → **Settings** → **Networking** → **Public Networking**.

---

## Ad ID Format

`BADGE #[number] - [COUNTRY] - [DD/MM/YYYY]`

Example: `BADGE #2 - NL/BE - 16/05/2026`

---

## Features

| Page | What it does |
|---|---|
| Dashboard | Live stats, brand grid, recent ads |
| Brands | Create / edit / delete brands with uploaded docs |
| Brand Detail | Full brand info, docs list, ad history |
| Generator | Select brand → configure → stream generate with Claude |
| Ad Log | Full history of saved ads — click to view or copy |
| Global Rules | Copywriting rules applied to every single ad |
| Format Library | Upload advertorial examples for structural reference |

## File uploads

Uploaded files (brand docs, format examples, per-ad extras) have their text extracted server-side and stored directly in PostgreSQL. Supported formats: **.txt**, **.pdf**. The extracted text is fed into the Claude prompt automatically.

---

## Cost estimate

The app uses `claude-sonnet-4-20250514`. A typical 2000-token ad generation costs roughly **$0.003–$0.006** per ad.
