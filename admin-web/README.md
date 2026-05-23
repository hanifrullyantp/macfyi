# Macfyi Admin (browser)

Separate from the desktop app: manage `app_settings`, view licenses/activations, store AI provider secrets, and smoke-test `ai-proxy`.

## Setup

1. Copy `.env.example` to `.env` and set **Project URL** and **anon key** from Supabase Settings → API.
2. In Supabase Dashboard → Authentication → Users, create an admin user (or pick an existing one).
3. For that user, set **Raw App Meta Data** to include admin role:

```json
{ "role": "admin" }
```

4. Apply database migrations from the repo root (`supabase db push`) so RLS policies in `20250412130100_admin_rls_policies.sql` exist.

## Run

```bash
npm install
npm run dev
```

## Deploy

Host the static output of `npm run build` (e.g. Vercel, Netlify, Cloudflare Pages). Set the same `VITE_*` env vars at build time.

**Vercel:** set **Root Directory** to `admin-web` (this folder). Default `npm ci` + `npm run build` is correct. `vite.config.ts` maps scoped packages (e.g. `@tanstack/react-query`) to `admin-web/node_modules/...` so Rollup resolves them even when the install layout is flat or hoisted oddly.
