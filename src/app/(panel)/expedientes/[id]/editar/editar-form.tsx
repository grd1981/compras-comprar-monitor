"use client";

import { useActionState } from "react";
import type { Expediente } from "@/lib/types";
import { actualizarExpediente, type FormState } from "../../actions";
import { buttonPrimary, cardClasses, inputClasses, ESTADOS_PROCESO } from "@/lib/ui";

function CheckLink({
  label,
  checkName,
  checkDefault,
  dateName,
  dateDefault,
  linkName,
  linkDefault,
}: {
  label: string;
  checkName: string;
  checkDefault: boolean;
  dateName?: string;
  dateDefault?: string | null;
  linkName?: string;
  linkDefault?: string | null;
}) {
  return (
    <div className="grid items-center gap-2 border-b border-zinc-100 py-2 last:border-0 dark:border-zinc-900 sm:grid-cols-[1.2fr_1fr_2fr]">
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          name={checkName}
          defaultChecked={checkDefault}
          className="h-4 w-4"
        />
        {label}
      </label>
      {dateName ? (
        <input
          type="date"
          name={dateName}
          defaultValue={dateDefault ?? ""}
          className={inputClasses}
        />
      ) : (
        <span />
      )}
      {linkName ? (
        <input
          type="url"
          name={linkName}
          defaultValue={linkDefault ?? ""}
          placeholder="Link (Drive, etc.)"
          className={inputClasses}
        />
      ) : (
        <span />
      )}
    </div>
  );
}

