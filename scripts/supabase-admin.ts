import { createClient } from "@supabase/supabase-js";

const url = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceRoleKey) {
  throw new Error(
    "Faltan SUPABASE_URL y/o SUPABASE_SERVICE_ROLE_KEY en el entorno del scraper.",
  );
}

// Cliente con la service role key: se usa solo desde este script (nunca en
// el navegador ni en el servidor de la app Next.js), así que puede saltarse
// las políticas RLS sin exponer nada al público.
export const supabaseAdmin = createClient(url, serviceRoleKey, {
  auth: { persistSession: false },
});
