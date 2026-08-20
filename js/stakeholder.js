// ============================================================
// Si MAMA — Modul Stakeholder Database
// ============================================================

let currentProfileS = null;

(async function initStakeholder() {
  currentProfileS = await requireAuth();
  if (!currentProfileS) return;
  applyRoleVisibility(currentProfileS);

  await loadKabupatenOptionsS();
  await loadStakeholderList();

  document.getElementById("btn-new").addEventListener("click", () => openModal());
  document.getElementById("stakeholder-form").addEventListener("submit", handleSubmit);

  ["filter-kategori", "filter-kabupaten"].forEach((id) =>
    document.getElementById(id).addEventListener("change", loadStakeholderList)
  );
  document.getElementById("filter-search").addEventListener("input", debounceS(loadStakeholderList, 300));
})();

function debounceS(fn, delay) {
  let t;
  return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), delay); };
}

async function loadKabupatenOptionsS() {
  const { data, error } = await supabaseClient.from("kabupaten").select("id, nama").order("kode");
  if (error) { console.error(error); return; }
  const filterKab = document.getElementById("filter-kabupaten");
  const formKab = document.getElementById("f-kabupaten");
  (data || []).forEach((k) => {
    filterKab.innerHTML += `<option value="${k.id}">${k.nama}</option>`;
    formKab.innerHTML += `<option value="${k.id}">${k.nama}</option>`;
  });
}

async function loadStakeholderList() {
  const tbody = document.getElementById("stakeholder-tbody");
  tbody.innerHTML = '<tr><td colspan="5" style="color:var(--ink-soft);">Memuat data...</td></tr>';

  let query = supabaseClient
    .from("stakeholder")
    .select("nama, kategori, jabatan, kontak, kabupaten:kabupaten_id(nama)")
    .order("nama");

  const kategori = document.getElementById("filter-kategori").value;
  const kabId = document.getElementById("filter-kabupaten").value;
  const search = document.getElementById("filter-search").value.trim();

  if (kategori) query = query.eq("kategori", kategori);
  if (kabId) query = query.eq("kabupaten_id", kabId);
  if (search) query = query.ilike("nama", `%${search}%`);

  const { data, error } = await query;

  if (error) {
    tbody.innerHTML = `<tr><td colspan="5" style="color:var(--red-500);">Gagal memuat data: ${error.message}</td></tr>`;
    return;
  }
  if (!data.length) {
    tbody.innerHTML = '<tr><td colspan="5" style="color:var(--ink-soft);">Belum ada stakeholder yang cocok dengan filter.</td></tr>';
    return;
  }

  const kategoriColor = {
    Pemerintah: "badge-blue", Legislatif: "badge-blue",
    "Tokoh Masyarakat": "badge-amber", "Tokoh Adat": "badge-amber", "Tokoh Agama": "badge-amber",
  };

  tbody.innerHTML = data.map((s) => `
    <tr>
      <td><strong>${s.nama}</strong></td>
      <td><span class="badge ${kategoriColor[s.kategori] || "badge-gray"}">${s.kategori}</span></td>
      <td>${s.jabatan || "-"}</td>
      <td>${s.kabupaten?.nama || "-"}</td>
      <td>${s.kontak || "-"}</td>
    </tr>
  `).join("");
}

function openModal() {
  document.getElementById("form-error").textContent = "";
  document.getElementById("stakeholder-form").reset();
  document.getElementById("modal-overlay").style.display = "flex";
}

function closeModal() {
  document.getElementById("modal-overlay").style.display = "none";
}

async function handleSubmit(e) {
  e.preventDefault();
  const errorEl = document.getElementById("form-error");
  errorEl.textContent = "";

  const nama = document.getElementById("f-nama").value.trim();
  if (!nama) {
    errorEl.textContent = "Nama wajib diisi.";
    return;
  }

  const payload = {
    nama,
    kategori: document.getElementById("f-kategori").value,
    jabatan: document.getElementById("f-jabatan").value.trim(),
    kabupaten_id: document.getElementById("f-kabupaten").value || null,
    kontak: document.getElementById("f-kontak").value.trim(),
    catatan: document.getElementById("f-catatan").value.trim(),
  };

  const submitBtn = document.getElementById("form-submit-btn");
  submitBtn.disabled = true;
  submitBtn.textContent = "Menyimpan...";

  const { error } = await supabaseClient.from("stakeholder").insert(payload);

  submitBtn.disabled = false;
  submitBtn.textContent = "Simpan Stakeholder";

  if (error) {
    errorEl.textContent = "Gagal menyimpan: " + error.message;
    return;
  }

  closeModal();
  await loadStakeholderList();
}
