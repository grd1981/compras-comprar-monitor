"use client";

import { useActionState } from "react";
import { crearRenglonOC, type FormState } from "./ejecucion-actions";
import { buttonPrimary, inputClasses } from "@/lib/ui";

export function NuevoRenglonForm({ expedienteId }: { expedienteId: string }) {
  const accion = crearRenglonOC.bind(null, expedienteId);
  const [state, formAction, pending] = useActionState<FormState, FormData>(
    accion,
    undefined,
  );

  return (
    <form action={formAction} className="space-y-2 rounded-md border border-dashed border-zinc-300 p-3 dark:border-zinc-700">
      <p className="text-xs font-medium text-zinc-500">Agregar renglón de OC</p>
      <div className="grid gap-2 sm:grid-cols-6">
        <input name="id_oc" placeholder="Nº de OC" className={`${inputClasses} sm:col-span-2`} />
        <input name="renglon" placeholder="Renglón" inputMode="numeric" className={inputClasses} />
        <input name="inciso" placeholder="Inciso" inputMode="numeric" className={inputClasses} />
        <input name="adjudicatario" placeholder="Adjudicatario" className={`${inputClasses} sm:col-span-2`} />
      </div>
      <input name="descripcion" placeholder="Descripción" className={inputClasses} />
      <div className="grid gap-2 sm:grid-cols-4">
        <input name="importe_unitario" placeholder="Importe unitario" inputMode="decimal" className={inputClasses} />
        <input name="monto_adjudicado" placeholder="Monto adjudicado" inputMode="decimal" className={inputClasses} />
        <input name="cantidad_adjudicada" placeholder="Cantidad adjudicada" inputMode="decimal" className={inputClasses} />
        <input name="cantidad_entregada" placeholder="Cantidad entregada" inputMode="decimal" className={inputClasses} />
      </div>
      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
      <button type="submit" disabled={pending} className={buttonPrimary}>
        {pending ? "Guardando..." : "Agregar renglón"}
      </button>
    </form>
  );
}
