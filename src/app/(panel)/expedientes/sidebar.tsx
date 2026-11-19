"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Expediente } from "@/lib/types";
import { estadoProcesoClasses } from "@/lib/ui";

type Item = Pick<Expediente, "id" | "numero" | "descripcion" | "estado_proceso" | "activo">;

export function ExpedientesSidebar({ items }: { items: Item[] }) {
  const pathname = usePathname();

  return (
    <nav className="space-y-0.5">
      <Link
        href="/expedientes"
        className={`block rounded-md px-2 py-1.5 text-xs font-medium ${
          pathname === "/expedientes"
            ? "bg-blue-600 text-white"
            : "text-zinc-400 hover:bg-zinc-800"
        }`}
      >
        + Agregar licitación
      </Link>
      <div className="mt-2 max-h-[70vh] space-y-0.5 overflow-y-auto">
        {items.map((e) => {
          const activa = pathname.startsWith(`/expedientes/${e.id}`);
          return (
            <Link
              key={e.id}
              href={`/expedientes/${e.id}`}
              className={`block rounded-md px-2 py-1.5 ${
                activa ? "bg-zinc-800" : "hover:bg-zinc-900"
              } ${e.activo ? "" : "opacity-50"}`}
            >
              <p className="truncate text-sm font-medium">{e.numero}</p>
              <p className="truncate text-xs text-zinc-500">
                {e.descripcion ?? "—"}
              </p>
              {e.estado_proceso && (
                <span
                  className={`mt-0.5 inline-block rounded-full px-1.5 py-0 text-[10px] font-medium ${estadoProcesoClasses(e.estado_proceso)}`}
                >
                  {e.estado_proceso}
                </span>
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
