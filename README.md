# 🎯 Support Intelligence Platform

**Real-time support analytics for NGOs and social sector organizations.**

[![Production](https://img.shields.io/badge/status-production-success)](https://avni-support.vercel.app)
[![Security](https://img.shields.io/badge/security-98%2F100-success)](#)
[![Cost](https://img.shields.io/badge/cost-$0%2Fmonth-success)](#)
[![Deploy](https://img.shields.io/badge/deploy-automated-success)](#)

## 🚀 Quick Start

**Two Portals:**
- **Support Engineer Portal**: Real-time dashboard, tickets, reports, RFT metrics
- **Leadership Portal**: Partner health, trends analysis, metrics, implementations

**Key Features:**
- ✅ Free forever ($0/month)
- ✅ Role-based access control
- ✅ Auto-sync with Freshdesk
- ✅ Mobile responsive
- ✅ Production ready

**📚 [View Complete Documentation →](/docs)**

## 🏗️ Architecture

**Stack:**
- Frontend: Next.js 16 + React 19 + TypeScript
- Backend: Fastify + Prisma + PostgreSQL
- Auth: Firebase Authentication
- Hosting: Vercel (frontend) + Render (backend) + Supabase (database)

**[View Architecture Diagrams →](/docs)**

## Project Structure

```
SUPPORT/
├── backend/
│   ├── src/
│   │   ├── analytics/          # Metrics computation
│   │   ├── config/             # Environment configuration
│   │   ├── jobs/               # Scheduled jobs (weekly ingestion)
│   │   ├── persistence/        # Database repositories
│   │   ├── routes/             # API endpoints
│   │   ├── services/           # External service integrations
│   │   │   ├── freshdesk/      # Freshdesk API client
│   │   │   ├── metabase/       # Metabase API client
│   │   │   ├── google-sheets/  # Google Sheets integration
│   │   │   └── secure-config/  # Encrypted config manager
│   │   └── utils/              # Shared utilities
│   ├── prisma/                 # Database schema
│   └── .env                    # Environment variables
│
├── frontend/
│   ├── src/
│   │   ├── app/                # Next.js pages
│   │   │   ├── page.tsx        # Dashboard
│   │   │   ├── rft/            # RFT Metrics page
│   │   │   └── settings/       # Settings page
│   │   ├── components/
│   │   │   ├── dashboard/      # Dashboard components
│   │   │   ├── layout/         # Layout components
│   │   │   └── ui/             # shadcn/ui components
│   │   └── lib/                # Utilities and API client
│   └── .env.local              # Frontend environment
│
└── README.md                   # This file
```

## 💡 Core Features & Implementation

### 🎯 Leadership Dashboard (New - Dec 2025)

**Executive Intelligence Platform:**
- **Partner Health**: Risk scoring, engagement patterns, ticket volume trends
- **Metrics Dashboard**: Program risk, adoption signals, support capacity
- **Trends Analysis**: Ticket type distribution, company breakdown, tag analysis, timeline charts
- **Analytics Hub**: Metabase dashboard cards with category filtering
- **Weekly Summary**: Top risks, partners to watch, recommended actions

**Date Filtering:**
- Dynamic date ranges: 30d, 90d, 6m, 12m, custom
- Applied across Partners, Metrics, Trends pages
- Real-time data updates based on selected range

**Last 30 Tickets History:**
- Auto-updating table (syncs every Friday 4:30 PM IST)
- CSV export matching operational dashboard format
- Available in both leadership and support portals

### Authentication & Authorization

**Implementation:**
- **Frontend**: Firebase Client SDK (email/password)
- **Backend**: Firebase Admin SDK with Base64-encoded private key
- **Token Flow**: ID token attached via Axios interceptor on every request
- **Verification**: Backend validates token before data access
- **Multi-User**: Concurrent sessions supported, each request independently validated

**Role-Based Access Control:**
- **Support Engineer**: Dashboard, tickets, reports, engineer hours
- **Leadership**: All support features + partner health, trends, metrics, analytics
- **Founder**: All features + weekly summary, full system access

**Security Measures:**
- ✅ Per-route role verification (`requireLeadership`, `requireFounder`)
- ✅ Token verification on every request (stateless JWT)
- ✅ Rate limiting: 10 req/min (sensitive), 100 req/min (global)
- ✅ No sensitive data logged (tokens masked, BigInt serialization fixed)
- ✅ CORS configured for frontend domain only

### Data Lifecycle Management

**Business Rule:** Only ONE year of data visible at any time (current year).

**Implementation:**
```typescript
// Backend: No DB query needed - pure calculation
export async function getAvailableYears(): Promise<number[]> {
  return [new Date().getFullYear()]; // Always returns [2025] in 2025
}

// Frontend: Year calculated from current date
function getValidYear(): number {
  return new Date().getFullYear();
}
```

**Auto-Adjustment:**
- Jan 1, 2026: Year automatically becomes 2026 (no code changes)
- Jan 1, 2027: Year automatically becomes 2027 (no code changes)

**Data Retention:**
- Current year data persists in database
- Old data cleanup can be scheduled (manual trigger for safety)
- All operations logged in immutable audit trail

**Why This Approach:**
- ✅ Zero maintenance (no hardcoded years)
- ✅ No database queries for year selection
- ✅ Prevents stale data in UI
- ✅ Future-proof (works forever)

### 📊 Dashboard
- **Year & Weekly Views**: Toggle between year-to-date and current week data
- **Auto-refresh**: Data refreshes every 5 minutes automatically
- **Priority Distribution**: Visual breakdown of ticket priorities
- **Status Overview**: Open, pending, resolved, closed tickets
- **Top Companies**: Companies with most support requests
- **Unresolved by Group**: Tickets pending by support group
- **Empty State Handling**: Clear messaging when no data available

### 🤖 Quick Answers Chatbot
Pre-defined questions with instant answers:
1. Total tickets received this year
2. Tickets created this week
3. Currently unresolved tickets
4. Top company by ticket volume
5. Urgent/high priority open tickets
6. RFT (Rule Failure Telemetry) status
7. Ticket resolution rate

### 📝 Weekly Report
- Auto-generated report format for Google Sheets
- Engineer hours tracking (name + hours only)
- Tags analysis for ticket categorization
- Copy-to-clipboard functionality

### ⚙️ Settings
- Secure credential management (AES-256 encrypted)
- Freshdesk API key configuration
- Metabase email/password configuration
- Google Sheets integration URL
- Activity logs with immutable audit trail
- Audit log viewer with JSON export

## 🔒 Security & Compliance

### Security Architecture

**Layer 1: Network Security**
- HTTPS enforced (Vercel + Render SSL)
- CORS configured for frontend domain only
- Security headers: X-Frame-Options, CSP, HSTS

**Layer 2: Authentication**
- Firebase token verification on every request
- No session cookies (stateless JWT)
- Token rotation: 1-hour expiry

**Layer 3: Authorization**
- Per-route middleware (no global blocking)
- Early return on auth failure (prevents data leaks)
- Rate limiting: 10 req/min (year switches), 100 req/min (global)

**Layer 4: Input Validation**
- SQL Injection: Prisma ORM + regex validation
- XSS: Input sanitization on all user inputs
- Path Traversal: Whitelist validation
