// ============================================================
// Si MAMA — Modul Aspirasi
// List, filter, tambah, edit status.
// ============================================================

let kabupatenList = [];
let currentProfile = null;

(async function initAspirasi() {
  currentProfile = await requireAuth();
  if (!currentProfile) return;
  applyRoleVisibility(currentProfile);

  await loadKabupatenOptions();
  populateFilterOptions();
  await loadAspirasi();

  document.getElementById("btn-new").addEventListener("click", () => openModal());
  document.getElementById("aspirasi-form").addEventListener("submit", handleSubmit);

  ["filter-kabupaten", "filter-bidang", "filter-status"].forEach((id) =>
    document.getElementById(id).addEventListener("change", loadAspirasi)
  );
  document.getElementById("filter-search").addEventListener("input", debounce(loadAspirasi, 300));

  // Buka modal otomatis jika datang dari dashboard dengan ?new=1
  if (new URLSearchParams(window.location.search).get("new") === "1") openModal();
})();

function debounce(fn, delay) {
  let t;
  return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), delay); };
}

async function loadKabupatenOptions() {
  const { data, error } = await supabaseClient.from("kabupaten").select("id, nama").order("kode");
  if (error) { console.error(error); return; }
  kabupatenList = data || [];
}

function populateFilterOptions() {
  const filterKab = document.getElementById("filter-kabupaten");
  const formKab = document.getElementById("f-kabupaten");
  kabupatenList.forEach((k) => {
    filterKab.innerHTML += `<option value="${k.id}">${k.nama}</option>`;
    formKab.innerHTML += `<option value="${k.id}">${k.nama}</option>`;
  });

  const bidangValues = ["Pendidikan","Infrastruktur","Kesehatan","Ekonomi","Pemerintahan","Sosial","Pertanian","Telekomunikasi","Transportasi","Keamanan","Lainnya"];
  const filterBidang = document.getElementById("filter-bidang");
  bidangValues.forEach((b) => filterBidang.innerHTML += `<option value="${b}">${b}</option>`);

  const filterStatus = document.getElementById("filter-status");
  Object.entries(STATUS_LABELS).forEach(([key, val]) => {
    filterStatus.innerHTML += `<option value="${key}">${val.label}</option>`;
  });
}

async function loadAspirasi() {
  const tbody = document.getElementById("aspirasi-tbody");
  tbody.innerHTML = '<tr><td colspan="7" style="color:var(--ink-soft);">Memuat data...</td></tr>';

  let query = supabaseClient
    .from("aspirasi")
    .select("id, judul, bidang, tingkat_urgensi, status, tanggal_penyampaian, kabupaten:kabupaten_id(nama)")
    .order("created_at", { ascending: false });

  const kabId = document.getElementById("filter-kabupaten").value;
  const bidang = document.getElementById("filter-bidang").value;
  const status = document.getElementById("filter-status").value;
  const search = document.getElementById("filter-search").value.trim();

  if (kabId) query = query.eq("kabupaten_id", kabId);
  if (bidang) query = query.eq("bidang", bidang);
  if (status) query = query.eq("status", status);
  if (search) query = query.ilike("judul", `%${search}%`);

  const { data, error } = await query;

  if (error) {
    tbody.innerHTML = `<tr><td colspan="7" style="color:var(--red-500);">Gagal memuat data: ${error.message}</td></tr>`;
    return;
  }

  if (!data.length) {
    tbody.innerHTML = '<tr><td colspan="7" style="color:var(--ink-soft);">Tidak ada aspirasi yang cocok dengan filter.</td></tr>';
    return;
  }

  tbody.innerHTML = data.map((a) => {
    const s = STATUS_LABELS[a.status] || { label: a.status, badge: "badge-gray" };
    const urgColor = a.tingkat_urgensi === "Tinggi" ? "badge-red" : a.tingkat_urgensi === "Rendah" ? "badge-gray" : "badge-amber";
    return `
      <tr>
        <td><strong>${a.judul}</strong></td>
        <td>${a.kabupaten?.nama || "-"}</td>
        <td>${a.bidang}</td>
        <td><span class="badge ${urgColor}">${a.tingkat_urgensi || "-"}</span></td>
        <td><span class="badge ${s.badge}">${s.label}</span></td>
        <td>${new Date(a.tanggal_penyampaian).toLocaleDateString("id-ID")}</td>
        <td><button class="btn btn-outline" style="padding:6px 12px;" onclick="editAspirasi('${a.id}')">Edit</button></td>
      </tr>
    `;
  }).join("");
}

async function editAspirasi(id) {
  const { data, error } = await supabaseClient.from("aspirasi").select("*").eq("id", id).single();
  if (error || !data) { alert("Gagal memuat data aspirasi."); return; }
  openModal(data);
}

function openModal(data = null) {
  document.getElementById("modal-title").textContent = data ? "Edit Aspirasi" : "Tambah Aspirasi";
  document.getElementById("form-error").textContent = "";
  document.getElementById("f-id").value = data?.id || "";
  document.getElementById("f-judul").value = data?.judul || "";
  document.getElementById("f-deskripsi").value = data?.deskripsi || "";
  document.getElementById("f-kabupaten").value = data?.kabupaten_id || "";
  document.getElementById("f-kampung").value = data?.kampung || "";
  document.getElementById("f-bidang").value = data?.bidang || "Pendidikan";
  document.getElementById("f-urgensi").value = data?.tingkat_urgensi || "Sedang";
  document.getElementById("f-instansi").value = data?.instansi_berwenang || "";
  document.getElementById("f-senator").value = data?.senator_penanggung_jawab || "";
  document.getElementById("f-status").value = data?.status || "RECEIVED";
  document.getElementById("f-tanggal").value = data?.tanggal_penyampaian || new Date().toISOString().slice(0, 10);
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
  const kabupatenId = document.getElementById("f-kabupaten").value;
  const tanggal = document.getElementById("f-tanggal").value;

  if (!judul || !kabupatenId || !tanggal) {
    errorEl.textContent = "Judul, kabupaten, dan tanggal wajib diisi.";
    return;
  }

  const payload = {
    judul,
    deskripsi: document.getElementById("f-deskripsi").value.trim(),
    kabupaten_id: kabupatenId,
    kampung: document.getElementById("f-kampung").value.trim(),
    bidang: document.getElementById("f-bidang").value,
    tingkat_urgensi: document.getElementById("f-urgensi").value,
    instansi_berwenang: document.getElementById("f-instansi").value.trim(),
    senator_penanggung_jawab: document.getElementById("f-senator").value.trim(),
    status: document.getElementById("f-status").value,
    tanggal_penyampaian: tanggal,
  };

  const id = document.getElementById("f-id").value;
  const submitBtn = document.getElementById("form-submit-btn");
  submitBtn.disabled = true;
  submitBtn.textContent = "Menyimpan...";

  let error;
  if (id) {
    ({ error } = await supabaseClient.from("aspirasi").update(payload).eq("id", id));
  } else {
    payload.dibuat_oleh = currentProfile.id;
    ({ error } = await supabaseClient.from("aspirasi").insert(payload));
  }

  submitBtn.disabled = false;
  submitBtn.textContent = "Simpan Aspirasi";

  if (error) {
    errorEl.textContent = "Gagal menyimpan: " + error.message;
    return;
  }

  closeModal();
  await loadAspirasi();
}
