# Render Deployment Guide

## Step 1: Deploy Backend to Render

### 1.1 Sign Up & Connect GitHub
1. Go to [render.com](https://render.com)
2. Click **"Get Started for Free"**
3. Sign up with **GitHub** (no credit card required)
4. Authorize Render to access your repositories

### 1.2 Create New Web Service
1. Click **"New +"** → **"Web Service"**
2. Connect repository: `siddharthr29/support-intelligence-portal`
3. Configure:

| Setting | Value |
|---------|-------|
| **Name** | `avni-support-backend` |
| **Region** | Singapore (closest to India) |
| **Branch** | `main` |
| **Root Directory** | `backend` |
| **Runtime** | Node |
| **Build Command** | `npm install && npm run build` |
| **Start Command** | `npm start` |
| **Instance Type** | **Free** |

### 1.3 Add Environment Variables

Click **"Environment"** tab and add these variables:

```bash
NODE_ENV=production
PORT=3000
HOST=0.0.0.0

# Database (Supabase)
DATABASE_URL=postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres

# Freshdesk
FRESHDESK_DOMAIN=avni.freshdesk.com
FRESHDESK_API_KEY=your-freshdesk-api-key

# Firebase
FIREBASE_API_KEY=your-firebase-api-key
FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
FIREBASE_PROJECT_ID=your-project-id

# Metabase
METABASE_URL=https://your-metabase.com
METABASE_USERNAME=your-email
METABASE_PASSWORD=your-password
METABASE_RFT_QUESTION_ID=123

# Frontend URL (update after Vercel deployment)
FRONTEND_URL=https://your-frontend.vercel.app

# Security
CONFIG_ENCRYPTION_KEY=your-32-character-random-string

# Optional: Google Sheets
GOOGLE_SHEETS_URL=https://script.google.com/macros/s/xxx/exec

# Optional: Discord
DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/xxx
```

### 1.4 Deploy
1. Click **"Create Web Service"**
2. Wait for build to complete (5-10 minutes)
3. Your backend URL will be: `https://avni-support-backend.onrender.com`

### 1.5 Verify Deployment
Test the health endpoint:
```bash
curl https://avni-support-backend.onrender.com/health
```

Expected response:
```json
{
  "status": "ok",
  "system": "Freshdesk Weekly Support Intelligence Platform",
  "mode": "READ-ONLY",
  "scheduler": {
    "running": true,
    "jobInProgress": false
  }
}
```

---

## Step 2: Set Up Cron-Job.org (Keep Render Awake)

### Why?
Render free tier sleeps after 15 minutes of inactivity. To ensure your Friday 4:30pm IST scheduler runs, we need to keep the service awake on Fridays.

### 2.1 Sign Up
1. Go to [cron-job.org](https://cron-job.org)
2. Sign up for free account (no credit card)

### 2.2 Create Cron Job
1. Click **"Create cronjob"**
2. Configure:

| Setting | Value |
|---------|-------|
| **Title** | `Keep Render Awake - Friday` |
| **URL** | `https://avni-support-backend.onrender.com/health` |
| **Schedule** | Every 14 minutes, only on Fridays |
| **Execution** | Between 00:00 - 23:59 IST |

### 2.3 Schedule Configuration
- **Pattern**: `*/14 * * * 5` (every 14 minutes on Friday)
- **Timezone**: Asia/Kolkata (IST)
- **Days**: Friday only

### 2.4 Advanced Settings
- **Timeout**: 30 seconds
- **Retries**: 2
- **Expected Status Code**: 200

### 2.5 Save & Enable
Click **"Create"** and ensure the job is **enabled**.

---

## Step 3: Deploy Frontend to Vercel

### 3.1 Install Vercel CLI (Already Done)
```bash
vercel --version  # Should show: Vercel CLI 50.1.3
```

### 3.2 Deploy Frontend
```bash
cd /Users/samanvay/Desktop/SUPPORT/frontend
vercel login
vercel
```

Follow prompts:
- **Set up and deploy**: Yes
- **Which scope**: Your account
- **Link to existing project**: No
- **Project name**: `avni-support-frontend`
- **Directory**: `./` (current directory)
- **Override settings**: No

### 3.3 Add Environment Variables
After deployment, add env vars:

```bash
# Set production env vars
vercel env add NEXT_PUBLIC_API_URL production
# Enter: https://avni-support-backend.onrender.com

vercel env add NEXT_PUBLIC_FIREBASE_API_KEY production
# Enter: your-firebase-api-key

vercel env add NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN production
# Enter: your-project.firebaseapp.com

vercel env add NEXT_PUBLIC_FIREBASE_PROJECT_ID production
# Enter: your-project-id
```

### 3.4 Redeploy with Env Vars
```bash
vercel --prod
```

Your frontend will be live at: `https://avni-support-frontend.vercel.app`

---

## Step 4: Update Backend FRONTEND_URL

1. Go to Render dashboard
2. Select `avni-support-backend`
3. Click **"Environment"**
4. Update `FRONTEND_URL` to: `https://avni-support-frontend.vercel.app`
5. Click **"Save Changes"** (triggers redeploy)

---

## Step 5: Test Everything

### 5.1 Test Backend Health
```bash
curl https://avni-support-backend.onrender.com/health
```

### 5.2 Test Frontend
Open: `https://avni-support-frontend.vercel.app`
- Login with Firebase
- Check if data loads
- Verify UI banner shows scheduler status

### 5.3 Test Scheduler (Manual Trigger)
You can manually trigger the weekly job from Settings page in the UI.

---

## Monitoring

### Render Logs
- Go to Render dashboard → `avni-support-backend` → **Logs**
- Watch for scheduler execution at Friday 4:30pm IST

### Cron-Job.org Logs
- Go to cron-job.org dashboard
- Check execution history
- Verify pings are successful (200 status)

### UI Banner
- The UI will show a blue banner when job is running
- Success toast when job completes

---

## Troubleshooting

### Render Service Sleeping
- Check cron-job.org is running
- Verify cron runs every 14 minutes on Fridays
- Check Render logs for activity

### Scheduler Not Running
- Check Render logs for errors
- Verify all env vars are set correctly
- Test `/health` endpoint shows `scheduler.running: true`

### CORS Errors
- Verify `FRONTEND_URL` in Render matches your Vercel URL
- Check backend logs for CORS errors

---

## Cost Summary

| Service | Cost |
|---------|------|
| **Render** | Free forever (750 hrs/month) |
| **Vercel** | Free forever |
| **Cron-job.org** | Free forever |
| **Supabase** | Free tier (500MB database) |
| **Firebase** | Free tier (authentication) |

**Total: $0/month** 🎉
