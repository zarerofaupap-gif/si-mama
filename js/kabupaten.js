// ============================================================
// Si MAMA — Modul Data Kabupaten (Regional Database)
// 8 kabupaten sudah ada (seed dari schema.sql) — modul ini
// untuk melihat & melengkapi profil masing-masing, bukan
// tambah/hapus kabupaten baru.
// ============================================================

let currentProfileK = null;
let kabupatenCache = [];

(async function initKabupaten() {
  currentProfileK = await requireAuth();
  if (!currentProfileK) return;
  applyRoleVisibility(currentProfileK);

  await loadKabupatenGrid();

  document.getElementById("kabupaten-form").addEventListener("submit", handleSubmit);
})();

async function loadKabupatenGrid() {
  const grid = document.getElementById("kabupaten-grid");

  const { data, error } = await supabaseClient
    .from("kabupaten")
    .select("*")
    .order("kode");

  if (error) {
    grid.innerHTML = `<div class="card" style="color:var(--red-500);">Gagal memuat data: ${error.message}</div>`;
    return;
  }

  kabupatenCache = data;

  // Hitung jumlah aspirasi per kabupaten sebagai konteks cepat di kartu
  const { data: aspirasiCounts } = await supabaseClient
    .from("aspirasi")
    .select("kabupaten_id");

  const countMap = {};
  (aspirasiCounts || []).forEach((a) => {
    countMap[a.kabupaten_id] = (countMap[a.kabupaten_id] || 0) + 1;
  });

  grid.innerHTML = data.map((k) => {
    const isLengkap = k.demografi && k.permasalahan_utama;
    const jumlahAspirasi = countMap[k.id] || 0;
    return `
      <div class="card" style="cursor:pointer;" onclick="openModal('${k.id}')">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:8px;">
          <div>
            <div style="font-size:11px;color:var(--ochre-600);font-weight:700;letter-spacing:0.04em;">
              KABUPATEN ${k.kode}
            </div>
            <h3 style="font-size:17px;margin-top:2px;">${k.nama}</h3>
          </div>
          <span class="badge ${isLengkap ? "badge-green" : "badge-gray"}">
            ${isLengkap ? "Profil terisi" : "Belum lengkap"}
          </span>
        </div>
        <p style="font-size:13px;color:var(--ink-soft);margin:8px 0;min-height:36px;">
          ${k.permasalahan_utama ? truncate(k.permasalahan_utama, 90) : "Belum ada catatan permasalahan utama."}
        </p>
        <div style="font-size:12px;color:var(--ink-soft);border-top:1px solid var(--stone-100);padding-top:8px;margin-top:8px;">
          ${jumlahAspirasi} aspirasi tercatat
        </div>
      </div>
    `;
  }).join("");
}

function truncate(text, len) {
  return text.length > len ? text.slice(0, len) + "…" : text;
}

function openModal(id) {
  // id datang sebagai string dari atribut onclick, sementara kabupaten.id
  // di database bertipe integer (serial) — bandingkan sebagai string.
  const k = kabupatenCache.find((row) => String(row.id) === String(id));
  if (!k) return;

  document.getElementById("modal-title").textContent = k.nama;
  document.getElementById("modal-updated").textContent = k.updated_at
    ? "Terakhir diperbarui: " + new Date(k.updated_at).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })
    : "Belum pernah diperbarui";
  document.getElementById("form-error").textContent = "";

  document.getElementById("f-id").value = k.id;
  document.getElementById("f-demografi").value = k.demografi || "";
  document.getElementById("f-ekonomi").value = k.ekonomi || "";
  document.getElementById("f-pendidikan").value = k.pendidikan || "";
  document.getElementById("f-kesehatan").value = k.kesehatan || "";
  document.getElementById("f-infrastruktur").value = k.infrastruktur || "";
  document.getElementById("f-potensi").value = k.potensi_daerah || "";
  document.getElementById("f-permasalahan").value = k.permasalahan_utama || "";
  document.getElementById("f-program").value = k.program_pemerintah || "";

  document.getElementById("modal-overlay").style.display = "flex";
}

function closeModal() {
  document.getElementById("modal-overlay").style.display = "none";
}

async function handleSubmit(e) {
  e.preventDefault();
  const errorEl = document.getElementById("form-error");
  errorEl.textContent = "";

  const id = document.getElementById("f-id").value;
  const payload = {
    demografi: document.getElementById("f-demografi").value.trim(),
    ekonomi: document.getElementById("f-ekonomi").value.trim(),
    pendidikan: document.getElementById("f-pendidikan").value.trim(),
    kesehatan: document.getElementById("f-kesehatan").value.trim(),
    infrastruktur: document.getElementById("f-infrastruktur").value.trim(),
    potensi_daerah: document.getElementById("f-potensi").value.trim(),
    permasalahan_utama: document.getElementById("f-permasalahan").value.trim(),
    program_pemerintah: document.getElementById("f-program").value.trim(),
    updated_at: new Date().toISOString(),
    updated_by: currentProfileK.id,
  };

  const submitBtn = document.getElementById("form-submit-btn");
  submitBtn.disabled = true;
  submitBtn.textContent = "Menyimpan...";

  const { error } = await supabaseClient.from("kabupaten").update(payload).eq("id", id);

  submitBtn.disabled = false;
  submitBtn.textContent = "Simpan Perubahan";

  if (error) {
    errorEl.textContent = "Gagal menyimpan: " + error.message;
    return;
  }

  closeModal();
  await loadKabupatenGrid();
}
