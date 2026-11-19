import { createClient } from "@/lib/supabase/server";
import type { Expediente } from "@/lib/types";
import { ExpedientesSidebar } from "./sidebar";

export default async function ExpedientesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("expedientes")
    .select("id, numero, descripcion, estado_proceso, activo")
    .order("numero", { ascending: true })
    .returns<Pick<Expediente, "id" | "numero" | "descripcion" | "estado_proceso" | "activo">[]>();

  return (
    <div className="grid gap-4 md:grid-cols-[260px_1fr]">
      <aside className="md:border-r md:border-zinc-800 md:pr-3">
        <ExpedientesSidebar items={data ?? []} />
      </aside>
      <main className="min-w-0">{children}</main>
    </div>
  );
}
