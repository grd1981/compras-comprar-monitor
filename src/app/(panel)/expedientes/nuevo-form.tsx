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
      <h2 className="text-sm font-semibold">Agregar expediente a seguir</h2>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <label htmlFor="numero" className="text-xs font-medium">
            Número de proceso *
          </label>
          <input
            id="numero"
            name="numero"
            required
            placeholder="ej: EX-2026-000123-APN"
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
        <label htmlFor="url" className="text-xs font-medium">
          URL del proceso en comprar.ar *
        </label>
        <input
          id="url"
          name="url"
          type="url"
          required
          placeholder="https://comprar.ar/..."
          className={inputClasses}
        />
      </div>
      <div className="space-y-1">
        <label htmlFor="descripcion" className="text-xs font-medium">
          Descripción (opcional)
        </label>
        <input id="descripcion" name="descripcion" className={inputClasses} />
      </div>
      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
      <button type="submit" disabled={pending} className={buttonPrimary}>
        {pending ? "Guardando..." : "Agregar"}
      </button>
    </form>
  );
}
