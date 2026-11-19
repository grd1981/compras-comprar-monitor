import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { EjecucionOC, Expediente, GdeSnapshot, Novedad, Snapshot } from "@/lib/types";
import { formatFechaCompleta, formatFechaCorta, formatMonto } from "@/lib/format";
import { badgeClasses, buttonDanger, estadoProcesoClasses, tipoLabel } from "@/lib/ui";
import { marcarLeida } from "../../actions";
import { eliminarExpediente, toggleActivo } from "../actions";
import { actualizarCantidadEntregada, eliminarRenglonOC } from "./ejecucion-actions";
import { NuevoRenglonForm } from "./nuevo-renglon-form";

function DocIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      className="h-4 w-4"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M14 2.5V7a2 2 0 0 0 2 2h4.5M14 2.5H6.5A1.5 1.5 0 0 0 5 4v16a1.5 1.5 0 0 0 1.5 1.5h11A1.5 1.5 0 0 0 19 20V8.5L14 2.5Z"
      />
    </svg>
  );
}

function Dato({ label, children }: { label: string; children?: React.ReactNode }) {
  return (
    <div className="border-b border-zinc-100 py-2 dark:border-zinc-900">
      <dt className="text-xs text-zinc-500">{label}</dt>
      <dd className="text-sm">{children ?? <span className="text-zinc-400">—</span>}</dd>
    </div>
  );
}

function ValorLink({ href }: { href: string | null }) {
  if (!href) return null;
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      title="Ver documento"
      className="inline-flex text-blue-600 hover:text-blue-700 dark:text-blue-400"
    >
      <DocIcon />
    </a>
  );
}

