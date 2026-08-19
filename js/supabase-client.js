// ============================================================
// Si MAMA — Supabase client
// Ganti SUPABASE_URL dan SUPABASE_ANON_KEY dengan milik project Anda
// (Project Settings → API di dashboard Supabase)
// ============================================================

const SUPABASE_URL = "https://tahblzwywseuzovfwyif.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_qNVK4IevpksTC1fnJG2lwQ_lld_4lnH";

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Daftar label status untuk dipakai di seluruh halaman
const STATUS_LABELS = {
  RECEIVED: { label: "Diterima", badge: "badge-gray" },
  VERIFIED: { label: "Terverifikasi", badge: "badge-gray" },
  SUBMITTED: { label: "Diteruskan", badge: "badge-blue" },
  IN_PROGRESS: { label: "Dalam Proses", badge: "badge-blue" },
  WAITING_RESPONSE: { label: "Menunggu Instansi", badge: "badge-amber" },
  BELUM_DITINDAKLANJUTI: { label: "Belum Ditindaklanjuti", badge: "badge-red" },
  COMPLETED: { label: "Selesai", badge: "badge-green" },
};

const ROLE_LABELS = {
  admin: "Admin / Coordinator",
  data_officer: "Data Officer",
  aspirasi_officer: "Aspirasi Officer",
  research_officer: "Research Officer",
  monitoring_officer: "Monitoring Officer",
  documentation_officer: "Documentation Officer",
  senator: "Senator",
  viewer: "Viewer",
};
