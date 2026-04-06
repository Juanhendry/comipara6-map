# Migrasi Comipara 6 Map ke Supabase

Migrasi backend dari JSON file-based storage ke Supabase (database + storage) agar data dan gambar persisten di Vercel deployment.

## User Review Required

> [!IMPORTANT]
> **Supabase Keys**: User memberikan Supabase URL dan keys. `NEXT_PUBLIC_SUPABASE_URL` dan `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY` akan disimpan di `.env.local` (tidak tersedia publik di Git). Secret key akan disimpan sebagai `SUPABASE_SECRET_KEY` (server-only, tanpa prefix `NEXT_PUBLIC_`).

> [!WARNING]
> **Keamanan**: `NEXT_PUBLIC_` prefix berarti key akan di-bundle ke client JavaScript. Ini **normal** untuk publishable/anon key karena keamanan dijaga oleh Row Level Security (RLS) di Supabase. Secret key **tidak** akan di-prefix `NEXT_PUBLIC_` sehingga hanya tersedia di server. Di Vercel, semua key harus ditambahkan di dashboard Environment Variables.

> [!CAUTION]
> **Data Migration**: Semua data di `data/users.json`, `data/fandoms.json`, dan `data/catalog/*.json` akan dimigrasikan ke Supabase. Password saat ini disimpan plaintext — ini akan tetap plaintext di Supabase (sesuai existing behavior). Jika user ingin hash password, ini perlu langkah tambahan.

---

## Proposed Changes

### 1. Environment & Dependencies

#### [NEW] `.env.local`
```
NEXT_PUBLIC_SUPABASE_URL=https://nnpxmjaohdvmuaqcskib.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_ZOO9D5C68DqE4t_1s6X5Cg_PV6_T5qo
SUPABASE_SECRET_KEY=sb_secret_nfIcQSzmufBebPWs6uHrng_aTViNI2x
```

#### [MODIFY] `.gitignore`
- Tambah `.env.local` dan `.env*.local` agar key tidak masuk ke repository

#### Install dependency:
```bash
npm install @supabase/supabase-js
```

---

### 2. Supabase Database Schema (SQL)

Tabel yang dibuat di Supabase Dashboard → SQL Editor:

```sql
-- Users table
CREATE TABLE users (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  legacy_id DOUBLE PRECISION UNIQUE,  -- untuk mapping ID lama
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin', 'super_admin')),
  booths TEXT[] DEFAULT '{}',
  fandoms TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Fandoms master list
CREATE TABLE fandoms (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  name TEXT NOT NULL UNIQUE
);

-- Catalog (image metadata — actual files in Supabase Storage)
CREATE TABLE catalog (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  user_id BIGINT REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Prices
CREATE TABLE prices (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  user_id BIGINT REFERENCES users(id) ON DELETE CASCADE,
  item TEXT NOT NULL,
  price TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Disable RLS (karena app menggunakan server-side API routes dengan secret key)
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE fandoms DISABLE ROW LEVEL SECURITY;
ALTER TABLE catalog DISABLE ROW LEVEL SECURITY;
ALTER TABLE prices DISABLE ROW LEVEL SECURITY;
```

### 3. Supabase Storage Bucket

- Buat bucket **`catalog`** di Storage Dashboard (public bucket untuk serve gambar)
- Set public access policy agar gambar bisa diakses tanpa auth

---

### 4. Supabase Client Library

#### [NEW] `lib/supabase.js`
Server-side Supabase client menggunakan **secret key** (bukan anon key) untuk bypass RLS di API routes:
```js
import { createClient } from '@supabase/supabase-js'

export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SECRET_KEY
)
```

#### [NEW] `lib/supabaseClient.js`  
Client-side Supabase client (untuk upload gambar dari browser):
```js
import { createClient } from '@supabase/supabase-js'

export const supabaseClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)
```

---

### 5. API Route Migration

Semua API routes akan diubah dari membaca/menulis JSON files ke query Supabase.

#### [MODIFY] `app/api/auth/route.js`
- Ganti `getUsers()` → `supabase.from('users').select()`

