-- ============================================================
-- Si MAMA — Setup Supabase Storage untuk Modul Arsip Dokumen
-- Jalankan SETELAH schema.sql, di SQL Editor Supabase yang sama.
-- ============================================================

-- 1. Buat bucket penyimpanan bernama 'dokumen'.
--    private = true, karena arsip ini internal kantor, bukan publik.
insert into storage.buckets (id, name, public)
values ('dokumen', 'dokumen', false)
on conflict (id) do nothing;

-- 2. Policy: user yang sudah login boleh upload file ke bucket 'dokumen'
create policy "authenticated_upload_dokumen"
on storage.objects for insert
to authenticated
with check (bucket_id = 'dokumen');

-- 3. Policy: user yang sudah login boleh membaca/download file di bucket 'dokumen'
create policy "authenticated_read_dokumen"
on storage.objects for select
to authenticated
using (bucket_id = 'dokumen');

-- 4. (Opsional) Policy: user yang sudah login boleh hapus file di bucket 'dokumen'
--    Kalau tidak mau sembarang user bisa hapus arsip, skip bagian ini
--    dan atur penghapusan hanya lewat Admin di dashboard Supabase.
create policy "authenticated_delete_dokumen"
on storage.objects for delete
to authenticated
using (bucket_id = 'dokumen');

-- ============================================================
-- CARA MENJALANKAN (kalau lewat SQL Editor error karena
-- storage.objects sudah punya RLS bawaan yang restricted):
--
-- Alternatif lebih mudah lewat Dashboard (tanpa SQL):
-- 1. Buka Supabase Dashboard → menu "Storage" di sidebar kiri
-- 2. Klik "New bucket"
-- 3. Nama bucket: dokumen
-- 4. Public bucket: OFF (biarkan private)
-- 5. Klik "Create bucket"
-- 6. Klik bucket "dokumen" yang baru dibuat → tab "Policies"
-- 7. Klik "New policy" → pilih template "Allow authenticated users
--    to upload/select/delete" (atau buat manual seperti SQL di atas)
-- ============================================================
