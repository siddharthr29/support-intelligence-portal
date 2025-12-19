# Production Deployment Guide

## Overview
This guide covers deploying the Support Intelligence Dashboard to Vercel (frontend) and a Node.js hosting provider (backend).

## Prerequisites
- Vercel account
- Supabase PostgreSQL database (already configured)
- Freshdesk API key (read-only)
- Firebase project for authentication

---

## Frontend Deployment (Vercel)

### 1. Connect Repository
1. Go to [vercel.com](https://vercel.com) and sign in
2. Click "Add New Project"
3. Import your GitHub repository
4. Select the `frontend` directory as the root

### 2. Configure Environment Variables
In Vercel project settings → Environment Variables, add:

| Variable | Value | Description |
|----------|-------|-------------|
| `NEXT_PUBLIC_API_URL` | `https://your-backend-url.com` | Backend API URL |
| `NEXT_PUBLIC_FIREBASE_API_KEY` | `your-firebase-api-key` | Firebase public key |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | `your-project.firebaseapp.com` | Firebase auth domain |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | `your-project-id` | Firebase project ID |

### 3. Build Settings
- **Framework Preset**: Next.js
- **Build Command**: `npm run build`
- **Output Directory**: `.next`
- **Install Command**: `npm install`

### 4. Deploy
Click "Deploy" - Vercel will automatically build and deploy.

---

## Backend Deployment

### Option A: Vercel Serverless (Recommended for simplicity)

1. Create a separate Vercel project for the backend
2. Select the `backend` directory as root
3. Add environment variables (see below)
4. Deploy

### Option B: Koyeb (Recommended - Free & Always-On)

Koyeb offers a free nano instance that runs 24/7 without sleeping. Perfect for the weekly scheduler.

1. Go to [koyeb.com](https://koyeb.com) and sign up with GitHub
2. Click **"Create App"** → Select **"GitHub"**
3. Configure:
   - **Branch**: `main`
   - **Root directory**: `backend`
   - **Build command**: `npm install && npm run build`
   - **Run command**: `npm start`
   - **Port**: `3000`
   - **Instance type**: **Free (nano)**
4. Add environment variables (see below)
5. Click **Deploy**

Your backend URL will be: `https://your-app-name.koyeb.app`

### Option C: Railway/Render/Fly.io (Alternative)

For the weekly scheduler to work properly, use a platform that supports long-running processes:

1. Connect your repository
2. Set the root directory to `backend`
3. Set build command: `npm run build`
4. Set start command: `npm start`
5. Add environment variables

### Backend Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `NODE_ENV` | Yes | Set to `production` |
| `PORT` | Yes | Usually `3000` or provided by platform |
| `HOST` | Yes | `0.0.0.0` |
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `FRESHDESK_DOMAIN` | Yes | e.g., `avni.freshdesk.com` |
| `FRESHDESK_API_KEY` | Yes | Read-only API key |
| `FIREBASE_API_KEY` | Yes | Firebase API key |
| `FIREBASE_AUTH_DOMAIN` | Yes | Firebase auth domain |
| `FIREBASE_PROJECT_ID` | Yes | Firebase project ID |
| `METABASE_URL` | Yes | Metabase instance URL |
| `METABASE_USERNAME` | Yes | Metabase login email |
| `METABASE_PASSWORD` | Yes | Metabase password |
| `METABASE_RFT_QUESTION_ID` | Yes | RFT question ID |
| `GROQ_API_KEY` | Optional | For AI chatbot |
| `GOOGLE_SHEETS_URL` | Optional | Google Apps Script URL |
| `FRONTEND_URL` | Yes | Frontend URL for CORS |
| `ALLOWED_ORIGINS` | Optional | Additional CORS origins (comma-separated) |
| `CONFIG_ENCRYPTION_KEY` | Yes | 32-char key for encrypting secrets |

---

## CORS Configuration

The backend automatically handles CORS based on environment:

- **Development**: All origins allowed
- **Production**: Only `FRONTEND_URL` and `ALLOWED_ORIGINS` allowed

To add multiple frontend URLs (e.g., preview deployments):
```
ALLOWED_ORIGINS=https://preview-1.vercel.app,https://preview-2.vercel.app
```

---

## Dynamic Configuration (Settings Page)

The app supports changing credentials at runtime via the Settings page:

1. Navigate to `/settings` in the dashboard
2. Update any credential (Freshdesk, Metabase, etc.)
3. Click "Save" with confirmation
4. Changes take effect immediately (no restart needed)

**How it works:**
- Credentials are stored encrypted in the database
- The `secure-config` service manages encryption/decryption
- Config cache is cleared on update, forcing reload
- All changes are logged for audit

---

## Security Checklist

- [ ] Set `NODE_ENV=production`
- [ ] Set strong `CONFIG_ENCRYPTION_KEY` (32+ characters)
- [ ] Use HTTPS for all URLs
- [ ] Verify CORS is configured correctly
- [ ] Ensure Freshdesk API key is read-only
- [ ] Enable Firebase Authentication
- [ ] Review rate limiting settings

---

## Database Setup

The app uses Supabase PostgreSQL. The schema is managed by Prisma.

### Initial Setup
```bash
cd backend
npx prisma migrate deploy
```

### Generate Prisma Client
```bash
npx prisma generate
```

---

## Monitoring

### Health Check
```
GET /health
```

Returns:
```json
{
  "status": "ok",
  "timestamp": "2025-12-19T...",
  "system": "Freshdesk Weekly Support Intelligence Platform",
  "mode": "READ-ONLY",
  "scheduler": {
    "running": true,
    "jobInProgress": false
  }
}
```

### Error Logs
View error logs at `/error-logs` in the dashboard or via API:
```
GET /api/error-logs
```

---

## Troubleshooting

### CORS Errors
- Verify `FRONTEND_URL` matches exactly (including protocol)
- Check `ALLOWED_ORIGINS` for preview URLs
- Ensure no trailing slashes

### Database Connection Issues
- Verify `DATABASE_URL` is correct
- Check if IP is whitelisted in Supabase
- Ensure SSL mode is enabled for production

### Build Failures
- Run `npm run build` locally first
- Check for TypeScript errors
- Verify all dependencies are installed

### Scheduler Not Running
- Vercel serverless functions have timeout limits
- Use Railway/Render for long-running scheduler
- Check logs for scheduler status

---

## Support

For issues, check:
1. `/error-logs` page in dashboard
2. Vercel/hosting provider logs
3. Supabase database logs
