# Si MAMA
### Sistem Informasi Manajemen Aspirasi Masyarakat

Modul inti Papua Pegunungan Regional Intelligence Desk. Dibangun dengan stack
yang sama seperti Si Kru BaPa: **HTML/CSS/JS polos + Supabase (auth, database,
storage) + Netlify (hosting)** — tanpa framework, tanpa build step.

---

## Yang sudah jadi (Tahap 1)

- **Login & sesi** (`index.html`) — Supabase Auth, redirect otomatis kalau sudah login.
- **Role-based access** (`js/auth.js`) — 8 role sesuai struktur tim di GCAO: admin,
  data_officer, aspirasi_officer, research_officer, monitoring_officer,
  documentation_officer, senator, viewer. Elemen dengan atribut `data-role="..."`
  otomatis disembunyikan dari role yang tidak berhak.
- **Dashboard** (`dashboard.html`) — total aspirasi, breakdown per bidang, top isu,
  aspirasi terbaru.
- **Modul Aspirasi** (`aspirasi.html`) — CRUD penuh: tambah, edit, filter per
  kabupaten/bidang/status, pencarian judul, badge status berwarna sesuai
  Follow-Up Tracker di GCAO (hijau/biru/kuning/merah).
- **Skema database lengkap** (`schema.sql`) — mencakup ketujuh modul yang
  direncanakan di GCAO, bukan cuma yang sudah ada UI-nya.

## Yang belum ada UI-nya (skema sudah siap)

Tabel-tabel berikut sudah ada di `schema.sql`, tinggal dibuatkan halaman
mengikuti pola `aspirasi.html`:

- `isu_strategis` → `isu.html` (Issue Tracker + generator Top 10 mingguan)
- `kabupaten` → `kabupaten.html` (Regional Database, profil 8 kabupaten)
- `policy_brief` → `policy-brief.html` (editor kajian: Masalah→Data→Analisis→Gap→Rekomendasi)
- `stakeholder` → `stakeholder.html`
- `dokumen` → `arsip.html` (Digital Archive, pakai Supabase Storage)
- `weekly_report` → laporan mingguan otomatis dari data aspirasi + isu

Sidebar di setiap halaman yang sudah jadi sudah punya link ke halaman-halaman
ini — begitu file-nya dibuat, navigasi otomatis nyambung.

## Roadmap Pengembangan

| Tahap | Fokus | Target |
|---|---|---|
| **Tahap 1** ✅ | Login, dashboard, modul Aspirasi | Selesai — siap dites |
| **Tahap 2** | Modul Kabupaten, Issue Tracker, Stakeholder | 2–3 minggu |
| **Tahap 3** | Policy Brief editor, Digital Archive (upload file ke Storage) | 2–3 minggu |
| **Tahap 4** | Senator Briefing Book generator (compile PDF), Weekly Report otomatis | 3–4 minggu |
| **Tahap 5** | Notifikasi (aspirasi macet >X hari), export Excel, grafik tren | opsional |

Saran: kerjakan satu modul dulu sampai benar-benar dipakai tim (biasanya
Aspirasi + dashboard sudah cukup untuk mulai kerja harian), baru lanjut ke
modul berikutnya. Tidak perlu menunggu semua modul selesai untuk mulai pakai.

---

## Setup

### 1. Buat project Supabase
1. Daftar/login di [supabase.com](https://supabase.com), buat project baru.
2. Buka **SQL Editor** → jalankan seluruh isi `schema.sql`. Ini akan membuat
   semua tabel, relasi, Row Level Security, dan mengisi 8 kabupaten.
3. Buka **Project Settings → API**, salin `Project URL` dan `anon public key`.

### 2. Hubungkan aplikasi ke Supabase
Buka `js/supabase-client.js`, ganti dua baris ini:
```js
const SUPABASE_URL = "https://YOUR-PROJECT-REF.supabase.co";
const SUPABASE_ANON_KEY = "YOUR-ANON-PUBLIC-KEY";
```

### 3. Buat user pertama (Admin)
1. Di Supabase dashboard → **Authentication → Users → Add user**, buat akun
   dengan email + password.
2. Di **Table Editor → profiles**, tambah baris baru:
   - `id` — copy dari `id` user yang baru dibuat di Authentication
   - `nama_lengkap` — nama Anda
   - `role` — `admin`
   - `aktif` — `true`
3. Ulangi untuk setiap anggota tim, sesuaikan `role` masing-masing
   (`data_officer`, `aspirasi_officer`, dst).

### 4. Jalankan lokal
Buka `index.html` langsung di browser, atau pakai extension **Live Server**
di VS Code supaya path relatif jalan normal.

### 5. Deploy ke Netlify
1. Push folder ini ke repo GitHub.
2. Di Netlify: **Add new site → Import from Git**, pilih repo ini.
3. Build command kosongkan, publish directory: `/` (root).
4. Deploy. Selesai — URL langsung bisa dibagikan ke tim.

---

## Struktur Folder

```
simama-app/
├── index.html          → halaman login
├── dashboard.html       → dashboard utama
├── aspirasi.html         → modul aspirasi (CRUD)
├── schema.sql            → skema database Supabase, jalankan sekali di awal
├── css/
│   └── style.css         → design tokens & semua styling
└── js/
    ├── supabase-client.js  → koneksi Supabase + konstanta status/role
    ├── auth.js              → auth guard, role visibility, sign out
    ├── dashboard.js          → logic dashboard
    └── aspirasi.js           → logic CRUD aspirasi
```

## Catatan Keamanan

Row Level Security (RLS) di `schema.sql` saat ini mengizinkan semua user yang
sudah login untuk membaca dan menulis ke tabel data operasional. Ini cukup
untuk tim kecil (4–6 orang) yang saling percaya. Kalau tim bertambah atau
butuh pembatasan lebih ketat (mis. hanya `aspirasi_officer` yang boleh input
aspirasi baru), policy di bagian `ROW LEVEL SECURITY` bisa dipersempit —
tinggal tambahkan pengecekan role lewat sub-query ke tabel `profiles`.
