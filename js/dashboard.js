// ============================================================
// Si MAMA — Dashboard logic
// ============================================================

(async function initDashboard() {
  const profile = await requireAuth();
  if (!profile) return;
  applyRoleVisibility(profile);

  document.getElementById("topbar-date").textContent =
    new Date().toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

  await Promise.all([loadStats(), loadBidangBreakdown(), loadTopIsu(), loadRecentAspirasi()]);
})();

async function loadStats() {
  const { data, error } = await supabaseClient.from("aspirasi").select("status");
  if (error) {
    console.error(error);
    return;
  }
  const total = data.length;
  const selesai = data.filter((a) => a.status === "COMPLETED").length;
  const proses = data.filter((a) => a.status === "IN_PROGRESS" || a.status === "SUBMITTED").length;
  const belum = data.filter((a) => a.status === "BELUM_DITINDAKLANJUTI").length;

  document.getElementById("stat-total").textContent = total;
  document.getElementById("stat-selesai").textContent = selesai;
  document.getElementById("stat-proses").textContent = proses;
  document.getElementById("stat-belum").textContent = belum;
}

async function loadBidangBreakdown() {
  const { data, error } = await supabaseClient.from("aspirasi").select("bidang");
  const el = document.getElementById("bidang-breakdown");
  if (error || !data.length) {
    el.innerHTML = '<p style="color:var(--ink-soft);font-size:13px;">Belum ada data aspirasi.</p>';
    return;
  }

  const counts = {};
  data.forEach((a) => { counts[a.bidang] = (counts[a.bidang] || 0) + 1; });
  const max = Math.max(...Object.values(counts));

  el.innerHTML = Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .map(([bidang, count]) => `
      <div style="margin-bottom:10px;">
        <div style="display:flex;justify-content:space-between;font-size:13px;margin-bottom:4px;">
          <span>${bidang}</span><span style="font-weight:600;">${count}</span>
        </div>
        <div style="background:var(--stone-100);border-radius:4px;height:6px;overflow:hidden;">
          <div style="background:var(--ochre-600);height:100%;width:${(count / max) * 100}%;"></div>
        </div>
      </div>
    `).join("");
}

async function loadTopIsu() {
  const { data, error } = await supabaseClient
    .from("isu_strategis")
    .select("judul, tingkat_prioritas")
    .order("created_at", { ascending: false })
    .limit(6);

  const el = document.getElementById("isu-list");
  if (error || !data || !data.length) {
    el.innerHTML = '<p style="color:var(--ink-soft);font-size:13px;">Belum ada isu tercatat minggu ini.</p>';
    return;
  }

  const prioColor = { Tinggi: "badge-red", Sedang: "badge-amber", Rendah: "badge-gray" };
  el.innerHTML = data.map((isu, i) => `
    <div style="display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:1px solid var(--stone-100);font-size:13px;">
      <span>${i + 1}. ${isu.judul}</span>
      <span class="badge ${prioColor[isu.tingkat_prioritas] || "badge-gray"}">${isu.tingkat_prioritas || "-"}</span>
    </div>
  `).join("");
}

async function loadRecentAspirasi() {
  const { data, error } = await supabaseClient
    .from("aspirasi")
    .select("judul, bidang, status, tanggal_penyampaian, kabupaten:kabupaten_id(nama)")
    .order("created_at", { ascending: false })
    .limit(8);

  const tbody = document.getElementById("recent-tbody");
  if (error || !data || !data.length) {
    tbody.innerHTML = '<tr><td colspan="5" style="color:var(--ink-soft);">Belum ada aspirasi tercatat.</td></tr>';
    return;
  }

  tbody.innerHTML = data.map((a) => {
    const s = STATUS_LABELS[a.status] || { label: a.status, badge: "badge-gray" };
    return `
      <tr>
        <td>${a.judul}</td>
        <td>${a.kabupaten?.nama || "-"}</td>
        <td>${a.bidang}</td>
        <td><span class="badge ${s.badge}">${s.label}</span></td>
        <td>${new Date(a.tanggal_penyampaian).toLocaleDateString("id-ID")}</td>
      </tr>
    `;
  }).join("");
}
