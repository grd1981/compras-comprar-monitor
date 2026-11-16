import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import type { Novedad, ScrapeRun } from "@/lib/types";
import { formatFecha } from "@/lib/format";
import { badgeClasses, buttonPrimary, cardClasses, tipoLabel } from "@/lib/ui";
import { marcarLeida, marcarTodasLeidas } from "./actions";

export default async function DashboardPage() {
  const supabase = await createClient();

  const [{ data: novedades }, { data: ultimaCorrida }] = await Promise.all([
    supabase
      .from("novedades")
      .select("*, expediente:expedientes(id, numero, organismo, url)")
      .order("detectado_en", { ascending: false })
      .limit(100)
      .returns<Novedad[]>(),
    supabase
      .from("scrape_runs")
      .select("*")
      .order("started_at", { ascending: false })
      .limit(1)
      .maybeSingle<ScrapeRun>(),
  ]);

  const items = novedades ?? [];
  const noLeidas = items.filter((n) => !n.leida);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">Novedades</h1>
        {noLeidas.length > 0 && (
          <form action={marcarTodasLeidas}>
            <button type="submit" className={buttonPrimary}>
              Marcar todas como leídas
            </button>
          </form>
        )}
      </div>

      {ultimaCorrida && (
        <p className="text-xs text-zinc-500">
          Última revisión: {formatFecha(ultimaCorrida.started_at)} ·{" "}
          {ultimaCorrida.ok === false ? (
            <span className="text-red-500">
              falló ({ultimaCorrida.error ?? "error desconocido"})
            </span>
          ) : (
            <span>
              {ultimaCorrida.expedientes_revisados} expediente(s) revisado(s)
            </span>
          )}
        </p>
      )}

      {items.length === 0 && (
        <div className={cardClasses}>
          <p className="text-sm text-zinc-500">
            Todavía no hay novedades. Agregá expedientes para seguir en la
            sección{" "}
            <Link href="/expedientes" className="underline">
              Expedientes
            </Link>
            .
          </p>
        </div>
      )}

      <ul className="space-y-3">
        {items.map((n) => (
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
                    {formatFecha(n.detectado_en)}
                  </span>
                </div>
                <p className="text-sm">{n.detalle}</p>
                {n.expediente && (
                  <a
                    href={`/expedientes/${n.expediente.id}`}
                    className="text-xs text-blue-600 hover:underline dark:text-blue-400"
                  >
                    Expediente {n.expediente.numero}
                    {n.expediente.organismo ? ` · ${n.expediente.organismo}` : ""}
                  </a>
                )}
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
    </div>
  );
}
