import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";
import { supabaseAdmin } from "./supabase-admin";
import { iniciarSesion, extraerExpediente } from "./comprar-adapter";
import { buscarMovimientosGde } from "./gde-adapter";
import { calcularNovedades, type SnapshotData } from "./diff";
import type { Expediente, GdeSnapshot, Snapshot } from "../src/lib/types";

const DEBUG = process.argv.includes("--debug");
const AVISO_VENCIMIENTO_DIAS = Number(
  process.env.AVISO_VENCIMIENTO_DIAS ?? "3",
);

/** Separa un ISO en fecha (YYYY-MM-DD) y hora (HH:MM) en horario de
 * Argentina, para guardarlos en las columnas fecha_apertura/hora_apertura
 * (que son las mismas que se cargaban a mano). */
function fechaHoraArgentina(iso: string): { fecha: string; hora: string } {
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Argentina/Buenos_Aires",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  const partes = Object.fromEntries(
    fmt.formatToParts(new Date(iso)).map((p) => [p.type, p.value]),
  );
  return {
    fecha: `${partes.year}-${partes.month}-${partes.day}`,
    hora: `${partes.hour}:${partes.minute}`,
  };
}

async function main() {
  const { data: runInsert, error: runError } = await supabaseAdmin
    .from("scrape_runs")
    .insert({})
    .select("id")
    .single();

  if (runError || !runInsert) {
    throw new Error(`No se pudo registrar la corrida: ${runError?.message}`);
  }
  const runId = runInsert.id as string;

  let ok = true;
  let errorMsg: string | null = null;
  let revisados = 0;
  let revisadosGde = 0;

  // headless:false + ocultar navigator.webdriver: el login pasa por
  // Cloudflare (cas.gde.gob.ar), que detecta un Chromium automatizado
  // "de manual" (headless clásico + navigator.webdriver=true) y lo
  // deja trabado en el challenge "Just a moment...". Con esto se ve una
  // ventana de Chromium en pantalla mientras corre.
  const browser = await chromium.launch({
    headless: false,
    args: ["--disable-blink-features=AutomationControlled"],
  });
  const context = await browser.newContext({
    userAgent:
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
  });
  await context.addInitScript(() => {
    Object.defineProperty(navigator, "webdriver", { get: () => undefined });
  });
  const page = await context.newPage();

  try {
    await iniciarSesion(page);

    const { data: expedientes, error } = await supabaseAdmin
      .from("expedientes")
      .select("*")
      .eq("activo", true)
      .not("url", "is", null)
      .returns<Expediente[]>();

    if (error) throw new Error(`No se pudieron leer expedientes: ${error.message}`);

    for (const expediente of expedientes ?? []) {
      if (!expediente.url) continue; // calma a TypeScript; ya filtrado arriba
      try {
        await revisarExpediente(page, expediente, expediente.url);
        revisados++;
      } catch (err) {
        // Un expediente roto (ej: cambió de URL) no debe tumbar la
        // revisión de los demás.
        const msg = err instanceof Error ? err.message : String(err);
        console.error(`Error revisando expediente ${expediente.numero}:`);
        console.error(msg);
        if (err instanceof Error && err.stack) console.error(err.stack);
        if (DEBUG) await guardarDebug(page, `expediente-${expediente.numero}`, msg);
      }
    }

    // Segunda pasada: movimientos de GDE (expediente electrónico), para
    // los expedientes que tienen expediente_nro cargado. Es independiente
    // de la URL de comprar.gob.ar — algunos expedientes tienen una cosa,
    // otra, o ambas.
    const { data: expedientesGde, error: errorGde } = await supabaseAdmin
      .from("expedientes")
      .select("*")
      .eq("activo", true)
      .not("expediente_nro", "is", null)
      .returns<Expediente[]>();

    if (errorGde) {
      throw new Error(`No se pudieron leer expedientes (GDE): ${errorGde.message}`);
    }

    for (const expediente of expedientesGde ?? []) {
      if (!expediente.expediente_nro) continue;
      try {
        await revisarExpedienteGde(page, expediente, expediente.expediente_nro);
        revisadosGde++;
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error(`Error revisando GDE del expediente ${expediente.numero}:`);
        console.error(msg);
        if (err instanceof Error && err.stack) console.error(err.stack);
        if (DEBUG) await guardarDebug(page, `gde-expediente-${expediente.numero}`, msg);
      }
    }
  } catch (err) {
    ok = false;
    errorMsg = err instanceof Error ? err.message : String(err);
    console.error("Error general del scraper:");
    console.error(errorMsg);
    if (err instanceof Error && err.stack) console.error(err.stack);
    if (DEBUG) await guardarDebug(page, "error-general", errorMsg);
  } finally {
    await browser.close();
  }

  await supabaseAdmin
    .from("scrape_runs")
    .update({
      finished_at: new Date().toISOString(),
      ok,
      error: errorMsg,
      expedientes_revisados: revisados,
      expedientes_gde_revisados: revisadosGde,
    })
    .eq("id", runId);

  if (!ok) process.exitCode = 1;
}

