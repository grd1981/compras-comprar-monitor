"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { campoNumero, campoTexto } from "@/lib/form";

export type FormState = { error: string } | undefined;

export async function crearRenglonOC(
  expedienteId: string,
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  const supabase = await createClient();
  const { error } = await supabase.from("ejecucion_oc").insert({
    expediente_id: expedienteId,
    id_oc: campoTexto(formData, "id_oc"),
    adjudicatario: campoTexto(formData, "adjudicatario"),
    renglon: campoNumero(formData, "renglon"),
    descripcion: campoTexto(formData, "descripcion"),
    importe_unitario: campoNumero(formData, "importe_unitario"),
    monto_adjudicado: campoNumero(formData, "monto_adjudicado"),
    cantidad_adjudicada: campoNumero(formData, "cantidad_adjudicada"),
    cantidad_entregada: campoNumero(formData, "cantidad_entregada") ?? 0,
    inciso: campoNumero(formData, "inciso"),
  });

  if (error) {
    return { error: "No se pudo guardar el renglón." };
  }

  revalidatePath(`/expedientes/${expedienteId}`);
}

export async function actualizarCantidadEntregada(
  expedienteId: string,
  renglonId: string,
  formData: FormData,
) {
  const supabase = await createClient();
  const cantidad = campoNumero(formData, "cantidad_entregada") ?? 0;
  await supabase
    .from("ejecucion_oc")
    .update({ cantidad_entregada: cantidad })
    .eq("id", renglonId);
  revalidatePath(`/expedientes/${expedienteId}`);
}

export async function eliminarRenglonOC(expedienteId: string, renglonId: string) {
  const supabase = await createClient();
  await supabase.from("ejecucion_oc").delete().eq("id", renglonId);
  revalidatePath(`/expedientes/${expedienteId}`);
}
