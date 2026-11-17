import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Expediente } from "@/lib/types";
import { EditarExpedienteForm } from "./editar-form";

export default async function EditarExpedientePage({
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

  return (
    <div className="space-y-6">
      <div>
        <Link
          href={`/expedientes/${id}`}
          className="text-xs text-zinc-500 hover:underline"
        >
          ← Volver al detalle
        </Link>
        <h1 className="mt-1 text-lg font-semibold">
          Editar {expediente.numero}
        </h1>
      </div>
      <EditarExpedienteForm expediente={expediente} />
    </div>
  );
}
