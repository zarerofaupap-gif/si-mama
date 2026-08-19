// ============================================================
// Si MAMA — Modul Isu Strategis (Issue Tracker)
// Top 10 mingguan + list lengkap dengan filter.
// ============================================================

let currentProfileI = null;

(async function initIsu() {
  currentProfileI = await requireAuth();
  if (!currentProfileI) return;
  applyRoleVisibility(currentProfileI);

  await loadKabupatenOptionsIsu();
  setMingguLabel();
  await loadTop10();
  await loadIsuList();

  document.getElementById("btn-new").addEventListener("click", () => openModal());
  document.getElementById("isu-form").addEventListener("submit", handleSubmit);

  ["filter-kabupaten", "filter-sumber", "filter-prioritas"].forEach((id) =>
    document.getElementById(id).addEventListener("change", loadIsuList)
  );
  document.getElementById("filter-search").addEventListener("input", debounceIsu(loadIsuList, 300));
})();

function debounceIsu(fn, delay) {
  let t;
  return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), delay); };
}

function setMingguLabel() {
  const now = new Date();
  const day = now.getDay();
  const diffToMonday = (day === 0 ? -6 : 1) - day;
  const monday = new Date(now);
  monday.setDate(now.getDate() + diffToMonday);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);

  const fmt = (d) => d.toLocaleDateString("id-ID", { day: "numeric", month: "short" });
  document.getElementById("minggu-label").textContent = `Minggu ${fmt(monday)} – ${fmt(sunday)}`;
}

async function loadKabupatenOptionsIsu() {
  const { data, error } = await supabaseClient.from("kabupaten").select("id, nama").order("kode");
  if (error) { console.error(error); return; }
  const filterKab = document.getElementById("filter-kabupaten");
  const formKab = document.getElementById("f-kabupaten");
  (data || []).forEach((k) => {
    filterKab.innerHTML += `<option value="${k.id}">${k.nama}</option>`;
    formKab.innerHTML += `<option value="${k.id}">${k.nama}</option>`;
  });
}

async function loadTop10() {
  const el = document.getElementById("top10-list");

  const { data, error } = await supabaseClient
    .from("isu_strategis")
    .select("judul, kategori, tingkat_prioritas, kabupaten:kabupaten_id(nama)")
    .order("created_at", { ascending: false })
    .limit(10);

  if (error) {
    el.innerHTML = `<p style="color:var(--red-500);font-size:13px;">Gagal memuat: ${error.message}</p>`;
    return;
  }
  if (!data.length) {
    el.innerHTML = '<p style="color:var(--ink-soft);font-size:13px;">Belum ada isu tercatat minggu ini. Klik "+ Tambah Isu" untuk mulai mencatat.</p>';
    return;
  }

  const prioColor = { Tinggi: "badge-red", Sedang: "badge-amber", Rendah: "badge-gray" };
  el.innerHTML = data.map((isu, i) => `
    <div style="display:flex;justify-content:space-between;align-items:center;padding:10px 0;border-bottom:1px solid var(--stone-100);">
      <div>
        <span style="font-weight:600;color:var(--navy-800);">${i + 1}.</span>
        <span style="font-size:14px;">${isu.judul}</span>
        <span style="font-size:12px;color:var(--ink-soft);"> — ${isu.kategori}${isu.kabupaten ? " · " + isu.kabupaten.nama : ""}</span>
      </div>
      <span class="badge ${prioColor[isu.tingkat_prioritas] || "badge-gray"}">${isu.tingkat_prioritas || "-"}</span>
    </div>
  `).join("");
}

async function loadIsuList() {
  const tbody = document.getElementById("isu-tbody");
  tbody.innerHTML = '<tr><td colspan="6" style="color:var(--ink-soft);">Memuat data...</td></tr>';

  let query = supabaseClient
    .from("isu_strategis")
    .select("judul, kategori, sumber, tingkat_prioritas, created_at, kabupaten:kabupaten_id(nama)")
    .order("created_at", { ascending: false });

  const kabId = document.getElementById("filter-kabupaten").value;
  const sumber = document.getElementById("filter-sumber").value;
  const prioritas = document.getElementById("filter-prioritas").value;
  const search = document.getElementById("filter-search").value.trim();

  if (kabId) query = query.eq("kabupaten_id", kabId);
  if (sumber) query = query.eq("sumber", sumber);
  if (prioritas) query = query.eq("tingkat_prioritas", prioritas);
  if (search) query = query.ilike("judul", `%${search}%`);

  const { data, error } = await query;

  if (error) {
    tbody.innerHTML = `<tr><td colspan="6" style="color:var(--red-500);">Gagal memuat data: ${error.message}</td></tr>`;
    return;
  }
  if (!data.length) {
    tbody.innerHTML = '<tr><td colspan="6" style="color:var(--ink-soft);">Tidak ada isu yang cocok dengan filter.</td></tr>';
    return;
  }

  const prioColor = { Tinggi: "badge-red", Sedang: "badge-amber", Rendah: "badge-gray" };
  tbody.innerHTML = data.map((isu) => `
    <tr>
      <td><strong>${isu.judul}</strong></td>
      <td>${isu.kategori}</td>
      <td>${isu.kabupaten?.nama || "-"}</td>
      <td>${isu.sumber || "-"}</td>
      <td><span class="badge ${prioColor[isu.tingkat_prioritas] || "badge-gray"}">${isu.tingkat_prioritas || "-"}</span></td>
      <td>${new Date(isu.created_at).toLocaleDateString("id-ID")}</td>
    </tr>
  `).join("");
}

function openModal() {
  document.getElementById("form-error").textContent = "";
  document.getElementById("isu-form").reset();
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
  const kategori = document.getElementById("f-kategori").value.trim();

  if (!judul || !kategori) {
    errorEl.textContent = "Judul dan kategori wajib diisi.";
    return;
  }

  const now = new Date();
  const day = now.getDay();
  const diffToMonday = (day === 0 ? -6 : 1) - day;
  const monday = new Date(now);
  monday.setDate(now.getDate() + diffToMonday);

  const payload = {
    judul,
    kategori,
    deskripsi: document.getElementById("f-deskripsi").value.trim(),
    sumber: document.getElementById("f-sumber").value,
    tingkat_prioritas: document.getElementById("f-prioritas").value,
    kabupaten_id: document.getElementById("f-kabupaten").value || null,
    minggu_ke: monday.toISOString().slice(0, 10),
    dibuat_oleh: currentProfileI.id,
  };

  const submitBtn = document.getElementById("form-submit-btn");
  submitBtn.disabled = true;
  submitBtn.textContent = "Menyimpan...";

  const { error } = await supabaseClient.from("isu_strategis").insert(payload);

  submitBtn.disabled = false;
  submitBtn.textContent = "Simpan Isu";

  if (error) {
    errorEl.textContent = "Gagal menyimpan: " + error.message;
    return;
  }

  closeModal();
  await loadTop10();
  await loadIsuList();
}
