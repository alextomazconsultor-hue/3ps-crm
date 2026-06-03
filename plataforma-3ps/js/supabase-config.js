/* =============================================
   SUPABASE — CONFIGURAÇÃO
   =============================================

   INSTRUÇÕES:
   1. Acesse https://supabase.com e abra seu projeto.
   2. Vá em: Settings → API
   3. Copie "Project URL" e cole em SUPABASE_URL
   4. Copie "anon public" e cole em SUPABASE_ANON_KEY

   Exemplo:
   SUPABASE_URL  = 'https://xyzxyzxyz.supabase.co'
   SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'

============================================= */

const SUPABASE_URL      = 'COLE_AQUI_SUA_SUPABASE_URL';
const SUPABASE_ANON_KEY = 'COLE_AQUI_SUA_SUPABASE_ANON_KEY';

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
