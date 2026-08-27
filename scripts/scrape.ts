import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";
import { supabaseAdmin } from "./supabase-admin";
import { iniciarSesion, extraerExpediente } from "./comprar-adapter";
import { calcularNovedades, type SnapshotData } from "./diff";
import type { Expediente, Snapshot } from "../src/lib/types";

const DEBUG = process.argv.includes("--debug");
const AVISO_VENCIMIENTO_DIAS = Number(
  process.env.AVISO_VENCIMIENTO_DIAS ?? "3",
);

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

  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    await iniciarSesion(page);

    const { data: expedientes, error } = await supabaseAdmin
      .from("expedientes")
      .select("*")
      .eq("activo", true)
      .returns<Expediente[]>();

    if (error) throw new Error(`No se pudieron leer expedientes: ${error.message}`);

    for (const expediente of expedientes ?? []) {
      try {
        await revisarExpediente(page, expediente);
        revisados++;
      } catch (err) {
        // Un expediente roto (ej: cambió de URL) no debe tumbar la
        // revisión de los demás.
        console.error(`Error revisando expediente ${expediente.numero}:`, err);
        if (DEBUG) await guardarDebug(page, `expediente-${expediente.numero}`);
      }
    }
  } catch (err) {
    ok = false;
    errorMsg = err instanceof Error ? err.message : String(err);
    console.error("Error general del scraper:", err);
    if (DEBUG) await guardarDebug(page, "error-general");
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
    })
    .eq("id", runId);

  if (!ok) process.exitCode = 1;
}

async function revisarExpediente(
  page: import("playwright").Page,
  expediente: Expediente,
) {
  const actual = await extraerExpediente(page, expediente.url);

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

async function guardarDebug(page: import("playwright").Page, nombre: string) {
  const dir = path.join(process.cwd(), "scripts", "debug");
  await mkdir(dir, { recursive: true });
  const base = path.join(dir, `${nombre}-${Date.now()}`);
  await page.screenshot({ path: `${base}.png`, fullPage: true }).catch(() => {});
  const html = await page.content().catch(() => null);
  if (html) await writeFile(`${base}.html`, html, "utf-8");
  console.error(`Debug guardado en ${base}.{png,html}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
