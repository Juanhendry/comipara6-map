# 🗺️ Comipara 6 — Setup Tutorial Lengkap

---

## STRUKTUR FILE PROJECT

```
comipara6-map/                   ← folder project Next.js
├── app/
│   ├── page.jsx                 ← halaman utama (peta)
│   ├── layout.jsx               ← layout global
│   ├── globals.css              ← CSS global
│   ├── cp6-staff/
│   │   └── page.jsx             ← halaman login RAHASIA
│   └── dashboard/
│       └── page.jsx             ← dashboard user/admin
├── components/
│   └── FloorMap.jsx             ← komponen peta interaktif
├── middleware.js                ← proteksi route dashboard
├── tailwind.config.js           ← konfigurasi animasi
└── package.json
```

---

## BAGIAN 1 — Install Tools

### Step 1: Install VS Code
1. Buka **https://code.visualstudio.com**
2. Download → Install → centang "Add to PATH"
3. Buka VS Code

### Step 2: Install Node.js
1. Buka **https://nodejs.org**
2. Download versi **LTS**
3. Install → **restart komputer**
4. Cek di terminal VS Code:
```bash
node --version   # harus muncul angka versi
npm --version    # harus muncul angka versi
```

### Step 3: Install Extension VS Code
Buka Extensions (Ctrl+Shift+X), install:
- **ES7+ React/Redux snippets**
- **Tailwind CSS IntelliSense**
- **Prettier - Code formatter**

---

## BAGIAN 2 — Buat Project Next.js

### Step 4: Buat project baru
```bash
git clone <url-repo>   # atau git pull
cd comipara6-map

open powershell as admin diluar dari vs code
npm install babel-plugin-react-compiler
npm install

kembali ke vs code
npm run dev
```

---

## BAGIAN 3 — Pasang File

### Step 5: Buat folder components
Di terminal VS Code:
```bash
mkdir components
```

### Step 6: Pasang semua file
Copy-paste file berikut ke posisi yang benar:

| File | Letakkan di |
|------|------------|
| `FloorMap.jsx` | `components/FloorMap.jsx` |
| `page.jsx` (peta) | `app/page.jsx` (ganti isi lama) |
| `cp6-staff/page.jsx` | buat folder `app/cp6-staff/` dulu |
| `dashboard/page.jsx` | buat folder `app/dashboard/` dulu |
| `middleware.js` | root project (sejajar package.json) |
| `tailwind.config.js` | root project (ganti isi lama) |

Cara buat folder di terminal:
```bash
mkdir -p app/cp6-staff
mkdir -p app/dashboard
```

### Step 7: Update globals.css
Buka `app/globals.css`, pastikan ada:
```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

---

## BAGIAN 4 — Jalankan

### Step 8: Run development server
```bash
npm run dev
```

Buka browser: **http://localhost:3000**

### URL Penting:
| URL | Fungsi |
|-----|--------|
| `http://localhost:3000` | Peta interaktif (publik) |
| `http://localhost:3000/cp6-staff` | Login dashboard (RAHASIA) |
| `http://localhost:3000/dashboard` | Dashboard (setelah login) |

> ⚠️ URL `/cp6-staff` bersifat rahasia — tidak ada link ke sana dari halaman publik!

---

## BAGIAN 5 — Akun Login (Development)

| Email | Password | Role |
|-------|----------|------|
| `admin@comipara.com` | `admin123` | Admin |
| `super@comipara.com` | `super123` | Super Admin |
| email apapun | min 6 karakter | User biasa |

---

## BAGIAN 6 — Fitur Dashboard

### User biasa:
- Lihat booth yang di-assign admin
- Upload katalog gambar
- Buat tabel harga (item + nominal)

### Admin:
- Semua fitur user
- Tambah / edit / lihat semua user
- Assign booth ke user (ketik ID booth)

### Super Admin:
- Semua fitur admin
- Hapus user (termasuk admin)
- Ubah role user

---

## BAGIAN 7 — Cara Pakai Peta

### Cari Fandom:
1. Klik tab "🔍 Cari Fandom"
2. Ketik nama fandom ATAU klik tag fandom
3. Booth yang cocok akan highlight ungu

### Cari Jalur (A* Pathfinding):
1. Klik tab "🗺️ Cari Jalur"
2. Ketik ID booth asal dan tujuan (e.g. A01 → M32)
3. Atau klik booth pertama di peta → klik booth kedua
4. Klik "Cari" → muncul garis kuning beranimasi

### Zoom & Pan (Mobile):
- **2 jari pisah/rapatkan** → zoom in/out
- **1 jari geser** → pan/scroll peta
- **Scroll mouse** → zoom (desktop)
- Tombol "Reset View" → kembali normal

---

## BAGIAN 8 — Langkah Selanjutnya (Production)

### A. Setup Supabase (Database real)
```bash
npm install @supabase/supabase-js @supabase/ssr
```
1. Daftar di **https://supabase.com** (gratis)
2. Buat project baru
3. Buat file `.env.local`:
```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJxxxx...
```

### B. Tabel Database yang Perlu Dibuat di Supabase:
```sql
-- Users (sudah ada dari Supabase Auth)
-- Tambahan:
CREATE TABLE profiles (
  id uuid references auth.users primary key,
  name text,
  role text default 'user',  -- 'user' | 'admin' | 'super_admin'
  booths text[],
  fandoms text[]
);

CREATE TABLE catalog (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references profiles(id),
  image_url text,
  name text,
  created_at timestamptz default now()
);

CREATE TABLE pricelist (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references profiles(id),
  item text,
  price integer,
  created_at timestamptz default now()
);
```

### C. Deploy ke Vercel
```bash
npm install -g vercel
vercel
```
Atau push ke GitHub → connect ke Vercel → auto deploy.

---

## Troubleshooting

| Masalah | Solusi |
|---------|--------|
| `Module not found` | Jalankan `npm install` |
| Port 3000 bentrok | `npm run dev -- -p 3001` |
| Tailwind tidak jalan | Cek `tailwind.config.js` |
| Peta tidak muncul | Cek console browser (F12) |
| Login redirect loop | Clear localStorage browser |
| Animasi garis tidak ada | Pastikan `<style>` ada di FloorMap.jsx |
