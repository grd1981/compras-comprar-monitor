"use client";

import { useActionState } from "react";
import { crearExpediente } from "./actions";
import { buttonPrimary, cardClasses, inputClasses } from "@/lib/ui";

export function NuevoExpedienteForm() {
  const [state, formAction, pending] = useActionState(
    crearExpediente,
    undefined,
  );

  return (
    <form action={formAction} className={`${cardClasses} space-y-3`}>
      <h2 className="text-sm font-semibold">Agregar licitación a seguir</h2>
      <p className="text-xs text-zinc-500">
        Cargá lo que ya sepas — el resto (circuito interno, apertura,
        adjudicación) lo vas completando después desde el detalle.
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <label htmlFor="numero" className="text-xs font-medium">
            Número de proceso *
          </label>
          <input
            id="numero"
            name="numero"
            required
            placeholder="ej: 84/135-0138-LPR26"
            className={inputClasses}
          />
        </div>
        <div className="space-y-1">
          <label htmlFor="organismo" className="text-xs font-medium">
            Organismo / unidad ejecutora
          </label>
          <input id="organismo" name="organismo" className={inputClasses} />
        </div>
      </div>
      <div className="space-y-1">
        <label htmlFor="descripcion" className="text-xs font-medium">
          Objeto resumido
        </label>
        <input
          id="descripcion"
          name="descripcion"
          placeholder="ej: MANTENIMIENTO DE ASCENSORES"
          className={inputClasses}
        />
      </div>
      <div className="space-y-1">
        <label htmlFor="objeto" className="text-xs font-medium">
          Objeto completo
        </label>
        <textarea
          id="objeto"
          name="objeto"
          rows={2}
          className={inputClasses}
        />
      </div>
      <div className="space-y-1">
        <label htmlFor="url" className="text-xs font-medium">
          URL del proceso en comprar.gob.ar (si ya la tenés)
        </label>
        <input
          id="url"
          name="url"
          type="url"
          placeholder="https://comprar.gob.ar/..."
          className={inputClasses}
        />
      </div>
      <div className="grid gap-3 sm:grid-cols-4">
        <div className="space-y-1">
          <label htmlFor="procedimiento" className="text-xs font-medium">
            Procedimiento
          </label>
          <select
            id="procedimiento"
            name="procedimiento"
            defaultValue=""
            className={inputClasses}
          >
            <option value="">—</option>
            <option value="LPR">LPR</option>
            <option value="LPU">LPU</option>
            <option value="CDI">CDI</option>
          </select>
        </div>
        <div className="space-y-1">
          <label htmlFor="anexo" className="text-xs font-medium">
            Anexo
          </label>
          <select
            id="anexo"
            name="anexo"
            defaultValue=""
            className={inputClasses}
          >
            <option value="">—</option>
            <option value="ANEXO A">ANEXO A</option>
            <option value="ANEXO B">ANEXO B</option>
          </select>
        </div>
        <div className="space-y-1">
          <label htmlFor="ejercicio" className="text-xs font-medium">
            Ejercicio
          </label>
          <input
            id="ejercicio"
            name="ejercicio"
            inputMode="numeric"
            placeholder="2026"
            className={inputClasses}
          />
        </div>
        <div className="space-y-1">
          <label htmlFor="moneda" className="text-xs font-medium">
            Moneda
          </label>
          <select
            id="moneda"
            name="moneda"
            defaultValue="ARS"
            className={inputClasses}
          >
            <option value="ARS">ARS</option>
            <option value="USD">USD</option>
          </select>
        </div>
      </div>
      <div className="space-y-1">
        <label htmlFor="monto_estimado" className="text-xs font-medium">
          Monto estimado
        </label>
        <input
          id="monto_estimado"
          name="monto_estimado"
          inputMode="decimal"
          placeholder="300000000,00"
          className={inputClasses}
        />
      </div>
      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
      <button type="submit" disabled={pending} className={buttonPrimary}>
        {pending ? "Guardando..." : "Agregar"}
      </button>
    </form>
  );
}
