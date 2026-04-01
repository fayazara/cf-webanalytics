# cf-webanalytics

A simple, self-hosted analytics dashboard for [Cloudflare Web Analytics](https://www.cloudflare.com/web-analytics/). Runs on Cloudflare Workers.

[![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/fayazara/cf-webanalytics)

Built with TanStack Start, React, and shadcn/ui.

## What it does

Queries the Cloudflare GraphQL Analytics API and displays:

- Total visits and pageviews
- Daily traffic bar chart
- Core Web Vitals (LCP, INP, CLS, FID, TTFB)
- Top pages, referrers, countries, browsers, OS, and device types

## Setup

### 1. Get your credentials

You need three things from the [Cloudflare dashboard](https://dash.cloudflare.com):

| Value          | Where to find it                                                                                                                       |
| -------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| **Account ID** | Dashboard URL: `dash.cloudflare.com/<ACCOUNT_ID>/...`                                                                                  |
| **Site Tag**   | Web Analytics > your site > the URL contains `siteTag~in=<SITE_TAG>`                                                                   |
| **API Token**  | [API Tokens](https://dash.cloudflare.com/profile/api-tokens) > Create Token > Custom Token with **Account Analytics: Read** permission |

### 2. Configure

Copy the example env file:

```bash
cp .dev.vars.example .dev.vars
```

Fill in your values in `.dev.vars`:

```
CF_API_TOKEN=your_api_token
CF_ACCOUNT_ID=your_account_id
CF_SITE_TAG=your_site_tag
SITE_NAME=example.com
```

All config lives in `.dev.vars` for local dev. No need to touch `wrangler.jsonc`.

### 3. Install and run

```bash
pnpm install
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

### 4. Deploy

**One-click:** Use the Deploy to Cloudflare button above. It will prompt you for all required values during setup.

**Manual:**

```bash
npx wrangler secret put CF_API_TOKEN
npx wrangler secret put CF_ACCOUNT_ID
npx wrangler secret put CF_SITE_TAG
npx wrangler secret put SITE_NAME
pnpm deploy
```

## Tech stack

- [TanStack Start](https://tanstack.com/start) - Full-stack React framework
- [Cloudflare Workers](https://developers.cloudflare.com/workers/) - Runtime
- [shadcn/ui](https://ui.shadcn.com) - UI components
- [Recharts](https://recharts.org) - Charts
- [Cloudflare GraphQL Analytics API](https://developers.cloudflare.com/analytics/graphql-api/) - Data source
