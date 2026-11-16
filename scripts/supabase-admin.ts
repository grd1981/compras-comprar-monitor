import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";

// A diferencia de Next.js, un script suelto de Node/tsx no carga
// .env.local por su cuenta. Esto se ejecuta antes de leer las variables
// de abajo (dentro del mismo módulo, el orden de ejecución es el que
// está escrito). Si el archivo no existe (ej: en GitHub Actions, donde
// las variables ya vienen inyectadas por el workflow), config() no
// rompe nada, solo no hace efecto.
config({ path: ".env.local" });

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
