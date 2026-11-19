import { NuevoExpedienteForm } from "./nuevo-form";

export default function ExpedientesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-semibold">Licitaciones</h1>
        <p className="text-sm text-zinc-500">
          Elegí una de la lista a la izquierda para ver su detalle, o agregá
          una nueva acá abajo.
        </p>
      </div>
      <NuevoExpedienteForm />
    </div>
  );
}
