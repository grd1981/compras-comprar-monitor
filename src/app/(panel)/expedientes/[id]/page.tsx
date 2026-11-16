import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Expediente, Novedad, Snapshot } from "@/lib/types";
import { formatFechaCompleta } from "@/lib/format";
import { badgeClasses, cardClasses, tipoLabel } from "@/lib/ui";
import { marcarLeida } from "../../actions";

export default async function ExpedienteDetallePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: expediente } = await supabase
    .from("expedientes")
    .select("*")
    .eq("id", id)
    .maybeSingle<Expediente>();

  if (!expediente) notFound();

  const [{ data: snapshots }, { data: novedades }] = await Promise.all([
    supabase
      .from("snapshots")
      .select("*")
      .eq("expediente_id", id)
      .order("created_at", { ascending: false })
      .limit(15)
      .returns<Snapshot[]>(),
    supabase
      .from("novedades")
      .select("*")
      .eq("expediente_id", id)
      .order("detectado_en", { ascending: false })
      .limit(50)
      .returns<Novedad[]>(),
  ]);

  const historial = snapshots ?? [];
  const actual = historial[0] ?? null;
  const listaNovedades = novedades ?? [];

  return (
    <div className="space-y-6">
      <div>
        <Link href="/expedientes" className="text-xs text-zinc-500 hover:underline">
          ← Volver a Expedientes
        </Link>
        <div className="mt-1 flex flex-wrap items-center gap-2">
          <h1 className="text-lg font-semibold">{expediente.numero}</h1>
          {!expediente.activo && (
            <span className="rounded-full bg-zinc-200 px-2 py-0.5 text-xs text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
              pausado
            </span>
          )}
        </div>
        {expediente.organismo && (
          <p className="text-sm text-zinc-500">{expediente.organismo}</p>
        )}
        {expediente.descripcion && (
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            {expediente.descripcion}
          </p>
        )}
        <a
          href={expediente.url}
          target="_blank"
          rel="noreferrer"
          className="text-xs text-blue-600 hover:underline dark:text-blue-400"
        >
          Ver en comprar.gob.ar
        </a>
      </div>

      <div className={cardClasses}>
        <h2 className="mb-3 text-sm font-semibold">Estado actual</h2>
        {!actual ? (
          <p className="text-sm text-zinc-500">
            Todavía no se registró ninguna revisión de este expediente. Va a
            quedar disponible después de la próxima corrida del scraper.
          </p>
        ) : (
          <div className="space-y-3 text-sm">
            <p>
              <span className="text-zinc-500">Estado: </span>
              {actual.estado ?? "—"}
            </p>
            <p>
              <span className="text-zinc-500">Plazo / fecha de apertura: </span>
              {actual.plazo_limite ? formatFechaCompleta(actual.plazo_limite) : "—"}
            </p>
            <div>
              <span className="text-zinc-500">Consultas / circulares: </span>
              {actual.consultas.length === 0 ? (
                "ninguna"
              ) : (
                <ul className="mt-1 list-inside list-disc space-y-0.5">
                  {actual.consultas.map((c) => (
                    <li key={c.id}>
                      {c.texto}
                      {c.fecha ? ` — ${c.fecha}` : ""}
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <p className="text-xs text-zinc-500">
              Última revisión: {formatFechaCompleta(actual.created_at)}
            </p>
          </div>
        )}
      </div>

      <div className="space-y-3">
        <h2 className="text-sm font-semibold">Novedades de este expediente</h2>
        {listaNovedades.length === 0 ? (
          <p className="text-sm text-zinc-500">Todavía no hay novedades.</p>
        ) : (
          <ul className="space-y-3">
            {listaNovedades.map((n) => (
              <li
                key={n.id}
                className={`${cardClasses} ${n.leida ? "opacity-60" : ""}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${badgeClasses[n.tipo]}`}
                      >
                        {tipoLabel[n.tipo]}
                      </span>
                      <span className="text-xs text-zinc-500">
                        {formatFechaCompleta(n.detectado_en)}
                      </span>
                    </div>
                    <p className="text-sm">{n.detalle}</p>
                  </div>
                  {!n.leida && (
                    <form action={marcarLeida.bind(null, n.id)}>
                      <button
                        type="submit"
                        className="whitespace-nowrap text-xs font-medium text-zinc-500 hover:text-blue-600"
                      >
                        Marcar leída
                      </button>
                    </form>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="space-y-3">
        <h2 className="text-sm font-semibold">Historial de revisiones</h2>
        {historial.length === 0 ? (
          <p className="text-sm text-zinc-500">Sin revisiones todavía.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-zinc-200 text-xs text-zinc-500 dark:border-zinc-800">
                  <th className="py-1 pr-3">Fecha</th>
                  <th className="py-1 pr-3">Estado</th>
                  <th className="py-1 pr-3">Plazo</th>
                  <th className="py-1 pr-3">Consultas</th>
                </tr>
              </thead>
              <tbody>
                {historial.map((s) => (
                  <tr
                    key={s.id}
                    className="border-b border-zinc-100 dark:border-zinc-900"
                  >
                    <td className="py-1 pr-3 text-xs text-zinc-500">
                      {formatFechaCompleta(s.created_at)}
                    </td>
                    <td className="py-1 pr-3">{s.estado ?? "—"}</td>
                    <td className="py-1 pr-3">
                      {s.plazo_limite ? formatFechaCompleta(s.plazo_limite) : "—"}
                    </td>
                    <td className="py-1 pr-3">{s.consultas.length}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
