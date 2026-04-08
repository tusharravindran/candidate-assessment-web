# Candidate Assessment Web

Next.js frontend for the Candidate Assessment Platform. Provides two separate surfaces: a recruiter workspace for managing assessments and reviewing results, and a candidate session view driven by secure invitation tokens.

Backend API: [candidate-assessment-api](https://github.com/tusharravindran/candidate-assessment-api)

## Pages

| Route | Access | Purpose |
|---|---|---|
| `/` | Public | Landing page |
| `/recruiter/login` | Public | Recruiter sign in |
| `/recruiter/signup` | Public | Create organization + recruiter account |
| `/recruiter` | Auth-gated | Dashboard — stats, result search, manual review |
| `/recruiter/assessments` | Auth-gated | Assessment list — lifecycle management |
| `/recruiter/assessments/new` | Auth-gated | Create assessment |
| `/recruiter/assessments/:id` | Auth-gated | Assessment detail — question builder, publish/archive |
| `/recruiter/invitations` | Auth-gated | Send and manage candidate invitations |
| `/candidate/:token` | Token-only | Candidate timed test session |

## Recruiter Flow

1. **Sign up** — creates a new isolated organization (tenant)
2. **Create an assessment** — set title, time limit, passing score
3. **Add questions** — multiple choice, true/false, or free text; mark correct answer
4. **Publish** — assessment becomes immutable; invitations can now be sent
5. **Send invitations** — generate secure single-use links per candidate email
6. **Review results** — see scores, pass/fail, session status; submit manual reviews for free-text answers

## Candidate Flow

1. Recruiter sends candidate a link: `/candidate/:token`
2. Candidate sees assessment details and clicks **Start Assessment**
3. Timer counts down; answers autosave every 15 seconds
4. Candidate submits or timer auto-submits on expiry
5. Attempt is locked — no second attempt

## Local Setup

Requires the API running at `http://localhost:3001`.

```bash
npm install
npm run dev       # http://localhost:3000
```

With Docker (from the API repo root — starts both services):

```bash
docker-compose up --build
```

Environment variable:

```
NEXT_PUBLIC_API_URL=http://localhost:3001/api/v1
```

## Docker

Multi-stage build: deps → builder → runner (standalone output).

```bash
docker build -t candidate-assessment-web .
docker run -e NEXT_PUBLIC_API_URL=https://candidate-assessment-api.onrender.com/api/v1 -p 3000:3000 candidate-assessment-web
```

## Render Deployment

Deploy as a **Web Service** on Render:

| Setting | Value |
|---|---|
| Runtime | Node |
| Build command | `npm install && npm run build` |
| Start command | `node server.js` |
| Environment | `NEXT_PUBLIC_API_URL` → your deployed API URL |
| Plan | Free |

CORS is handled server-side in the API via `FRONTEND_URL`. Set `FRONTEND_URL` in the API service to match this service's Render URL.

## Tech Stack

- **Next.js 14** (App Router, TypeScript, standalone output)
- No component library — plain CSS with custom design system
- Auth stored in `localStorage` as a JWT; passed as `Authorization` header on every API request
- Recruiter routes protected by client-side redirect; candidate route is token-only (no auth)

## Project Structure

```
app/
  lib/
    api.ts          — fetch wrapper, ApiError class
    auth.tsx        — AuthContext, useAuth hook, signIn/signOut/signUp
  layout.tsx        — root layout (wraps AuthProvider)
  page.tsx          — public landing page
  recruiter/
    layout.tsx      — sidebar nav + auth guard
    page.tsx        — dashboard (stats + result search + manual review)
    login/          — sign in form
    signup/         — registration form
    assessments/    — list page
    assessments/new — create form
    assessments/[id]— detail + question builder
    invitations/    — invitation management
  candidate/[token] — timed test session (public, token-only)
```
