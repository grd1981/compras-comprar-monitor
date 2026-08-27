"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function marcarLeida(id: string) {
  const supabase = await createClient();
  await supabase.from("novedades").update({ leida: true }).eq("id", id);
  revalidatePath("/");
}

export async function marcarTodasLeidas() {
  const supabase = await createClient();
  await supabase.from("novedades").update({ leida: true }).eq("leida", false);
  revalidatePath("/");
}
