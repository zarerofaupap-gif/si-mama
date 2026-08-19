// ============================================================
// Si MAMA — Auth guard
// Dipanggil di setiap halaman terproteksi (dashboard, aspirasi, dst.)
// Mengecek sesi login & mengambil profil (termasuk role) dari tabel profiles.
// ============================================================

async function requireAuth() {
  const { data: { session } } = await supabaseClient.auth.getSession();

  if (!session) {
    window.location.href = "index.html";
    return null;
  }

  const { data: profile, error } = await supabaseClient
    .from("profiles")
    .select("*")
    .eq("id", session.user.id)
    .single();

  if (error || !profile) {
    // Akun ada di auth tapi belum punya baris profil —
    // arahkan ke admin untuk didaftarkan rolenya.
    document.body.innerHTML =
      '<div style="padding:40px;font-family:Inter,sans-serif;max-width:480px;margin:0 auto;">' +
      "<h2>Akun belum aktif</h2>" +
      "<p>Akun Anda sudah terdaftar tapi belum memiliki role. Hubungi Admin untuk mengaktifkan akses Anda ke Si MAMA.</p>" +
      '<button class="btn btn-outline" onclick="signOut()">Keluar</button></div>';
    return null;
  }

  if (!profile.aktif) {
    document.body.innerHTML =
      '<div style="padding:40px;font-family:Inter,sans-serif;">Akun Anda dinonaktifkan. Hubungi Admin.</div>';
    return null;
  }

  renderUserBadge(profile);
  return profile;
}

function renderUserBadge(profile) {
  const el = document.getElementById("user-badge");
  if (!el) return;
  el.innerHTML =
    `<div style="font-size:13px;font-weight:600;color:var(--white)">${profile.nama_lengkap}</div>` +
    `<div style="font-size:12px;color:rgba(255,255,255,0.55)">${ROLE_LABELS[profile.role] || profile.role}</div>`;
}

async function signOut() {
  await supabaseClient.auth.signOut();
  window.location.href = "index.html";
}

// Helper: sembunyikan elemen yang butuh role tertentu
// Contoh: <button data-role="admin,aspirasi_officer">Tambah</button>
function applyRoleVisibility(profile) {
  document.querySelectorAll("[data-role]").forEach((el) => {
    const allowed = el.getAttribute("data-role").split(",").map((r) => r.trim());
    if (!allowed.includes(profile.role)) {
      el.style.display = "none";
    }
  });
}
