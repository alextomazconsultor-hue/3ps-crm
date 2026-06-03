/* =============================================
   SUPABASE — CONFIGURAÇÃO
   =============================================

   Você pode configurar de duas formas:

   FORMA 1 (recomendada para produção):
   Substitua os placeholders abaixo com suas
   credenciais do Supabase (Settings → API).

   FORMA 2 (via interface da plataforma):
   Deixe os placeholders como estão.
   A plataforma mostrará uma tela de configuração
   onde você cola as credenciais pelo navegador.
   Elas ficam salvas no localStorage.

============================================= */

// Tenta carregar credenciais salvas pelo painel de configuração
const _savedUrl = localStorage.getItem('3ps_sb_url');
const _savedKey = localStorage.getItem('3ps_sb_key');

const SUPABASE_URL      = _savedUrl  || 'COLE_AQUI_SUA_SUPABASE_URL';
const SUPABASE_ANON_KEY = _savedKey  || 'COLE_AQUI_SUA_SUPABASE_ANON_KEY';

// Inicializa o client apenas se as credenciais forem reais
let supabase = null;
if (
  SUPABASE_URL      !== 'COLE_AQUI_SUA_SUPABASE_URL' &&
  SUPABASE_ANON_KEY !== 'COLE_AQUI_SUA_SUPABASE_ANON_KEY'
) {
  supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}
