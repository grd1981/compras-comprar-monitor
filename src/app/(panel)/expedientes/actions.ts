"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { campoBooleano, campoNumero, campoTexto } from "@/lib/form";

export type FormState = { error: string } | undefined;

export async function crearExpediente(
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  const numeroProceso = campoTexto(formData, "numero");

  if (!numeroProceso) {
    return { error: "Completá al menos el número de proceso." };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("expedientes").insert({
    numero: numeroProceso,
    organismo: campoTexto(formData, "organismo"),
    descripcion: campoTexto(formData, "descripcion"),
    expediente_nro: campoTexto(formData, "expediente_nro"),
    objeto: campoTexto(formData, "objeto"),
    url: campoTexto(formData, "url"),
    procedimiento: campoTexto(formData, "procedimiento"),
    ejercicio: campoNumero(formData, "ejercicio"),
    anexo: campoTexto(formData, "anexo"),
    moneda: campoTexto(formData, "moneda") ?? "ARS",
    monto_estimado: campoNumero(formData, "monto_estimado"),
  });

  if (error) {
    return {
      error: error.code === "23505"
        ? "Ya existe un expediente con ese número."
        : "No se pudo guardar el expediente.",
    };
  }

  revalidatePath("/expedientes");
}

export async function actualizarExpediente(
  id: string,
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  const numeroProceso = campoTexto(formData, "numero");
  if (!numeroProceso) {
    return { error: "El número de proceso no puede quedar vacío." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("expedientes")
    .update({
      numero: numeroProceso,
      organismo: campoTexto(formData, "organismo"),
      descripcion: campoTexto(formData, "descripcion"),
      expediente_nro: campoTexto(formData, "expediente_nro"),
      objeto: campoTexto(formData, "objeto"),
      url: campoTexto(formData, "url"),
      procedimiento: campoTexto(formData, "procedimiento"),
      ejercicio: campoNumero(formData, "ejercicio"),
      anexo: campoTexto(formData, "anexo"),
      moneda: campoTexto(formData, "moneda") ?? "ARS",
      monto_estimado: campoNumero(formData, "monto_estimado"),

      envio_jur: campoBooleano(formData, "envio_jur"),
      fecha_jur: campoTexto(formData, "fecha_jur"),
      envio_cece: campoBooleano(formData, "envio_cece"),
      cece_link: campoTexto(formData, "cece_link"),
      bora: campoBooleano(formData, "bora"),
      bora_link: campoTexto(formData, "bora_link"),
      pedido_sigen: campoBooleano(formData, "pedido_sigen"),
      pedido_sigen_link: campoTexto(formData, "pedido_sigen_link"),
      fecha_difusion: campoTexto(formData, "fecha_difusion"),
      respuesta_sigen: campoBooleano(formData, "respuesta_sigen"),
      link_rta_sigen: campoTexto(formData, "link_rta_sigen"),
      resol_aprobacion_pbcp: campoTexto(formData, "resol_aprobacion_pbcp"),
      resol_link: campoTexto(formData, "resol_link"),

      fecha_apertura: campoTexto(formData, "fecha_apertura"),
      hora_apertura: campoTexto(formData, "hora_apertura"),
      acta_apertura_link: campoTexto(formData, "acta_apertura_link"),
      cuadro_comparativo_link: campoTexto(formData, "cuadro_comparativo_link"),
      resolucion_adjudicacion: campoTexto(formData, "resolucion_adjudicacion"),
      link_resol_adj: campoTexto(formData, "link_resol_adj"),
      monto_adjudicado: campoNumero(formData, "monto_adjudicado"),
      plazo_contrato: campoTexto(formData, "plazo_contrato"),

      estado_proceso: campoTexto(formData, "estado_proceso"),
      observaciones: campoTexto(formData, "observaciones"),
    })
    .eq("id", id);

  if (error) {
    return {
      error: error.code === "23505"
        ? "Ya existe otra licitación con ese número."
        : "No se pudo guardar. Intentá de nuevo.",
    };
  }

  revalidatePath(`/expedientes/${id}`);
  revalidatePath("/expedientes");
  redirect(`/expedientes/${id}`);
}

export async function toggleActivo(id: string, activo: boolean) {
  const supabase = await createClient();
  await supabase.from("expedientes").update({ activo }).eq("id", id);
  revalidatePath("/expedientes", "layout");
  revalidatePath(`/expedientes/${id}`);
}

export async function eliminarExpediente(id: string) {
  const supabase = await createClient();
  await supabase.from("expedientes").delete().eq("id", id);
  revalidatePath("/expedientes", "layout");
  redirect("/expedientes");
}