#### [MODIFY] `app/api/users/route.js`
- GET: `supabase.from('users').select()`
- POST: `supabase.from('users').insert()`
- PUT: `supabase.from('users').update().eq('id', ...)`
- DELETE: `supabase.from('users').delete().eq('id', ...)`

#### [MODIFY] `app/api/fandoms/route.js`
- GET: `supabase.from('fandoms').select('name')`
- POST: `supabase.from('fandoms').upsert()`
- DELETE: `supabase.from('fandoms').delete()`

#### [MODIFY] `app/api/catalog/route.js`
- GET: `supabase.from('catalog').select().eq('user_id', ...)`
- POST: Upload file ke Supabase Storage → simpan URL di catalog table
- DELETE: Hapus file dari Storage → hapus record dari catalog table

#### [MODIFY] `app/api/prices/route.js`
- GET: `supabase.from('prices').select().eq('user_id', ...)`
- POST: `supabase.from('prices').insert()`
- DELETE: `supabase.from('prices').delete()`

#### [MODIFY] `lib/authHelper.js`
- Ganti `getUsers()` → query `supabase.from('users')`

---

### 6. Data Store Cleanup

#### [MODIFY] `lib/dataStore.js`
- File ini akan di-replace sepenuhnya ke Supabase-based operations
- Fungsi lama (`readJSON`, `writeJSON`) dihapus
- Fungsi baru wrap Supabase queries

---

### 7. Dashboard & FloorMap Updates

#### [MODIFY] `app/dashboard/page.jsx`
- Catalog upload: client-side compress → upload ke Supabase Storage via API route
- Tidak ada perubahan UI besar, hanya data flow ke API yang sudah berubah

#### [MODIFY] `components/FloorMap.jsx`
- Catalog image URLs akan berubah dari `/uploads/...` ke Supabase Storage public URL
- Perlu update image rendering path

#### [MODIFY] `next.config.mjs`
- Tambah `nnpxmjaohdvmuaqcskib.supabase.co` ke `images.remotePatterns` agar Next.js Image optimization bekerja
- Hapus `/uploads/:path*` cache headers (tidak relevan lagi)

---

### 8. Migration Script

#### [NEW] `scripts/migrate-to-supabase.mjs`
Script Node.js yang:
1. Membaca `data/users.json` → Insert ke tabel `users`
2. Membaca `data/fandoms.json` → Insert ke tabel `fandoms`
3. Membaca `data/catalog/*.json` → Insert ke tabel `catalog`
4. Upload gambar dari `public/uploads/` ke Supabase Storage bucket `catalog`

---

### 9. Tutorial Document

#### [NEW] `_Tutorial2-Supabase.md`
Tutorial lengkap mencakup:
1. Setup Supabase project
2. SQL schema creation
3. Storage bucket setup
4. Environment variables di local & Vercel
5. Cara menjalankan migration script
6. Troubleshooting umum

---

## Open Questions

> [!IMPORTANT]
> 1. **Supabase Dashboard Access**: Apakah Anda sudah membuat project di Supabase? SQL dan Storage bucket perlu disetup via Supabase Dashboard. Saya akan memberikan SQL lengkap yang tinggal di-paste.

> [!IMPORTANT]  
> 2. **Gambar yang sudah ada di `public/uploads/`**: Apakah ada gambar yang perlu dimigrasikan ke Supabase Storage? Dari data catalog yang ada, terlihat ada beberapa file gambar. Migration script akan mengupload file-file ini.

> [!IMPORTANT]
> 3. **Password hashing**: Saat ini password disimpan plaintext. Apakah ingin ditingkatkan keamanannya dengan bcrypt hashing? (ini opsional, bisa dilakukan nanti)

## Verification Plan

### Automated Tests
1. Jalankan `npm run build` untuk memastikan tidak ada build error
2. Jalankan `npm run dev` dan test semua API endpoints
3. Test login flow via browser
4. Test catalog upload via dashboard
5. Test FloorMap data loading

### Manual Verification
- Login sebagai admin → verifikasi semua tab dashboard berfungsi
- Upload gambar katalog → verifikasi gambar muncul
- Buka peta → verifikasi data booth tampil dengan benar
- Verifikasi di Supabase Dashboard bahwa data tersimpan