export function EditarExpedienteForm({ expediente }: { expediente: Expediente }) {
  const actionConId = actualizarExpediente.bind(null, expediente.id);
  const [state, formAction, pending] = useActionState<FormState, FormData>(
    actionConId,
    undefined,
  );

  return (
    <form action={formAction} className="space-y-6">
      <div className={`${cardClasses} space-y-3`}>
        <h2 className="text-sm font-semibold">Datos básicos</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1">
            <label className="text-xs font-medium">Número de proceso *</label>
            <input
              name="numero"
              required
              defaultValue={expediente.numero}
              className={inputClasses}
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium">Organismo / unidad ejecutora</label>
            <input
              name="organismo"
              defaultValue={expediente.organismo ?? ""}
              className={inputClasses}
            />
          </div>
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium">Objeto resumido</label>
          <input
            name="descripcion"
            defaultValue={expediente.descripcion ?? ""}
            className={inputClasses}
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium">Objeto completo</label>
          <textarea
            name="objeto"
            rows={2}
            defaultValue={expediente.objeto ?? ""}
            className={inputClasses}
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium">
            URL del proceso en comprar.gob.ar
          </label>
          <input
            name="url"
            type="url"
            defaultValue={expediente.url ?? ""}
            className={inputClasses}
          />
        </div>
        <div className="grid gap-3 sm:grid-cols-4">
          <div className="space-y-1">
            <label className="text-xs font-medium">Procedimiento</label>
            <select
              name="procedimiento"
              defaultValue={expediente.procedimiento ?? ""}
              className={inputClasses}
            >
              <option value="">—</option>
              <option value="LPR">LPR</option>
              <option value="LPU">LPU</option>
              <option value="CDI">CDI</option>
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium">Anexo</label>
            <select
              name="anexo"
              defaultValue={expediente.anexo ?? ""}
              className={inputClasses}
            >
              <option value="">—</option>
              <option value="ANEXO A">ANEXO A</option>
              <option value="ANEXO B">ANEXO B</option>
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium">Ejercicio</label>
            <input
              name="ejercicio"
              defaultValue={expediente.ejercicio ?? ""}
              inputMode="numeric"
              className={inputClasses}
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium">Moneda</label>
            <select
              name="moneda"
              defaultValue={expediente.moneda ?? "ARS"}
              className={inputClasses}
            >
              <option value="ARS">ARS</option>
              <option value="USD">USD</option>
            </select>
          </div>
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium">Monto estimado</label>
          <input
            name="monto_estimado"
            defaultValue={expediente.monto_estimado ?? ""}
            inputMode="decimal"
            className={inputClasses}
          />
        </div>
      </div>

      <div className={`${cardClasses} space-y-1`}>
        <h2 className="mb-2 text-sm font-semibold">Circuito interno</h2>
        <CheckLink
          label="Envío a Jurídica"
          checkName="envio_jur"
          checkDefault={expediente.envio_jur}
          dateName="fecha_jur"
          dateDefault={expediente.fecha_jur}
        />
        <CheckLink
          label="Envío a la CECE"
          checkName="envio_cece"
          checkDefault={expediente.envio_cece}
          linkName="cece_link"
          linkDefault={expediente.cece_link}
        />
        <CheckLink
          label="BORA"
          checkName="bora"
          checkDefault={expediente.bora}
          linkName="bora_link"
          linkDefault={expediente.bora_link}
        />
        <CheckLink
          label="Pedido SIGEN"
          checkName="pedido_sigen"
          checkDefault={expediente.pedido_sigen}
          linkName="pedido_sigen_link"
          linkDefault={expediente.pedido_sigen_link}
        />
        <div className="grid gap-2 border-b border-zinc-100 py-2 dark:border-zinc-900 sm:grid-cols-[1.2fr_1fr]">
          <label className="text-sm text-zinc-500">Fecha de difusión</label>
          <input
            type="date"
            name="fecha_difusion"
            defaultValue={expediente.fecha_difusion ?? ""}
            className={inputClasses}
          />
        </div>
        <CheckLink
          label="Respuesta SIGEN"
          checkName="respuesta_sigen"
          checkDefault={expediente.respuesta_sigen}
          linkName="link_rta_sigen"
          linkDefault={expediente.link_rta_sigen}
        />
        <div className="grid gap-2 pt-2 sm:grid-cols-2">
          <div className="space-y-1">
            <label className="text-xs font-medium">
              Resolución de aprobación del PBCP
            </label>
            <input
              name="resol_aprobacion_pbcp"
              defaultValue={expediente.resol_aprobacion_pbcp ?? ""}
              className={inputClasses}
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium">Link resolución</label>
            <input
              name="resol_link"
              type="url"
              defaultValue={expediente.resol_link ?? ""}
              className={inputClasses}
            />
          </div>
        </div>
      </div>

      <div className={`${cardClasses} space-y-3`}>
        <h2 className="text-sm font-semibold">Apertura y adjudicación</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1">
            <label className="text-xs font-medium">Fecha de apertura</label>
            <input
              type="date"
              name="fecha_apertura"
              defaultValue={expediente.fecha_apertura ?? ""}
              className={inputClasses}
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium">Hora de apertura</label>
            <input
              name="hora_apertura"
              placeholder="09:00"
              defaultValue={expediente.hora_apertura ?? ""}
              className={inputClasses}
            />
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1">
            <label className="text-xs font-medium">Acta de apertura (link)</label>
            <input
              name="acta_apertura_link"
              type="url"
              defaultValue={expediente.acta_apertura_link ?? ""}
              className={inputClasses}
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium">Cuadro comparativo (link)</label>
            <input
              name="cuadro_comparativo_link"
              type="url"
              defaultValue={expediente.cuadro_comparativo_link ?? ""}
              className={inputClasses}
            />
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1">
            <label className="text-xs font-medium">Resolución de adjudicación</label>
            <input
              name="resolucion_adjudicacion"
              defaultValue={expediente.resolucion_adjudicacion ?? ""}
              className={inputClasses}
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium">Link resolución adjudicación</label>
            <input
              name="link_resol_adj"
              type="url"
              defaultValue={expediente.link_resol_adj ?? ""}
              className={inputClasses}
            />
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1">
            <label className="text-xs font-medium">Monto adjudicado</label>
            <input
              name="monto_adjudicado"
              inputMode="decimal"
              defaultValue={expediente.monto_adjudicado ?? ""}
              className={inputClasses}
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium">Plazo del contrato</label>
            <input
              type="date"
              name="plazo_contrato"
              defaultValue={expediente.plazo_contrato ?? ""}
              className={inputClasses}
            />
          </div>
        </div>
      </div>

      <div className={`${cardClasses} space-y-3`}>
        <h2 className="text-sm font-semibold">Estado y observaciones</h2>
        <div className="space-y-1">
          <label className="text-xs font-medium">Estado del proceso</label>
          <select
            name="estado_proceso"
            defaultValue={expediente.estado_proceso ?? ""}
            className={inputClasses}
          >
            <option value="">—</option>
            {ESTADOS_PROCESO.map((estado) => (
              <option key={estado} value={estado}>
                {estado}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium">Observaciones particulares</label>
          <textarea
            name="observaciones"
            rows={3}
            defaultValue={expediente.observaciones ?? ""}
            className={inputClasses}
          />
        </div>
      </div>

      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
      <button type="submit" disabled={pending} className={buttonPrimary}>
        {pending ? "Guardando..." : "Guardar cambios"}
      </button>
    </form>
  );
}
