# CLAUDE.md

## Project

Trader Legendario — Bitcoin Power Law analyzer with intraday trading signals and scalping engine.

## Tech Stack

- **Framework:** React + TypeScript + Vite
- **UI:** shadcn/ui + Tailwind CSS
- **State:** TanStack React Query
- **Routing:** React Router DOM (SPA)
- **Backend:** Supabase (env vars in `.env` as `VITE_` prefixed)

## Commands

- `npm run dev` — local dev server
- `npm run build` — production build (Vite)
- `npm run preview` — preview production build locally

## Deployment

- **Platform:** Vercel (auto-detected as Vite project)
- **Auto-deploy:** Push to `main` triggers production deploy (~23s build)
- **GitHub integration:** Vercel GitHub App watches `TorbellinoEstudioCreativo/bitcoin-power-insights`
- **Custom domain:** `btc-insights.torbellino.studio`
- **Default URL:** `bitcoin-power-insights.vercel.app`
- **SPA routing:** `vercel.json` has catch-all rewrite to `index.html`
- **Vercel CLI:** Available globally (`vercel ls`, `vercel inspect`, etc.)
- **Project ID:** `prj_6mSNFNpm3uA9W38RfLZavAb911oH`
- **Org/Team:** `team_KkT7Dkuqr8yHYaVKJO1rvyzP` (`poncho-beltrans-projects`)

## Access

- Password-gated via `PasswordGate.tsx` (SHA-256 hash, sessionStorage)
- Bilingual: ES (default) / EN

## Key Directories

- `src/components/` — UI components (trading/, scalping/, intraday/, ui/)
- `src/hooks/` — Custom hooks (alerts, scalping signals, trade monitor)
- `src/lib/` — Utilities, translations, engines
- `src/contexts/` — Language and Theme providers
- `src/pages/` — Route-level page components
