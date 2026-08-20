// ============================================================
// Si MAMA — Modul Arsip Dokumen (Digital Knowledge Center)
// Upload file ke Supabase Storage bucket 'dokumen',
// metadata disimpan di tabel dokumen.
// ============================================================

let currentProfileD = null;

(async function initArsip() {
  currentProfileD = await requireAuth();
  if (!currentProfileD) return;
  applyRoleVisibility(currentProfileD);

  await loadKabupatenOptionsD();
  await loadDokumenList();

  document.getElementById("btn-new").addEventListener("click", () => openModal());
  document.getElementById("dokumen-form").addEventListener("submit", handleSubmit);

  ["filter-kategori", "filter-kabupaten"].forEach((id) =>
    document.getElementById(id).addEventListener("change", loadDokumenList)
  );
  document.getElementById("filter-search").addEventListener("input", debounceD(loadDokumenList, 300));
})();

function debounceD(fn, delay) {
  let t;
  return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), delay); };
}

async function loadKabupatenOptionsD() {
  const { data, error } = await supabaseClient.from("kabupaten").select("id, nama").order("kode");
  if (error) { console.error(error); return; }
  const filterKab = document.getElementById("filter-kabupaten");
  const formKab = document.getElementById("f-kabupaten");
  (data || []).forEach((k) => {
    filterKab.innerHTML += `<option value="${k.id}">${k.nama}</option>`;
    formKab.innerHTML += `<option value="${k.id}">${k.nama}</option>`;
  });
}

async function loadDokumenList() {
  const tbody = document.getElementById("dokumen-tbody");
  tbody.innerHTML = '<tr><td colspan="5" style="color:var(--ink-soft);">Memuat data...</td></tr>';

  let query = supabaseClient
    .from("dokumen")
    .select("id, judul, kategori, file_path, created_at, kabupaten:kabupaten_id(nama)")
    .order("created_at", { ascending: false });

  const kategori = document.getElementById("filter-kategori").value;
  const kabId = document.getElementById("filter-kabupaten").value;
  const search = document.getElementById("filter-search").value.trim();

  if (kategori) query = query.eq("kategori", kategori);
  if (kabId) query = query.eq("kabupaten_id", kabId);
  if (search) query = query.ilike("judul", `%${search}%`);

  const { data, error } = await query;

  if (error) {
    tbody.innerHTML = `<tr><td colspan="5" style="color:var(--red-500);">Gagal memuat data: ${error.message}</td></tr>`;
    return;
  }
  if (!data.length) {
    tbody.innerHTML = '<tr><td colspan="5" style="color:var(--ink-soft);">Belum ada dokumen yang cocok dengan filter.</td></tr>';
    return;
  }

  tbody.innerHTML = data.map((d) => `
    <tr>
      <td><strong>${d.judul}</strong></td>
      <td><span class="badge badge-gray">${d.kategori}</span></td>
      <td>${d.kabupaten?.nama || "-"}</td>
      <td>${new Date(d.created_at).toLocaleDateString("id-ID")}</td>
      <td><button class="btn btn-outline" style="padding:6px 12px;" onclick="downloadDokumen('${d.file_path}')">Unduh</button></td>
    </tr>
  `).join("");
}

async function downloadDokumen(filePath) {
  // Bucket bersifat private, jadi kita buat signed URL yang berlaku 60 detik
  const { data, error } = await supabaseClient
    .storage
    .from("dokumen")
    .createSignedUrl(filePath, 60);

  if (error || !data?.signedUrl) {
    alert("Gagal membuka dokumen: " + (error?.message || "URL tidak ditemukan"));
    return;
  }
  window.open(data.signedUrl, "_blank");
}

function openModal() {
  document.getElementById("form-error").textContent = "";
  document.getElementById("dokumen-form").reset();
  document.getElementById("modal-overlay").style.display = "flex";
}

function closeModal() {
  document.getElementById("modal-overlay").style.display = "none";
}

async function handleSubmit(e) {
  e.preventDefault();
  const errorEl = document.getElementById("form-error");
  errorEl.textContent = "";

  const judul = document.getElementById("f-judul").value.trim();
  const fileInput = document.getElementById("f-file");
  const file = fileInput.files[0];

  if (!judul || !file) {
    errorEl.textContent = "Judul dan file wajib diisi.";
    return;
  }
  if (file.size > 20 * 1024 * 1024) {
    errorEl.textContent = "Ukuran file maksimal 20MB.";
    return;
  }

  const submitBtn = document.getElementById("form-submit-btn");
  submitBtn.disabled = true;
  submitBtn.textContent = "Mengunggah...";

  // Nama file unik: timestamp + nama asli, biar tidak bentrok antar upload
  const safeName = file.name.replace(/[^a-zA-Z0-9.\-_]/g, "_");
  const filePath = `${Date.now()}_${safeName}`;

  const { error: uploadError } = await supabaseClient
    .storage
    .from("dokumen")
    .upload(filePath, file);

  if (uploadError) {
    submitBtn.disabled = false;
    submitBtn.textContent = "Unggah";
    errorEl.textContent = "Gagal unggah file: " + uploadError.message +
      ". Pastikan bucket Storage 'dokumen' sudah dibuat di Supabase (lihat storage_setup.sql).";
    return;
  }

  const payload = {
    judul,
    kategori: document.getElementById("f-kategori").value,
    kabupaten_id: document.getElementById("f-kabupaten").value || null,
    file_path: filePath,
    file_type: file.type,
    diunggah_oleh: currentProfileD.id,
  };

  const { error: dbError } = await supabaseClient.from("dokumen").insert(payload);

  submitBtn.disabled = false;
  submitBtn.textContent = "Unggah";

  if (dbError) {
    errorEl.textContent = "File terunggah tapi gagal menyimpan data: " + dbError.message;
    return;
  }

  closeModal();
  await loadDokumenList();
}
