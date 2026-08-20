// ============================================================
// Si MAMA — Modul Policy Brief Center
// ============================================================

let currentProfilePB = null;
let briefCache = [];

(async function initPolicyBrief() {
  currentProfilePB = await requireAuth();
  if (!currentProfilePB) return;
  applyRoleVisibility(currentProfilePB);

  await loadBriefGrid();

  document.getElementById("btn-new").addEventListener("click", () => openModal());
  document.getElementById("brief-form").addEventListener("submit", handleSubmit);
  document.getElementById("filter-status").addEventListener("change", loadBriefGrid);
  document.getElementById("filter-search").addEventListener("input", debouncePB(loadBriefGrid, 300));
})();

function debouncePB(fn, delay) {
  let t;
  return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), delay); };
}

async function loadBriefGrid() {
  const grid = document.getElementById("brief-grid");
  grid.innerHTML = '<div class="card">Memuat data...</div>';

  let query = supabaseClient.from("policy_brief").select("*").order("created_at", { ascending: false });

  const status = document.getElementById("filter-status").value;
  const search = document.getElementById("filter-search").value.trim();
  if (status) query = query.eq("status", status);
  if (search) query = query.ilike("judul", `%${search}%`);

  const { data, error } = await query;

  if (error) {
    grid.innerHTML = `<div class="card" style="color:var(--red-500);">Gagal memuat data: ${error.message}</div>`;
    return;
  }

  briefCache = data;

  if (!data.length) {
    grid.innerHTML = '<div class="card" style="color:var(--ink-soft);">Belum ada kajian. Klik "+ Kajian Baru" untuk mulai menulis.</div>';
    return;
  }

  const statusBadge = { draft: "badge-gray", review: "badge-amber", terbit: "badge-green" };
  const statusLabel = { draft: "Draft", review: "Review", terbit: "Terbit" };

  grid.innerHTML = data.map((b) => `
    <div class="card" style="cursor:pointer;" onclick="openModal('${b.id}')">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:10px;">
        <span class="badge ${statusBadge[b.status] || "badge-gray"}">${statusLabel[b.status] || b.status}</span>
        <span style="font-size:12px;color:var(--ink-soft);">${new Date(b.created_at).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}</span>
      </div>
      <h3 style="font-size:16px;line-height:1.35;margin-bottom:8px;">${b.judul}</h3>
      <p style="font-size:13px;color:var(--ink-soft);">
        ${b.masalah ? truncatePB(b.masalah, 100) : "Belum ada rumusan masalah."}
      </p>
    </div>
  `).join("");
}

function truncatePB(text, len) {
  return text.length > len ? text.slice(0, len) + "…" : text;
}

function openModal(id = null) {
  document.getElementById("form-error").textContent = "";
  const b = id ? briefCache.find((row) => row.id === id) : null;

  document.getElementById("modal-title").textContent = b ? "Edit Kajian" : "Kajian Baru";
  document.getElementById("f-id").value = b?.id || "";
  document.getElementById("f-judul").value = b?.judul || "";
  document.getElementById("f-masalah").value = b?.masalah || "";
  document.getElementById("f-data").value = b?.data_pendukung || "";
  document.getElementById("f-analisis").value = b?.analisis || "";
  document.getElementById("f-dampak").value = b?.dampak || "";
  document.getElementById("f-kebijakan").value = b?.kebijakan_ada || "";
  document.getElementById("f-gap").value = b?.gap || "";
  document.getElementById("f-rekomendasi").value = b?.rekomendasi || "";
  document.getElementById("f-status").value = b?.status || "draft";

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
  if (!judul) {
    errorEl.textContent = "Judul kajian wajib diisi.";
    return;
  }

  const payload = {
    judul,
    masalah: document.getElementById("f-masalah").value.trim(),
    data_pendukung: document.getElementById("f-data").value.trim(),
    analisis: document.getElementById("f-analisis").value.trim(),
    dampak: document.getElementById("f-dampak").value.trim(),
    kebijakan_ada: document.getElementById("f-kebijakan").value.trim(),
    gap: document.getElementById("f-gap").value.trim(),
    rekomendasi: document.getElementById("f-rekomendasi").value.trim(),
    status: document.getElementById("f-status").value,
  };

  const id = document.getElementById("f-id").value;
  const submitBtn = document.getElementById("form-submit-btn");
  submitBtn.disabled = true;
  submitBtn.textContent = "Menyimpan...";

  let error;
  if (id) {
    ({ error } = await supabaseClient.from("policy_brief").update(payload).eq("id", id));
  } else {
    payload.dibuat_oleh = currentProfilePB.id;
    ({ error } = await supabaseClient.from("policy_brief").insert(payload));
  }

  submitBtn.disabled = false;
  submitBtn.textContent = "Simpan Kajian";

  if (error) {
    errorEl.textContent = "Gagal menyimpan: " + error.message;
    return;
  }

  closeModal();
  await loadBriefGrid();
}
