# Comipara 6 — Floor Map

Interactive booth floor map for Comipara 6 event, with a staff dashboard for managing users, fandoms, catalog images, and price lists.

## Stack

- **Framework**: Next.js 16 (App Router)
- **Styling**: Tailwind CSS v4
- **Database**: SQLite via `better-sqlite3` (file: `data/cp6.db`)
- **Image processing**: `sharp` (server-side WebP conversion)
- **Auth**: bcryptjs password hashing, localStorage session

## Project Structure

```
app/
  page.jsx          — Public floor map (/)
  layout.js         — Root layout
  globals.css       — Global styles
  middleware.js     — Route protection for /dashboard
  cp6-staff/        — Staff login page (/cp6-staff)
  dashboard/        — Admin dashboard (/dashboard)
  api/
    auth/           — POST: login with bcrypt verification
    users/          — CRUD: user management
    fandoms/        — CRUD: fandom list
    catalog/        — CRUD: catalog image upload/delete
    prices/         — CRUD: price list per user

components/
  FloorMap.jsx      — Main interactive SVG floor map (client, receives server data as props)

lib/
  db.js             — SQLite connection + schema + auto-seeding from JSON
  dataStore.js      — All database functions (users, fandoms, catalog, prices)
  map-geometry.js   — Static booth geometry: positions, aisle graph, all constants (shared server+client)
  security.js       — Input sanitization, upload hardening HOFs
  authHelper.js     — Auth utilities
  imageUtils.js     — Client-side image compression

data/
  cp6.db            — SQLite database (auto-created on first run)
  users.json        — Initial user seed data (plaintext passwords hashed on seed)
  fandoms.json      — Initial fandom seed data
  catalog/          — Legacy per-user catalog JSON files

public/
  uploads/          — Catalog images uploaded by staff (served as static assets)
```

## Running

```
npm run dev     # Development on port 5000
npm run build   # Production build
npm run start   # Production on port 5000
```

## Performance Architecture

Load is distributed between server and client:

| Layer | Responsibility |
|---|---|
| **Server (ISR, 60s)** | Fetches users/fandoms/catalog/prices from SQLite, builds tenants map, renders page with data embedded — no client API calls on load |
| **`lib/map-geometry.js`** | Computes all booth positions, aisle graph, and constants once at module load — imported by both server and client |
| **Client (FloorMap)** | Handles pan/zoom, booth clicks, fandom search, and A* pathfinding only |

This eliminates the API waterfall on first load (previously 3–4 sequential fetches before map showed data), which is the main bottleneck on budget Android phones.

## Key Notes

- The SQLite database is auto-created at `data/cp6.db` on first run
- Users and fandoms are seeded from `data/users.json` and `data/fandoms.json` if tables are empty
- Catalog images are stored locally at `public/uploads/{userId}/` and served as static files
- Sessions are stored in `localStorage` (client-side only)
- The `/dashboard` route is protected by middleware (requires `cp6_user` in localStorage)
- `app/page.jsx` is an async server component with `export const revalidate = 60` — map data is cached and revalidated in the background; admin changes appear within 60 s without a deploy

## Migration from Vercel/Supabase

Migrated from Vercel + Supabase to Replit + SQLite:
- Removed `@supabase/supabase-js` and `@vercel/speed-insights`
- Replaced Supabase Postgres with `better-sqlite3`
- Replaced Supabase Storage with local file system (`public/uploads/`)
- Updated dev/start scripts to bind on `0.0.0.0:5000` for Replit
- Removed `standalone` output mode (Vercel-specific)
- Removed X-Frame-Options DENY → SAMEORIGIN (needed for Replit preview iframe)
