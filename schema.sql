-- ============================================================
-- Si MAMA — Sistem Informasi Manajemen Aspirasi Masyarakat
-- Skema Database Supabase (PostgreSQL)
-- Mengikuti pola Si Kru BaPa: Supabase Auth + Row Level Security
-- ============================================================

-- ------------------------------------------------------------
-- 1. PROFILES & ROLES
-- Terhubung ke auth.users bawaan Supabase
-- ------------------------------------------------------------
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  nama_lengkap text not null,
  role text not null check (role in (
    'admin', 'data_officer', 'aspirasi_officer',
    'research_officer', 'monitoring_officer',
    'documentation_officer', 'senator', 'viewer'
  )),
  komisi text, -- relevan khusus untuk role 'senator': 'I', 'II', 'III'
  aktif boolean default true,
  created_at timestamptz default now()
);

-- ------------------------------------------------------------
-- 2. REGIONAL DATABASE — 8 Kabupaten Papua Pegunungan
-- ------------------------------------------------------------
create table kabupaten (
  id serial primary key,
  kode text unique not null,        -- '01', '02', dst
  nama text unique not null,        -- 'Jayawijaya', 'Pegunungan Bintang', dst
  demografi text,
  ekonomi text,
  pendidikan text,
  kesehatan text,
  infrastruktur text,
  potensi_daerah text,
  permasalahan_utama text,
  program_pemerintah text,
  updated_at timestamptz default now(),
  updated_by uuid references profiles(id)
);

create table distrik (
  id serial primary key,
  kabupaten_id integer references kabupaten(id) on delete cascade,
  nama text not null
);

