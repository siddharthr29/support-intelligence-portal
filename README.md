# Support Intelligence Platform

A comprehensive support analytics dashboard for Freshdesk ticket management with RFT (Rule Failure Telemetry) integration from Metabase.

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Frontend (Next.js)                        │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌───────────┐ │
│  │Dashboard│ │Companies│ │ Report  │ │  Quick  │ │  Settings │ │
│  │Overview │ │  View   │ │  Tab    │ │ Answers │ │   Page    │ │
│  └────┬────┘ └────┬────┘ └────┬────┘ └────┬────┘ └─────┬─────┘ │
└───────┼──────────┼──────────┼──────────┼────────────┼─────────┘
        │          │          │          │            │
        └──────────┴──────────┴──────────┴────────────┘
                              │
                    ┌─────────▼─────────┐
                    │   Backend (Fastify)│
                    │                    │
                    │  ┌──────────────┐  │
                    │  │   Routes     │  │
                    │  │ - stats      │  │
                    │  │ - rft        │  │
                    │  │ - companies  │  │
                    │  │ - groups     │  │
                    │  │ - settings   │  │
                    │  │ - quick-ans  │  │
                    │  └──────────────┘  │
                    │                    │
                    │  ┌──────────────┐  │
                    │  │  Services    │  │
                    │  │ - Freshdesk  │  │
                    │  │ - Metabase   │  │
                    │  │ - SecureConf │  │
                    │  └──────────────┘  │
                    └─────────┬─────────┘
                              │
              ┌───────────────┼───────────────┐
              │               │               │
      ┌───────▼───────┐ ┌─────▼─────┐ ┌───────▼───────┐
      │   Freshdesk   │ │ Metabase  │ │   PostgreSQL  │
      │   REST API    │ │   API     │ │   (Prisma)    │
      └───────────────┘ └───────────┘ └───────────────┘
```

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

## Features

### Dashboard
- **YTD & Weekly Views**: Toggle between year-to-date and current week data
- **Auto-refresh**: Data refreshes every 5 minutes automatically
- **Priority Distribution**: Visual breakdown of ticket priorities
- **Status Overview**: Open, pending, resolved, closed tickets
- **Top Companies**: Companies with most support requests
- **Unresolved by Group**: Tickets pending by support group

### Quick Answers Chatbot
Pre-defined questions with instant answers:
1. Total tickets received this year
2. Tickets created this week
3. Currently unresolved tickets
4. Top company by ticket volume
5. Urgent/high priority open tickets
6. RFT (Rule Failure Telemetry) status
7. Ticket resolution rate

### Weekly Report
- Auto-generated report format for Google Sheets
- Engineer hours tracking (name + hours only)
- Tags analysis for ticket categorization
- Copy-to-clipboard functionality

### Settings
- Secure credential management (AES-256 encrypted)
- Freshdesk API key configuration
- Metabase email/password configuration
- Google Sheets integration URL
- Activity logs with immutable audit trail

## Security

- **Encryption at Rest**: All sensitive credentials encrypted with AES-256-CBC
- **Masked API Responses**: Credentials never exposed in API responses
- **Security Headers**: X-Frame-Options, X-Content-Type-Options, etc.
- **Rate Limiting**: All endpoints rate-limited to prevent abuse
- **Audit Logging**: All credential access and changes logged

## Environment Variables

### Backend (.env)
```env
# Server
PORT=3000
HOST=0.0.0.0
NODE_ENV=development

# Database
DATABASE_URL=postgresql://...

# Freshdesk
FRESHDESK_DOMAIN=your-domain.freshdesk.com
FRESHDESK_API_KEY=your-api-key

# Metabase
METABASE_URL=https://your-metabase.com
METABASE_USERNAME=email@example.com
METABASE_PASSWORD=your-password

# Security
CONFIG_ENCRYPTION_KEY=your-32-char-encryption-key
```

### Frontend (.env.local)
```env
NEXT_PUBLIC_API_URL=http://localhost:3000
```

## Running Locally

### Backend
```bash
cd backend
npm install
npx prisma db push
npm run dev
```

### Frontend
```bash
cd frontend
npm install
npm run dev -- -p 3001
```

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/stats` | GET | Dashboard statistics |
| `/api/rft` | GET | RFT metrics |
| `/api/rft/fetch` | POST | Refresh RFT from Metabase |
| `/api/companies/lookup` | POST | Company name lookup |
| `/api/groups/lookup` | POST | Group name lookup |
| `/api/engineer-hours` | GET/POST | Engineer hours management |
| `/api/quick-answers/questions` | GET | Available quick questions |
| `/api/quick-answers/answer` | GET | Get answer for question |
| `/api/settings` | GET | Current settings (masked) |
| `/api/settings/credentials` | POST | Update credentials |
| `/api/settings/sync` | POST | Test service connections |
| `/api/settings/logs` | GET | Activity logs |

## Tech Stack

- **Frontend**: Next.js 16, React, TailwindCSS, shadcn/ui, React Query
- **Backend**: Fastify, TypeScript, Prisma ORM
- **Database**: PostgreSQL
- **External APIs**: Freshdesk REST API, Metabase API

## License

Proprietary - Avni Project
