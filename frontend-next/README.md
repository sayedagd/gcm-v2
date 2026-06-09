# Frontend Next

This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

## Environment Setup

1. Create local env file from template:

```bash
cp .env.example .env.local
```

1. Verify required values before running:

- `NEXT_PUBLIC_API_BASE_URL`
- `API_BASE_URL`
- `AUTH_COOKIE_NAME`
- `AUTH_CSRF_COOKIE_NAME`

1. Keep cookie names aligned with backend env values to avoid login/session issues.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

## Project Docs

- Cache strategy matrix: `docs/cache-strategy-matrix.md`
- Runtime image inventory: `docs/runtime-img-inventory.md`
- Baseline performance metrics: `docs/baseline-metrics.md`
- Baseline performance raw snapshot: `docs/baseline-metrics.json`
- Post-remediation benchmark report: `docs/post-remediation-benchmark.md`
- Production SLO policy: `docs/production-slo-policy.md`
- Observability dashboard spec: `docs/observability-dashboard-spec.md`
- Release readiness sign-off: `docs/release-readiness-signoff.md`
- Production rollout checklist: `docs/production-rollout-checklist.md`

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
