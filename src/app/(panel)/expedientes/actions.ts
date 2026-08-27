"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type FormState = { error: string } | undefined;

export async function crearExpediente(
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  const numero = String(formData.get("numero") ?? "").trim();
  const organismo = String(formData.get("organismo") ?? "").trim();
  const descripcion = String(formData.get("descripcion") ?? "").trim();
  const url = String(formData.get("url") ?? "").trim();

  if (!numero || !url) {
    return { error: "Completá al menos el número de proceso y la URL." };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("expedientes").insert({
    numero,
    organismo: organismo || null,
    descripcion: descripcion || null,
    url,
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

export async function toggleActivo(id: string, activo: boolean) {
  const supabase = await createClient();
  await supabase.from("expedientes").update({ activo }).eq("id", id);
  revalidatePath("/expedientes");
}

export async function eliminarExpediente(id: string) {
  const supabase = await createClient();
  await supabase.from("expedientes").delete().eq("id", id);
  revalidatePath("/expedientes");
}
