# University Resource Share (Full Stack)

This repository contains:

- `frontend` (Vite + React) at repo root
- `backend` (Node.js + Express + PostgreSQL) in `backend/`

The app supports login/register, upload/search resources, profile analytics, and AI study assistance.

## 1) Prerequisites

- Node.js 18+
- PostgreSQL 14+ (or compatible)

## 2) Database Setup

Create database (name can be changed in env):

```sql
CREATE DATABASE psdhospital_management;
```

Note: the backend auto-creates required tables on startup:

- `auth_users`
- `resource_uploads`
- `resource_reviews`
- `resource_study_insights`

## 3) Backend Setup

```powershell
cd backend
copy .env.example .env
npm install
npm start
```

Backend runs by default at:

- `http://localhost:3000`

## 4) Frontend Setup

From repository root:

```powershell
copy .env.example .env
npm install
npm run dev
```

Frontend runs by default at:

- `http://localhost:5173`

## 5) Important Environment Files

Frontend:

- `.env` (from `.env.example`)
- `VITE_API_BASE=http://localhost:3000`

Backend:

- `backend/.env` (from `backend/.env.example`)
- Set DB credentials and JWT secret

## 6) Quick Run Checklist

1. PostgreSQL running
2. Backend `.env` configured
3. Backend started on `3000`
4. Frontend `.env` configured
5. Frontend started on `5173`

If backend is not running, UI opens but API-dependent features (login/upload/search/profile API) will fail.

## 7) Public Deployment (Render)

This repo includes `render.yaml` for one-click full-stack deployment:

- static frontend (`dropcode-web`)
- Node backend API (`dropcode-api`)
- PostgreSQL database (`dropcode-db`)

Steps:

1. Push this repo to GitHub
2. In Render: **New +** -> **Blueprint**
3. Select this GitHub repo
4. Render reads `render.yaml` and creates all services
5. Wait for deployment to complete

After deploy:

- frontend gets a public URL (works for anyone)
- backend gets a public URL
- frontend uses backend URL via `VITE_API_BASE`

Note:

- `backend/uploads` is local disk storage; on free cloud dynos this can be ephemeral. For permanent file storage, use S3/Cloudinary later.
