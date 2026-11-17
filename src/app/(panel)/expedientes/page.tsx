import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import type { Expediente } from "@/lib/types";
import { formatFechaCorta, formatMonto } from "@/lib/format";
import { buttonDanger, estadoProcesoClasses } from "@/lib/ui";
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
      <h1 className="text-lg font-semibold">Licitaciones seguidas</h1>

      <NuevoExpedienteForm />

      {expedientes.length === 0 ? (
        <p className="text-sm text-zinc-500">
          Todavía no agregaste ninguna licitación.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-800">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-zinc-200 bg-zinc-50 text-xs text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900">
                <th className="px-3 py-2">Número</th>
                <th className="px-3 py-2">Objeto resumido</th>
                <th className="px-3 py-2">Procedimiento</th>
                <th className="px-3 py-2">Monto estimado</th>
                <th className="px-3 py-2">Apertura</th>
                <th className="px-3 py-2">Estado</th>
                <th className="px-3 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {expedientes.map((e) => (
                <tr
                  key={e.id}
                  className="border-b border-zinc-100 last:border-0 dark:border-zinc-900"
                >
                  <td className="px-3 py-2 align-top">
                    <Link
                      href={`/expedientes/${e.id}`}
                      className="font-medium text-blue-600 hover:underline dark:text-blue-400"
                    >
                      {e.numero}
                    </Link>
                    {!e.activo && (
                      <span className="ml-2 rounded-full bg-zinc-200 px-2 py-0.5 text-xs text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
                        pausado
                      </span>
                    )}
                    {e.organismo && (
                      <p className="text-xs text-zinc-500">{e.organismo}</p>
                    )}
                  </td>
                  <td className="max-w-xs px-3 py-2 align-top">
                    {e.descripcion ?? "—"}
                  </td>
                  <td className="px-3 py-2 align-top">
                    {e.procedimiento ?? "—"}
                    {e.anexo ? ` · ${e.anexo}` : ""}
                  </td>
                  <td className="px-3 py-2 align-top whitespace-nowrap">
                    {formatMonto(e.monto_estimado, e.moneda)}
                  </td>
                  <td className="px-3 py-2 align-top whitespace-nowrap">
                    {e.fecha_apertura ? formatFechaCorta(e.fecha_apertura) : "—"}
                  </td>
                  <td className="px-3 py-2 align-top">
                    <span
                      className={`whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium ${estadoProcesoClasses(e.estado_proceso)}`}
                    >
                      {e.estado_proceso ?? "sin estado"}
                    </span>
                  </td>
                  <td className="px-3 py-2 align-top">
                    <div className="flex flex-col items-end gap-1">
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
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
