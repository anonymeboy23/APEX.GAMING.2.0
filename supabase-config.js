/* Configuration publique Supabase.
   Remplace uniquement les deux valeurs ci-dessous.
   Ne mets JAMAIS la clé service_role ici : elle doit rester côté serveur. */
window.APEX_SUPABASE_CONFIG = {
  url: "https://fhzkgjbcmxxlznolbsyq.supabase.co",
  anonKey: "sb_publishable_GCJqySzbDyRLN3LoVE11rg_yrje5Rxm"
};

window.apexSupabase = null;
if (window.supabase && window.APEX_SUPABASE_CONFIG.url.includes("supabase.co") && !window.APEX_SUPABASE_CONFIG.url.includes("TON-PROJET")) {
  window.apexSupabase = window.supabase.createClient(
    window.APEX_SUPABASE_CONFIG.url,
    window.APEX_SUPABASE_CONFIG.anonKey
  );
}
