import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { EjecucionOC, Expediente, Novedad, Snapshot } from "@/lib/types";
import { formatFechaCompleta, formatFechaCorta, formatMonto } from "@/lib/format";
import { badgeClasses, buttonDanger, cardClasses, estadoProcesoClasses, tipoLabel } from "@/lib/ui";
import { marcarLeida } from "../../actions";
import { actualizarCantidadEntregada, eliminarRenglonOC } from "./ejecucion-actions";
import { NuevoRenglonForm } from "./nuevo-renglon-form";

function Dato({ label, valor }: { label: string; valor: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs text-zinc-500">{label}</dt>
      <dd className="text-sm">{valor || "—"}</dd>
    </div>
  );
}

function Link_({ href }: { href: string | null }) {
  if (!href) return <>—</>;
  return (
    <a href={href} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline dark:text-blue-400">
      Ver
    </a>
  );
}

function Check({ si }: { si: boolean }) {
  return <span>{si ? "✅ Sí" : "— No"}</span>;
}

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

  const [{ data: snapshots }, { data: novedades }, { data: renglones }] =
    await Promise.all([
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
      supabase
        .from("ejecucion_oc")
        .select("*")
        .eq("expediente_id", id)
        .order("renglon", { ascending: true })
        .returns<EjecucionOC[]>(),
    ]);

  const historial = snapshots ?? [];
  const actual = historial[0] ?? null;
  const listaNovedades = novedades ?? [];
  const listaRenglones = renglones ?? [];

  return (
    <div className="space-y-6">
      <div>
        <Link href="/expedientes" className="text-xs text-zinc-500 hover:underline">
          ← Volver a Licitaciones
        </Link>
        <div className="mt-1 flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-lg font-semibold">{expediente.numero}</h1>
            {!expediente.activo && (
              <span className="rounded-full bg-zinc-200 px-2 py-0.5 text-xs text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
                pausado
              </span>
            )}
            <span
              className={`rounded-full px-2 py-0.5 text-xs font-medium ${estadoProcesoClasses(expediente.estado_proceso)}`}
            >
              {expediente.estado_proceso ?? "sin estado"}
            </span>
          </div>
          <Link
            href={`/expedientes/${id}/editar`}
            className="text-sm font-medium text-blue-600 hover:underline dark:text-blue-400"
          >
            Editar
          </Link>
        </div>
        {expediente.organismo && (
          <p className="text-sm text-zinc-500">{expediente.organismo}</p>
        )}
        {expediente.descripcion && (
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            {expediente.descripcion}
          </p>
        )}
        {expediente.url && (
          <a
            href={expediente.url}
            target="_blank"
            rel="noreferrer"
            className="text-xs text-blue-600 hover:underline dark:text-blue-400"
          >
            Ver en comprar.gob.ar
          </a>
        )}
      </div>

      <div className={`${cardClasses} space-y-4`}>
        <h2 className="text-sm font-semibold">Ficha de la licitación</h2>

        <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Dato label="Expediente" valor={expediente.expediente_nro} />
          <Dato label="Procedimiento" valor={expediente.procedimiento} />
          <Dato label="Anexo" valor={expediente.anexo} />
          <Dato label="Ejercicio" valor={expediente.ejercicio} />
          <Dato
            label="Monto estimado"
            valor={formatMonto(expediente.monto_estimado, expediente.moneda)}
          />
        </dl>

        <div>
          <h3 className="mb-2 text-xs font-semibold text-zinc-500 uppercase">
            Circuito interno
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <tbody>
                <tr className="border-b border-zinc-100 dark:border-zinc-900">
                  <td className="py-1 pr-3">Envío a Jurídica</td>
                  <td className="py-1 pr-3"><Check si={expediente.envio_jur} /></td>
                  <td className="py-1 pr-3 text-zinc-500">
                    {expediente.fecha_jur ? formatFechaCorta(expediente.fecha_jur) : "—"}
                  </td>
                </tr>
                <tr className="border-b border-zinc-100 dark:border-zinc-900">
                  <td className="py-1 pr-3">Envío a la CECE</td>
                  <td className="py-1 pr-3"><Check si={expediente.envio_cece} /></td>
                  <td className="py-1 pr-3"><Link_ href={expediente.cece_link} /></td>
                </tr>
                <tr className="border-b border-zinc-100 dark:border-zinc-900">
                  <td className="py-1 pr-3">BORA</td>
                  <td className="py-1 pr-3"><Check si={expediente.bora} /></td>
                  <td className="py-1 pr-3"><Link_ href={expediente.bora_link} /></td>
                </tr>
                <tr className="border-b border-zinc-100 dark:border-zinc-900">
                  <td className="py-1 pr-3">Pedido SIGEN</td>
                  <td className="py-1 pr-3"><Check si={expediente.pedido_sigen} /></td>
                  <td className="py-1 pr-3"><Link_ href={expediente.pedido_sigen_link} /></td>
                </tr>
                <tr className="border-b border-zinc-100 dark:border-zinc-900">
                  <td className="py-1 pr-3">Respuesta SIGEN</td>
                  <td className="py-1 pr-3"><Check si={expediente.respuesta_sigen} /></td>
                  <td className="py-1 pr-3"><Link_ href={expediente.link_rta_sigen} /></td>
                </tr>
                <tr>
                  <td className="py-1 pr-3">Fecha de difusión</td>
                  <td colSpan={2} className="py-1 pr-3 text-zinc-500">
                    {expediente.fecha_difusion
                      ? formatFechaCorta(expediente.fecha_difusion)
                      : "—"}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div>
          <h3 className="mb-2 text-xs font-semibold text-zinc-500 uppercase">
            Apertura y adjudicación
          </h3>
          <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Dato
              label="Resol. aprobación PBCP"
              valor={
                expediente.resol_aprobacion_pbcp ? (
                  <>
                    {expediente.resol_aprobacion_pbcp}{" "}
                    <Link_ href={expediente.resol_link} />
                  </>
                ) : null
              }
            />
            <Dato
              label="Fecha / hora apertura"
              valor={
                expediente.fecha_apertura
                  ? `${formatFechaCorta(expediente.fecha_apertura)} ${expediente.hora_apertura ?? ""}`
                  : null
              }
            />
            <Dato label="Acta de apertura" valor={<Link_ href={expediente.acta_apertura_link} />} />
            <Dato
              label="Cuadro comparativo"
              valor={<Link_ href={expediente.cuadro_comparativo_link} />}
            />
            <Dato
              label="Resol. de adjudicación"
              valor={
                expediente.resolucion_adjudicacion ? (
                  <>
                    {expediente.resolucion_adjudicacion}{" "}
                    <Link_ href={expediente.link_resol_adj} />
                  </>
                ) : null
              }
            />
            <Dato
              label="Monto adjudicado"
              valor={formatMonto(expediente.monto_adjudicado, expediente.moneda)}
            />
            <Dato
              label="Plazo del contrato"
              valor={
                expediente.plazo_contrato
                  ? formatFechaCorta(expediente.plazo_contrato)
                  : null
              }
            />
          </dl>
        </div>

        {expediente.observaciones && (
          <div>
            <h3 className="mb-1 text-xs font-semibold text-zinc-500 uppercase">
              Observaciones
            </h3>
            <p className="text-sm">{expediente.observaciones}</p>
          </div>
        )}
      </div>

      <div className="space-y-3">
        <h2 className="text-sm font-semibold">Ejecución de la OC</h2>
        {listaRenglones.length === 0 ? (
          <p className="text-sm text-zinc-500">
            Todavía no hay renglones de orden de compra cargados.
          </p>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-800">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-zinc-200 bg-zinc-50 text-xs text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900">
                  <th className="px-2 py-1.5">OC</th>
                  <th className="px-2 py-1.5">Rengl.</th>
                  <th className="px-2 py-1.5">Adjudicatario</th>
                  <th className="px-2 py-1.5">Descripción</th>
                  <th className="px-2 py-1.5">Adjudicada</th>
                  <th className="px-2 py-1.5">Entregada</th>
                  <th className="px-2 py-1.5">Saldo</th>
                  <th className="px-2 py-1.5"></th>
                </tr>
              </thead>
              <tbody>
                {listaRenglones.map((r) => {
                  const saldo =
                    r.importe_unitario !== null && r.cantidad_adjudicada !== null
                      ? r.importe_unitario * (r.cantidad_adjudicada - r.cantidad_entregada)
                      : null;
                  return (
                    <tr key={r.id} className="border-b border-zinc-100 last:border-0 dark:border-zinc-900">
                      <td className="px-2 py-1.5">{r.id_oc ?? "—"}</td>
                      <td className="px-2 py-1.5">{r.renglon ?? "—"}</td>
                      <td className="px-2 py-1.5">{r.adjudicatario ?? "—"}</td>
                      <td className="max-w-xs truncate px-2 py-1.5" title={r.descripcion ?? ""}>
                        {r.descripcion ?? "—"}
                      </td>
                      <td className="px-2 py-1.5">{r.cantidad_adjudicada ?? "—"}</td>
                      <td className="px-2 py-1.5">
                        <form
                          action={async (formData: FormData) => {
                            "use server";
                            await actualizarCantidadEntregada(id, r.id, formData);
                          }}
                          className="flex items-center gap-1"
                        >
                          <input
                            type="number"
                            name="cantidad_entregada"
                            defaultValue={r.cantidad_entregada}
                            step="any"
                            className="w-20 rounded border border-zinc-300 bg-white px-1.5 py-0.5 text-sm dark:border-zinc-700 dark:bg-zinc-900"
                          />
                          <button type="submit" className="text-xs text-blue-600 hover:underline dark:text-blue-400">
                            Guardar
                          </button>
                        </form>
                      </td>
                      <td className="px-2 py-1.5">
                        {saldo !== null ? formatMonto(saldo, expediente.moneda) : "—"}
                      </td>
                      <td className="px-2 py-1.5">
                        <form action={eliminarRenglonOC.bind(null, id, r.id)}>
                          <button type="submit" className={buttonDanger}>
                            Eliminar
                          </button>
                        </form>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        <NuevoRenglonForm expedienteId={id} />
      </div>

      <div className={cardClasses}>
        <h2 className="mb-3 text-sm font-semibold">
          Última foto automática de comprar.gob.ar
        </h2>
        {!actual ? (
          <p className="text-sm text-zinc-500">
            Todavía no se registró ninguna revisión automática de este
            expediente (necesita tener URL cargada y que corra el scraper).
          </p>
        ) : (
          <div className="space-y-3 text-sm">
            <p>
              <span className="text-zinc-500">Estado de la solicitud (auto): </span>
              {actual.estado ?? "—"}
            </p>
            <p>
              <span className="text-zinc-500">Plazo / fecha de apertura (auto): </span>
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
        <h2 className="text-sm font-semibold">Historial de revisiones automáticas</h2>
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
