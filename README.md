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

### URL Penting:
```
| URL | Fungsi |
|-----|--------|
| `http://localhost:3000` | Peta interaktif (publik) |
| `http://localhost:3000/cp6-staff` | Login dashboard (RAHASIA) |
| `http://localhost:3000/dashboard` | Dashboard (setelah login) |

> ⚠️ URL `/cp6-staff` bersifat rahasia — tidak ada link ke sana dari halaman publik!

---

## BAGIAN 5 — Akun Login (Development)


```
| Email | Password | Role |
|-------|----------|------|
| `admin@comipara.com` | `admin123` | Admin |
| `super@comipara.com` | `super123` | Super Admin |
| email apapun | min 6 karakter | User biasa |

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
