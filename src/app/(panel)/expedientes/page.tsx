import { createClient } from "@/lib/supabase/server";
import type { Expediente } from "@/lib/types";
import { buttonDanger, cardClasses } from "@/lib/ui";
import { eliminarExpediente, toggleActivo } from "./actions";
import { NuevoExpedienteForm } from "./nuevo-form";

export default async function ExpedientesPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("expedientes")
    .select("*")
    .order("created_at", { ascending: false })
    .returns<Expediente[]>();

  const expedientes = data ?? [];

  return (
    <div className="space-y-6">
      <h1 className="text-lg font-semibold">Expedientes seguidos</h1>

      <NuevoExpedienteForm />

      {expedientes.length === 0 ? (
        <p className="text-sm text-zinc-500">
          Todavía no agregaste ningún expediente.
        </p>
      ) : (
        <ul className="space-y-3">
          {expedientes.map((e) => (
            <li key={e.id} className={cardClasses}>
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <p className="font-medium">
                    {e.numero}{" "}
                    {!e.activo && (
                      <span className="ml-2 rounded-full bg-zinc-200 px-2 py-0.5 text-xs text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
                        pausado
                      </span>
                    )}
                  </p>
                  {e.organismo && (
                    <p className="text-xs text-zinc-500">{e.organismo}</p>
                  )}
                  {e.descripcion && (
                    <p className="text-sm text-zinc-600 dark:text-zinc-400">
                      {e.descripcion}
                    </p>
                  )}
                  <a
                    href={e.url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs text-blue-600 hover:underline dark:text-blue-400"
                  >
                    Ver en comprar.gob.ar
                  </a>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <form action={toggleActivo.bind(null, e.id, !e.activo)}>
                    <button
                      type="submit"
                      className="whitespace-nowrap text-xs font-medium text-zinc-500 hover:text-blue-600"
                    >
                      {e.activo ? "Pausar" : "Reactivar"}
                    </button>
                  </form>
                  <form action={eliminarExpediente.bind(null, e.id)}>
                    <button type="submit" className={buttonDanger}>
                      Eliminar
                    </button>
                  </form>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
