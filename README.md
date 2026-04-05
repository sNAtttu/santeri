# Santeri — Personal Health Dashboard

A personal health dashboard that combines data from [Oura Ring](https://ouraring.com) and [Strava](https://www.strava.com) to track health changes and uncover correlations between sleep, fitness, and recovery during parental leave.

## Overview

**Santeri** tracks your wellness metrics across multiple services in one place, enabling you to:
- Correlate sleep quality with physical activity (e.g., "I ran yesterday → sleep score dropped today")
- Monitor heart rate, HRV, readiness, and stress resilience trends
- Visualize activity patterns from both wearables and outdoor workouts
- Compare aggregated stats across configurable time periods

## Getting Started

### Prerequisites
- Node.js ≥ 18.17
- [Oura Ring](https://ouraring.com) with API access
- [Strava](https://www.strava.com) account

### Setup

1. **Register OAuth applications:**
   - **Oura:** https://cloud.ouraring.com/oauth/applications
   - **Strava:** https://www.strava.com/settings/api
   - Set redirect URI for both to: `http://localhost:3000/api/auth/{oura|strava}/callback`

2. **Clone and install:**
   ```bash
   npm install
   ```

3. **Configure environment variables:**
   ```bash
   cp .env.local.example .env.local
   # Edit .env.local with your Oura and Strava OAuth credentials
   ```

4. **Run development server:**
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000)

5. **Authorize services:**
   - Visit `http://localhost:3000/api/auth/oura` to authorize Oura
   - Visit `http://localhost:3000/api/auth/strava` to authorize Strava
   - Tokens are saved locally to `tokens.json` (gitignored)

## Features

- **Single-page dashboard** — all data on one scrollable view
- **Multiple chart types** — sleep stages, readiness, activity, heart rate, stress/resilience, and Strava workouts
- **Configurable date range** — last 7/30/90 days, 6 months, or custom dates
- **Workout-day markers** — orange dots on sleep/readiness charts show days after workouts
- **API data fetching** — all data pulled from Oura and Strava APIs on demand (no database)
- **Local token storage** — OAuth tokens stored in `tokens.json`, auto-refreshed as needed

## Tech Stack

- **Framework:** [Next.js](https://nextjs.org) 14 (App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS v3
- **Charts:** [Recharts](https://recharts.org)
- **Dates:** [date-fns](https://date-fns.org)

## Development

Build the project:
```bash
npm run build
```

Lint code:
```bash
npm run lint
```

## Project Structure

```
.
├── app/
│   ├── page.tsx              # Main dashboard
│   ├── layout.tsx
│   ├── globals.css
│   └── api/
│       ├── auth/             # OAuth callback routes
│       ├── oura/route.ts     # Oura data proxy
│       └── strava/route.ts   # Strava data proxy
├── components/
│   ├── DateRangePicker.tsx
│   ├── MetricCard.tsx
│   └── charts/               # Recharts components
├── lib/
│   ├── oura.ts               # Oura API client
│   ├── strava.ts             # Strava API client
│   ├── token-store.ts        # OAuth token persistence
│   ├── utils.ts              # Shared helpers
│   └── types/
├── package.json
└── README.md
```

## Notes

- **Personal use only** — designed for single-user local development
- **No database** — all data fetched from external APIs on demand
- **Token refresh** — Oura tokens are single-use; new pair issued on every refresh and persisted automatically
- **Environment-specific** — built for local development; not designed for deployment

## License

Personal project.
