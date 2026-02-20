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
- Logout button in Settings dropdown (clears sessionStorage + reload)
- Bilingual: ES (default) / EN

## Key Directories

- `src/components/` — UI components (trading/, scalping/, intraday/, ui/)
- `src/hooks/` — Custom hooks (alerts, scalping signals, trade monitor)
- `src/lib/` — Utilities, translations, engines
- `src/contexts/` — Language and Theme providers
- `src/pages/` — Route-level page components

## Color Scheme

- **Primary:** Green `#57f906` (HSL 100 95% 50%) — changed from cyan-blue
- CSS variables in `src/index.css` control the entire palette (root, .light, .dark blocks)
- Semantic colors: success (green), warning (yellow), danger (red), info (green), bitcoin (orange)
- Changing `--primary` in index.css propagates to all buttons, toggles, rings, badges app-wide

## UI Design Reference (Mockups)

Reference mockups live in `/Users/ponnvolt/Downloads/stitch 2/`. Each folder has `screen.png` + `code.html`.

### What's been done

| View | Status | Notes |
|------|--------|-------|
| Password Gate | **Done** | Full redesign: glass card, dot-grid bg, glow orbs, stair-step logo, RESTRICTED ACCESS badge, green ENTER SYSTEM button |
| Color scheme | **Done** | Primary changed from cyan to green (#57f906) across entire app |
| Header | **Done** | Added pulsing "LIVE MARKET" / "En Vivo" badge |
| TradingTabs | **Done** | Pill container style with rounded border |
| Logout | **Done** | Settings dropdown → "Cerrar Sesión" clears sessionStorage |

### What's pending (from mockups)

| View | Mockup folder | What the mockup shows | Approach |
|------|--------------|----------------------|----------|
| Dashboard Power Law | `dashboard_power_law_(desktop)` | Cleaner header with green icon, "Rainbow Corridor Analysis" chart area, right sidebar with opportunity score gauge (circular), "AI Alpha Signal" card, bottom buy-level cards (Aggressive/Moderate/Conservative) | Work view by view. Focus on right sidebar cards and header branding first. |
| Scalping Terminal | `terminal_de_scalping_(desktop)` | Professional 3-column terminal: chart with depth overlay (left), Critical Gates with colored side bars (center), RSI/MACD charts + order book (right), execution dock at bottom | Major layout restructure. The current card-based layout works but looks basic. Implement column by column. |
| Trading Intradía | `trading_intradía_(desktop)` | Full terminal: left toolbar, main chart area, order entry sidebar (Buy/Sell), bottom "Active Algorithmic Signals" table | Most ambitious mockup. Would need left toolbar, order sidebar, and signals table as new components. |

### Design language from mockups (apply everywhere)

- Uppercase `tracking-widest` labels (10px, font-bold, text-slate-500)
- Glass card effect: `rgba(22,35,15,0.4)` bg + `backdrop-blur(12px)` + green/10 border
- Dot grid pattern: `radial-gradient(circle at 2px 2px, rgba(87,249,6,0.03) 1px, transparent 0)` at 40px
- Green glow orbs: `bg-[#57f906]/5 blur-[120px]` for ambient lighting
- Status indicators: pulsing green dot + uppercase tracking text
- Cards use `bg-card-dark` (#1a1a1a), `border-primary/5`, hover → `border-primary/20`
- Active elements get a right-side colored bar (`w-1 bg-primary` absolute positioned)
- Font: Inter with tabular-nums for prices