-- ------------------------------------------------------------
-- 3. ASPIRASI MASYARAKAT
-- ------------------------------------------------------------
create table aspirasi (
  id uuid primary key default gen_random_uuid(),
  judul text not null,
  deskripsi text,
  kabupaten_id integer references kabupaten(id),
  distrik_id integer references distrik(id),
  kampung text,
  bidang text not null check (bidang in (
    'Pendidikan', 'Infrastruktur', 'Kesehatan', 'Ekonomi',
    'Pemerintahan', 'Sosial', 'Pertanian', 'Telekomunikasi',
    'Transportasi', 'Keamanan', 'Lainnya'
  )),
  komisi_terkait text,               -- 'I' | 'II' | 'III'
  instansi_berwenang text,
  tingkat_urgensi text check (tingkat_urgensi in ('Rendah', 'Sedang', 'Tinggi')),
  status text not null default 'RECEIVED' check (status in (
    'RECEIVED', 'VERIFIED', 'SUBMITTED', 'IN_PROGRESS',
    'WAITING_RESPONSE', 'COMPLETED', 'BELUM_DITINDAKLANJUTI'
  )),
  senator_penanggung_jawab text,
  hasil_tindak_lanjut text,
  tanggal_penyampaian date not null default current_date,
  sumber text,                        -- 'Reses', 'Kunjungan', 'Surat', 'Media', dll
  dokumentasi_url text[],             -- array path ke Supabase Storage
  dibuat_oleh uuid references profiles(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index idx_aspirasi_status on aspirasi(status);
create index idx_aspirasi_kabupaten on aspirasi(kabupaten_id);
create index idx_aspirasi_bidang on aspirasi(bidang);

-- Log riwayat perubahan status (untuk timeline tindak lanjut)
create table aspirasi_riwayat (
  id uuid primary key default gen_random_uuid(),
  aspirasi_id uuid references aspirasi(id) on delete cascade,
  status_sebelum text,
  status_sesudah text,
  catatan text,
  diubah_oleh uuid references profiles(id),
  created_at timestamptz default now()
);

-- ------------------------------------------------------------
-- 4. ISU STRATEGIS (Issue Tracker)
-- ------------------------------------------------------------
create table isu_strategis (
  id uuid primary key default gen_random_uuid(),
  judul text not null,
  kategori text not null,             -- 'Harga Kebutuhan Pokok', 'Infrastruktur Jalan', dll
  deskripsi text,
  sumber text check (sumber in (
    'Pemerintah Daerah', 'Media', 'DPRK', 'Masyarakat',
    'Akademisi', 'Organisasi Masyarakat', 'Berita Nasional', 'Kebijakan Pusat'
  )),
  kabupaten_id integer references kabupaten(id),
  tingkat_prioritas text check (tingkat_prioritas in ('Rendah', 'Sedang', 'Tinggi')),
  minggu_ke date,                     -- tanggal Senin dari minggu laporan
  dibuat_oleh uuid references profiles(id),
  created_at timestamptz default now()
);

-- ------------------------------------------------------------
-- 5. POLICY BRIEF
-- ------------------------------------------------------------
create table policy_brief (
  id uuid primary key default gen_random_uuid(),
  judul text not null,
  masalah text,
  data_pendukung text,
  analisis text,
  dampak text,
  kebijakan_ada text,
  gap text,
  rekomendasi text,
  status text default 'draft' check (status in ('draft', 'review', 'terbit')),
  dibuat_oleh uuid references profiles(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ------------------------------------------------------------
-- 6. STAKEHOLDER DATABASE
-- ------------------------------------------------------------
create table stakeholder (
  id uuid primary key default gen_random_uuid(),
  nama text not null,
  kategori text not null check (kategori in (
    'Pemerintah', 'Legislatif', 'Tokoh Masyarakat', 'Tokoh Adat',
    'Tokoh Agama', 'Akademisi', 'Pengusaha', 'Organisasi Masyarakat',
    'Pemuda', 'Perempuan'
  )),
  jabatan text,
  kabupaten_id integer references kabupaten(id),
  kontak text,
  catatan text,
  created_at timestamptz default now()
);

-- ------------------------------------------------------------
-- 7. DIGITAL ARCHIVE (metadata; file fisik di Supabase Storage)
-- ------------------------------------------------------------
create table dokumen (
  id uuid primary key default gen_random_uuid(),
  judul text not null,
  kategori text not null check (kategori in (
    'Peraturan', 'Undang-Undang', 'Peraturan DPD', 'Data Daerah',
    'Aspirasi Masyarakat', 'Laporan Reses', 'Kunjungan Daerah',
    'Dokumentasi', 'Surat Masuk/Keluar', 'Kajian', 'Statistik Daerah'
  )),
  kabupaten_id integer references kabupaten(id),
  file_path text not null,            -- path di Supabase Storage
  file_type text,
  diunggah_oleh uuid references profiles(id),
  created_at timestamptz default now()
);

-- ------------------------------------------------------------
-- 8. WEEKLY REPORT (snapshot laporan mingguan)
-- ------------------------------------------------------------
create table weekly_report (
  id uuid primary key default gen_random_uuid(),
  minggu_mulai date not null,
  minggu_selesai date not null,
  top_issues text,
  aspirasi_baru integer default 0,
  aspirasi_proses integer default 0,
  aspirasi_selesai integer default 0,
  catatan_penting text,
  rekomendasi_perhatian text,
  dibuat_oleh uuid references profiles(id),
  created_at timestamptz default now()
);

-- ============================================================
-- ROW LEVEL SECURITY
-- Pola: semua role terautentikasi bisa baca (read),
-- hanya role terkait yang bisa tulis (insert/update).
-- Sesuaikan lebih lanjut sesuai kebutuhan Tahap 2.
-- ============================================================
alter table profiles enable row level security;
alter table kabupaten enable row level security;
alter table distrik enable row level security;
alter table aspirasi enable row level security;
alter table aspirasi_riwayat enable row level security;
alter table isu_strategis enable row level security;
alter table policy_brief enable row level security;
alter table stakeholder enable row level security;
alter table dokumen enable row level security;
alter table weekly_report enable row level security;

-- Semua user login bisa membaca semua tabel data
create policy "read_all_authenticated" on kabupaten for select using (auth.role() = 'authenticated');
create policy "read_all_authenticated" on distrik for select using (auth.role() = 'authenticated');
create policy "read_all_authenticated" on aspirasi for select using (auth.role() = 'authenticated');
create policy "read_all_authenticated" on aspirasi_riwayat for select using (auth.role() = 'authenticated');
create policy "read_all_authenticated" on isu_strategis for select using (auth.role() = 'authenticated');
create policy "read_all_authenticated" on policy_brief for select using (auth.role() = 'authenticated');
create policy "read_all_authenticated" on stakeholder for select using (auth.role() = 'authenticated');
create policy "read_all_authenticated" on dokumen for select using (auth.role() = 'authenticated');
create policy "read_all_authenticated" on weekly_report for select using (auth.role() = 'authenticated');

-- User bisa melihat profil sendiri; admin bisa melihat semua
create policy "read_own_profile" on profiles for select using (auth.uid() = id);
create policy "insert_own_profile" on profiles for insert with check (auth.uid() = id);

-- Insert/update data operasional: siapa saja yang sudah login dan aktif
-- (bisa dipersempit per role di Tahap 2, mis. hanya aspirasi_officer boleh insert ke aspirasi)
create policy "write_aspirasi_authenticated" on aspirasi for insert with check (auth.role() = 'authenticated');
create policy "update_aspirasi_authenticated" on aspirasi for update using (auth.role() = 'authenticated');
create policy "write_isu_authenticated" on isu_strategis for insert with check (auth.role() = 'authenticated');
create policy "write_policy_brief_authenticated" on policy_brief for insert with check (auth.role() = 'authenticated');
create policy "update_policy_brief_authenticated" on policy_brief for update using (auth.role() = 'authenticated');
create policy "write_stakeholder_authenticated" on stakeholder for insert with check (auth.role() = 'authenticated');
create policy "write_dokumen_authenticated" on dokumen for insert with check (auth.role() = 'authenticated');
create policy "write_riwayat_authenticated" on aspirasi_riwayat for insert with check (auth.role() = 'authenticated');
create policy "write_weekly_report_authenticated" on weekly_report for insert with check (auth.role() = 'authenticated');
create policy "write_kabupaten_authenticated" on kabupaten for update using (auth.role() = 'authenticated');

-- ------------------------------------------------------------
-- SEED: 8 Kabupaten Papua Pegunungan
-- ------------------------------------------------------------
insert into kabupaten (kode, nama) values
  ('01', 'Jayawijaya'),
  ('02', 'Pegunungan Bintang'),
  ('03', 'Yahukimo'),
  ('04', 'Tolikara'),
  ('05', 'Mamberamo Tengah'),
  ('06', 'Yalimo'),
  ('07', 'Lanny Jaya'),
  ('08', 'Nduga');

-- ------------------------------------------------------------
-- TRIGGER: auto-update updated_at
-- ------------------------------------------------------------
create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger trg_aspirasi_updated before update on aspirasi
  for each row execute function set_updated_at();
create trigger trg_policy_brief_updated before update on policy_brief
  for each row execute function set_updated_at();
