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
  FloorMap.jsx      — Main interactive SVG floor map

lib/
  db.js             — SQLite connection + schema + auto-seeding from JSON
  dataStore.js      — All database functions (users, fandoms, catalog, prices)
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

## Key Notes

- The SQLite database is auto-created at `data/cp6.db` on first run
- Users and fandoms are seeded from `data/users.json` and `data/fandoms.json` if tables are empty
- Catalog images are stored locally at `public/uploads/{userId}/` and served as static files
- Sessions are stored in `localStorage` (client-side only)
- The `/dashboard` route is protected by middleware (requires `cp6_user` in localStorage)

## Migration from Vercel/Supabase

Migrated from Vercel + Supabase to Replit + SQLite:
- Removed `@supabase/supabase-js` and `@vercel/speed-insights`
- Replaced Supabase Postgres with `better-sqlite3`
- Replaced Supabase Storage with local file system (`public/uploads/`)
- Updated dev/start scripts to bind on `0.0.0.0:5000` for Replit
- Removed `standalone` output mode (Vercel-specific)
- Removed X-Frame-Options DENY → SAMEORIGIN (needed for Replit preview iframe)