function Estado({ si, siTexto = "Sí", noTexto = "No" }: { si: boolean; siTexto?: string; noTexto?: string }) {
  return (
    <span className={si ? "text-emerald-700 dark:text-emerald-400" : "text-zinc-500"}>
      {si ? siTexto : noTexto}
    </span>
  );
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

  const [{ data: snapshots }, { data: novedades }, { data: renglones }, { data: gdeSnapshot }] =
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
      supabase
        .from("gde_snapshots")
        .select("*")
        .eq("expediente_id", id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle<GdeSnapshot>(),
    ]);

  const historial = snapshots ?? [];
  const actual = historial[0] ?? null;
  const listaNovedades = novedades ?? [];
  const movimientosGde = gdeSnapshot?.movimientos ?? [];
  const listaRenglones = renglones ?? [];

  return (
    <div className="space-y-6">
      <div>
        <div className="flex flex-wrap items-center justify-between gap-2">
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
          <div className="flex items-center gap-3 text-sm">
            <Link
              href={`/expedientes/${id}/editar`}
              className="font-medium text-blue-600 hover:underline dark:text-blue-400"
            >
              Editar
            </Link>
            <form action={toggleActivo.bind(null, id, !expediente.activo)}>
              <button type="submit" className="text-zinc-500 hover:underline">
                {expediente.activo ? "Pausar" : "Reactivar"}
              </button>
            </form>
            <form action={eliminarExpediente.bind(null, id)}>
              <button type="submit" className="text-red-600 hover:underline dark:text-red-400">
                Eliminar
              </button>
            </form>
          </div>
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

      <dl>
        <Dato label="Expediente">{expediente.expediente_nro}</Dato>
        <Dato label="Procedimiento">{expediente.procedimiento}</Dato>
        <Dato label="Anexo">{expediente.anexo}</Dato>
        <Dato label="Ejercicio">{expediente.ejercicio}</Dato>
        <Dato label="Objeto">{expediente.objeto}</Dato>
        <Dato label="Monto estimado">
          {formatMonto(expediente.monto_estimado, expediente.moneda)}
        </Dato>

        <Dato label="Envío a Jurídica">
          <Estado si={expediente.envio_jur} siTexto="Enviado" noTexto="No enviado" />
          {expediente.fecha_jur && (
            <span className="ml-2 text-zinc-500">
              {formatFechaCorta(expediente.fecha_jur)}
            </span>
          )}
        </Dato>
        <Dato label="Envío a la CECE">
          <Estado si={expediente.envio_cece} siTexto="Enviado" noTexto="No enviado" />
          {expediente.cece_link && (
            <span className="ml-2">
              <ValorLink href={expediente.cece_link} />
            </span>
          )}
        </Dato>
        <Dato label="BORA">
          <Estado si={expediente.bora} siTexto="Publicado" noTexto="No publicado" />
          {expediente.bora_link && (
            <span className="ml-2">
              <ValorLink href={expediente.bora_link} />
            </span>
          )}
        </Dato>
        <Dato label="Pedido SIGEN">
          <Estado si={expediente.pedido_sigen} siTexto="Enviado" noTexto="No enviado" />
          {expediente.pedido_sigen_link && (
            <span className="ml-2">
              <ValorLink href={expediente.pedido_sigen_link} />
            </span>
          )}
        </Dato>
        <Dato label="Fecha de difusión">
          {expediente.fecha_difusion ? formatFechaCorta(expediente.fecha_difusion) : null}
        </Dato>
        <Dato label="Respuesta SIGEN">
          <Estado si={expediente.respuesta_sigen} siTexto="Recibida" noTexto="Pendiente" />
          {expediente.link_rta_sigen && (
            <span className="ml-2">
              <ValorLink href={expediente.link_rta_sigen} />
            </span>
          )}
        </Dato>
        <Dato label="Resol. aprobación PBCP">
          {expediente.resol_aprobacion_pbcp}
          {expediente.resol_link && (
            <span className="ml-2">
              <ValorLink href={expediente.resol_link} />
            </span>
          )}
        </Dato>

        <Dato label="Fecha / hora de apertura">
          {expediente.fecha_apertura
            ? `${formatFechaCorta(expediente.fecha_apertura)}${expediente.hora_apertura ? ` ${expediente.hora_apertura}` : ""}`
            : null}
        </Dato>
        <Dato label="Acta de apertura">
          <ValorLink href={expediente.acta_apertura_link} />
        </Dato>
        <Dato label="Cuadro comparativo">
          <ValorLink href={expediente.cuadro_comparativo_link} />
        </Dato>
        <Dato label="Resolución de adjudicación">
          {expediente.resolucion_adjudicacion}
          {expediente.link_resol_adj && (
            <span className="ml-2">
              <ValorLink href={expediente.link_resol_adj} />
            </span>
          )}
        </Dato>
        <Dato label="Monto adjudicado">
          {formatMonto(expediente.monto_adjudicado, expediente.moneda)}
        </Dato>
        <Dato label="Plazo del contrato">
          {expediente.plazo_contrato ? formatFechaCorta(expediente.plazo_contrato) : null}
        </Dato>

        {expediente.observaciones && (
          <Dato label="Observaciones">{expediente.observaciones}</Dato>
        )}
      </dl>

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

      <div className="space-y-2">
        <h2 className="text-sm font-semibold">
          Última foto automática de comprar.gob.ar
        </h2>
        {!actual ? (
          <p className="text-sm text-zinc-500">
            Todavía no se registró ninguna revisión automática de este
            expediente (necesita tener URL cargada y que corra el scraper).
          </p>
        ) : (
          <dl>
            <Dato label="Estado de la solicitud (auto)">{actual.estado}</Dato>
            <Dato label="Plazo / fecha de apertura (auto)">
              {actual.plazo_limite ? formatFechaCompleta(actual.plazo_limite) : null}
            </Dato>
            <Dato label="Consultas / circulares">
              {actual.consultas.length === 0 ? (
                "ninguna"
              ) : (
                <ul className="list-inside list-disc space-y-0.5">
                  {actual.consultas.map((c) => (
                    <li key={c.id}>
                      {c.texto}
                      {c.fecha ? ` — ${c.fecha}` : ""}
                    </li>
                  ))}
                </ul>
              )}
            </Dato>
            <p className="pt-2 text-xs text-zinc-500">
              Última revisión: {formatFechaCompleta(actual.created_at)}
            </p>
          </dl>
        )}
      </div>

      <div className="space-y-3">
        <h2 className="text-sm font-semibold">
          Últimos movimientos del expediente en GDE
        </h2>
        {!expediente.expediente_nro ? (
          <p className="text-sm text-zinc-500">
            Cargá el número de expediente (EX-...) para que el scraper pueda
            buscarlo en GDE.
          </p>
        ) : movimientosGde.length === 0 ? (
          <p className="text-sm text-zinc-500">
            Todavía no se registró ninguna revisión automática de GDE para
            este expediente.
          </p>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-800">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-zinc-200 bg-zinc-50 text-xs text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900">
                  <th className="px-2 py-1.5">Orden</th>
                  <th className="px-2 py-1.5">Tipo de documento</th>
                  <th className="px-2 py-1.5">Número</th>
                  <th className="px-2 py-1.5">Referencia</th>
                  <th className="px-2 py-1.5">Fecha de asociación</th>
                </tr>
              </thead>
              <tbody>
                {movimientosGde.map((m, i) => (
                  <tr
                    key={`${m.orden ?? i}-${m.numero_documento ?? i}`}
                    className="border-b border-zinc-100 last:border-0 dark:border-zinc-900"
                  >
                    <td className="px-2 py-1.5">{m.orden ?? "—"}</td>
                    <td className="px-2 py-1.5">{m.tipo_documento ?? "—"}</td>
                    <td className="px-2 py-1.5">{m.numero_documento ?? "—"}</td>
                    <td className="max-w-xs truncate px-2 py-1.5" title={m.referencia ?? ""}>
                      {m.referencia ?? "—"}
                    </td>
                    <td className="px-2 py-1.5 text-zinc-500">
                      {m.fecha_asociacion ?? "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {gdeSnapshot && (
          <p className="text-xs text-zinc-500">
            Última revisión: {formatFechaCompleta(gdeSnapshot.created_at)}
          </p>
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
                className={`rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950 ${n.leida ? "opacity-60" : ""}`}
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
