# Tutorial 2 — Migrasi Comipara 6 ke Supabase

Tutorial ini menjelaskan cara setup Supabase sebagai database dan storage untuk project Comipara 6 Map.

---

## Daftar Isi

1. [Buat Tabel di Supabase](#1-buat-tabel-di-supabase)
2. [Buat Storage Bucket](#2-buat-storage-bucket)
3. [Setup Environment Variables](#3-setup-environment-variables)
4. [Jalankan Migration Script](#4-jalankan-migration-script)
5. [Deploy ke Vercel](#5-deploy-ke-vercel)
6. [Troubleshooting](#6-troubleshooting)

---

## 1. Buat Tabel di Supabase

1. Buka [Supabase Dashboard](https://supabase.com/dashboard)
2. Pilih project kamu
3. Buka **SQL Editor** (menu kiri)
4. **Copy & paste** SQL berikut, lalu klik **Run**:

```sql
-- ═══════════════════════════════════════════════════════════════
-- COMIPARA 6 MAP — Database Schema
-- ═══════════════════════════════════════════════════════════════

-- Tabel Users
CREATE TABLE IF NOT EXISTS users (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin', 'super_admin')),
  booths TEXT[] DEFAULT '{}',
  fandoms TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabel Fandoms (master list)
CREATE TABLE IF NOT EXISTS fandoms (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name TEXT NOT NULL UNIQUE
);

-- Tabel Catalog (metadata gambar — file di Supabase Storage)
CREATE TABLE IF NOT EXISTS catalog (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  storage_path TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabel Prices (daftar harga per user)
CREATE TABLE IF NOT EXISTS prices (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  item TEXT NOT NULL,
  price TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index untuk performa query
CREATE INDEX IF NOT EXISTS idx_catalog_user ON catalog(user_id);
CREATE INDEX IF NOT EXISTS idx_prices_user ON prices(user_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- Disable Row Level Security (keamanan dihandle di API routes via service_role key)
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE fandoms DISABLE ROW LEVEL SECURITY;
ALTER TABLE catalog DISABLE ROW LEVEL SECURITY;
ALTER TABLE prices DISABLE ROW LEVEL SECURITY;
```

> ✅ Setelah run, kamu akan melihat 4 tabel di bagian **Table Editor**.

---

## 2. Buat Storage Bucket

1. Buka **Storage** di menu kiri Supabase Dashboard
2. Klik **New Bucket**
3. Isi:
   - **Name**: `catalog`
   - **Public**: ✅ **ON** (centang "Make public")
4. Klik **Create Bucket**

### Set Storage Policy

Setelah bucket dibuat, klik bucket **catalog** → klik tab **Policies** → **New Policy**.

Pilih **For full customization** dan buat 3 policy berikut:

> ⚠️ **PENTING**: Jangan copy-paste full SQL statement ke form! Isi setiap field sesuai tabel di bawah.

**Policy 1 — Allow public read (SELECT):**

| Field | Isi |
|-------|-----|
| Policy name | `Public read catalog` |
| Allowed operation | `SELECT` |
| Target roles | _(kosongkan — default public/all)_ |
| Policy definition | `bucket_id = 'catalog'` |

**Policy 2 — Allow service role upload (INSERT):**

| Field | Isi |
|-------|-----|
| Policy name | `Service role upload` |
| Allowed operation | `INSERT` |
| Target roles | _(kosongkan — default public/all)_ |
| Policy definition (WITH CHECK) | `bucket_id = 'catalog'` |

**Policy 3 — Allow service role delete (DELETE):**

| Field | Isi |
|-------|-----|
| Policy name | `Service role delete` |
| Allowed operation | `DELETE` |
| Target roles | _(kosongkan — default public/all)_ |
| Policy definition | `bucket_id = 'catalog'` |

<details>
<summary>💡 Alternatif: Jalankan via SQL Editor (tanpa form UI)</summary>

Jika lebih suka, kamu bisa jalankan SQL ini langsung di **SQL Editor**:

```sql
CREATE POLICY "Public read catalog" ON storage.objects
  FOR SELECT USING (bucket_id = 'catalog');

CREATE POLICY "Service role upload" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'catalog');

CREATE POLICY "Service role delete" ON storage.objects
  FOR DELETE USING (bucket_id = 'catalog');
```

</details>

> 💡 Policies ini memastikan:
> - Siapa saja bisa **melihat** gambar (public)
> - Hanya server (service_role key) yang bisa **upload** dan **hapus** gambar

---

## 3. Setup Environment Variables

### Lokal (sudah otomatis)

File `.env.local` sudah dibuat di root project:

```env
NEXT_PUBLIC_SUPABASE_URL=https://nnpxmjaohdvmuaqcskib.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_ZOO9D5C68DqE4t_1s6X5Cg_PV6_T5qo
SUPABASE_SERVICE_ROLE_KEY=<YOUR_SUPABASE_SERVICE_ROLE_KEY>
```

> ⚠️ **PENTING**: File `.env.local` sudah di-`.gitignore` dan TIDAK akan masuk ke repository.

### Vercel (untuk production)

1. Buka [Vercel Dashboard](https://vercel.com) → pilih project
2. Masuk ke **Settings** → **Environment Variables**
3. Tambahkan 3 variable berikut:

| Name | Value | Environments |
|------|-------|--------------|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://nnpxmjaohdvmuaqcskib.supabase.co` | Production, Preview, Development |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `sb_publishable_ZOO9D5C68DqE4t_1s6X5Cg_PV6_T5qo` | Production, Preview, Development |
| `SUPABASE_SERVICE_ROLE_KEY` | `<YOUR_SUPABASE_SERVICE_ROLE_KEY>` | Production, Preview, Development |

4. Klik **Save** untuk setiap variable

> ⚠️ **KEAMANAN**:
> - `NEXT_PUBLIC_` = aman di-expose ke browser (ini publishable key)
> - `SUPABASE_SERVICE_ROLE_KEY` = **RAHASIA**, hanya ada di server, tidak pernah sampai ke browser

---

## 4. Jalankan Migration Script

Setelah tabel dan storage bucket dibuat, jalankan migration script untuk memindahkan data dari JSON ke Supabase:

```bash
node scripts/migrate-to-supabase.mjs
```

Script ini akan:
1. ✅ Membaca `data/users.json` → Insert ke tabel `users` (password di-hash dengan bcrypt)
2. ✅ Membaca `data/fandoms.json` → Insert ke tabel `fandoms`

Output yang diharapkan:
```
╔════════════════════════════════════════╗
║  Comipara 6 — Migrasi ke Supabase      ║
╚════════════════════════════════════════╝

🔗 Supabase URL: https://nnpxmjaohdvmuaqcskib.supabase.co
✅ Koneksi Supabase berhasil!

📦 Migrating 332 users...
  🔐 Hashing passwords with bcrypt...
  ✅ 332 users processed (0 errors, 0 skipped)
  ✅ Users migration complete: 332 inserted, 0 errors

📦 Migrating 596 fandoms...
  ✅ 596/596 fandoms processed
  ✅ Fandoms migration complete: 596 inserted

══════════════════════════════════════════
✅ Migrasi selesai!
══════════════════════════════════════════
```

> 💡 Script bisa dijalankan berulang kali. Data duplikat akan diabaikan.

---

## 5. Deploy ke Vercel

Setelah semua setup selesai:

```bash
git add .
git commit -m "Migrasi ke Supabase"
git push
```

Vercel akan otomatis deploy. Pastikan environment variables sudah diset di Vercel Dashboard (langkah 3).

---

## 6. Troubleshooting

### ❌ "Missing Supabase environment variables"
- Pastikan file `.env.local` ada di root project
- Pastikan 3 variable sudah benar
- Restart dev server: `npm run dev`

### ❌ "relation 'users' does not exist"
- Tabel belum dibuat di Supabase. Jalankan SQL di langkah 1.

### ❌ Upload gambar gagal
- Pastikan storage bucket `catalog` sudah dibuat (langkah 2)
- Pastikan bucket set sebagai **Public**
- Pastikan storage policies sudah dibuat

### ❌ Login gagal setelah migrasi
- Password sudah di-hash. Gunakan password lama yang sama (bcrypt akan memverifikasinya)
- Jika masih gagal, cek apakah migration script berhasil dijalankan

### ❌ Build error "bcryptjs not found"
```bash
npm install bcryptjs @supabase/supabase-js
```

### 📝 Cara reset data
Jika ingin menghapus semua data dan mulai ulang:
```sql
-- Jalankan di SQL Editor Supabase
TRUNCATE TABLE catalog, prices, users, fandoms CASCADE;
```
Lalu jalankan migration script lagi.

---

## Arsitektur Setelah Migrasi

```
┌──────────────────┐     ┌────────────────────────────────┐
│   Browser/Client │────▶│  Next.js API Routes (Vercel)   │
│                  │     │                                │
│  - FloorMap      │     │  /api/auth     → bcrypt login  │
│  - Dashboard     │     │  /api/users    → Supabase DB   │
│  - Login         │     │  /api/fandoms  → Supabase DB   │
│                  │     │  /api/catalog  → Supabase DB   │
│                  │     │                  + Storage      │
│                  │     │  /api/prices   → Supabase DB   │
└──────────────────┘     └──────────┬─────────────────────┘
                                    │
                                    ▼
                         ┌────────────────────────┐
                         │   Supabase              │
                         │                        │
                         │  📊 PostgreSQL DB      │
                         │    - users             │
                         │    - fandoms           │
                         │    - catalog           │
                         │    - prices            │
                         │                        │
                         │  📁 Storage (S3)       │
                         │    - catalog/ bucket   │
                         │      (gambar WebP)     │
                         └────────────────────────┘
```

### Keamanan

| Key | Prefix | Akses | Kegunaan |
|-----|--------|-------|----------|
| `NEXT_PUBLIC_SUPABASE_URL` | `NEXT_PUBLIC_` | Browser + Server | URL project Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `NEXT_PUBLIC_` | Browser + Server | Publishable key (aman di-expose) |
| `SUPABASE_SERVICE_ROLE_KEY` | _(none)_ | **Server only** | Full database access, bypass RLS |

### Fitur Baru
- ✅ **Password hashing** — bcrypt (salt rounds: 10)
- ✅ **WebP auto-convert** — gambar dikonversi ke WebP (quality 75%) saat upload
- ✅ **Client-side compression** — gambar di-resize max 1200px sebelum upload
- ✅ **Server-side compression** — sharp memastikan WebP conversion di server
- ✅ **Persistent storage** — data dan gambar tersimpan permanent di Supabase