async function revisarExpediente(
  page: import("playwright").Page,
  expediente: Expediente,
  url: string,
) {
  const actual = await extraerExpediente(page, url);

  const { data: previaData } = await supabaseAdmin
    .from("snapshots")
    .select("*")
    .eq("expediente_id", expediente.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle<Snapshot>();

  const anterior: SnapshotData | null = previaData
    ? {
        estado: previaData.estado,
        plazo_limite: previaData.plazo_limite,
        consultas: previaData.consultas,
      }
    : null;

  const candidatas = calcularNovedades(anterior, actual, {
    avisoVencimientoDias: AVISO_VENCIMIENTO_DIAS,
  });

  await supabaseAdmin.from("snapshots").insert({
    expediente_id: expediente.id,
    estado: actual.estado,
    plazo_limite: actual.plazo_limite,
    consultas: actual.consultas,
  });

  // Autocompletar fecha/hora de apertura en la ficha de la licitación con
  // lo que efectivamente dice comprar.gob.ar, para no tener que cargarlo
  // a mano cada vez.
  if (actual.plazo_limite) {
    const { fecha, hora } = fechaHoraArgentina(actual.plazo_limite);
    await supabaseAdmin
      .from("expedientes")
      .update({ fecha_apertura: fecha, hora_apertura: hora })
      .eq("id", expediente.id);
  }

  for (const candidata of candidatas) {
    if (candidata.tipo === "vencimiento_proximo") {
      // Evitar mandar el mismo aviso de vencimiento varias veces el
      // mismo día si el scraper corre más de una vez.
      const desde = new Date();
      desde.setHours(0, 0, 0, 0);
      const { count } = await supabaseAdmin
        .from("novedades")
        .select("id", { count: "exact", head: true })
        .eq("expediente_id", expediente.id)
        .eq("tipo", "vencimiento_proximo")
        .gte("detectado_en", desde.toISOString());
      if (count && count > 0) continue;
    }

    await supabaseAdmin.from("novedades").insert({
      expediente_id: expediente.id,
      tipo: candidata.tipo,
      detalle: candidata.detalle,
    });
  }
}

async function revisarExpedienteGde(
  page: import("playwright").Page,
  expediente: Expediente,
  numeroExpediente: string,
) {
  const movimientos = await buscarMovimientosGde(page, numeroExpediente);

  const { data: previaData } = await supabaseAdmin
    .from("gde_snapshots")
    .select("*")
    .eq("expediente_id", expediente.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle<GdeSnapshot>();

  await supabaseAdmin.from("gde_snapshots").insert({
    expediente_id: expediente.id,
    movimientos,
  });

  // Igual que con los snapshots de comprar.gob.ar: en la primera revisión
  // de un expediente (todavía no hay "previaData") no avisamos nada,
  // porque no es una novedad, es solo la primera foto.
  const actualTope = movimientos[0] ?? null;
  const anteriorTope = previaData?.movimientos?.[0] ?? null;

  const huboMovimientoNuevo =
    previaData !== null &&
    actualTope !== null &&
    (anteriorTope === null ||
      anteriorTope.orden !== actualTope.orden ||
      anteriorTope.numero_documento !== actualTope.numero_documento);

  if (huboMovimientoNuevo && actualTope) {
    await supabaseAdmin.from("novedades").insert({
      expediente_id: expediente.id,
      tipo: "movimiento_gde",
      detalle: `Nuevo movimiento en el expediente: ${actualTope.tipo_documento ?? "documento"}${
        actualTope.numero_documento ? ` ${actualTope.numero_documento}` : ""
      }.`,
    });
  }
}

async function guardarDebug(
  page: import("playwright").Page,
  nombre: string,
  errorMsg?: string | null,
) {
  const dir = path.join(process.cwd(), "scripts", "debug");
  await mkdir(dir, { recursive: true });
  const base = path.join(dir, `${nombre}-${Date.now()}`);
  await page.screenshot({ path: `${base}.png`, fullPage: true }).catch(() => {});
  const html = await page.content().catch(() => null);
  if (html) await writeFile(`${base}.html`, html, "utf-8");
  if (errorMsg) await writeFile(`${base}.txt`, errorMsg, "utf-8");
  console.error(`Debug guardado en ${base}.{png,html,txt}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
