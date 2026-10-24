/* Configuration publique Supabase.
   Remplace uniquement les deux valeurs ci-dessous.
   Ne mets JAMAIS la clé service_role ici : elle doit rester côté serveur. */
window.APEX_SUPABASE_CONFIG = {
  url: "https://TON-PROJET.supabase.co",
  anonKey: "TA_CLE_PUBLIQUE_ANON"
};

window.apexSupabase = null;
if (window.supabase && window.APEX_SUPABASE_CONFIG.url.includes("supabase.co") && !window.APEX_SUPABASE_CONFIG.url.includes("TON-PROJET")) {
  window.apexSupabase = window.supabase.createClient(
    window.APEX_SUPABASE_CONFIG.url,
    window.APEX_SUPABASE_CONFIG.anonKey
  );
}
