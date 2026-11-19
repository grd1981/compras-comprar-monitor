import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import type { Page } from "playwright";
import type { MovimientoGde } from "../src/lib/types";

const DEBUG = process.argv.includes("--debug");

async function paso(page: Page, nombre: string): Promise<void> {
  if (!DEBUG) return;
  const dir = path.join(process.cwd(), "scripts", "debug");
  await mkdir(dir, { recursive: true });
  const base = path.join(dir, `gde-${nombre}-${Date.now()}`);
  await page.screenshot({ path: `${base}.png`, fullPage: true }).catch(() => {});
  const html = await page.content().catch(() => null);
  if (html) await writeFile(`${base}.html`, html, "utf-8");
}

const GDE_URL =
  process.env.GDE_EXPEDIENTES_URL ??
  "https://eue.gde.gob.ar/expedientes-web/panelUsuario.zul";

/**
 * ⚠️ ESTE ARCHIVO TAMBIÉN NECESITA CALIBRACIÓN CONTRA EL SITIO REAL, igual
 * que comprar-adapter.ts — no tengo forma de navegar GDE con tus
 * credenciales. Los selectores de abajo están armados a partir de las
 * capturas que mandaste, no de HTML real.
 *
 * Para calibrar: corré `npm run scrape -- --debug` y revisá
 * scripts/debug/gde-*.png / .html si algo falla.
 *
 * Flujo esperado (según tus capturas):
 *   1. Entrar a panelUsuario.zul. Como ya estamos logueados en GDE vía el
 *      mismo SSO (CAS) que usa comprar.gob.ar, no debería volver a pedir
 *      usuario/contraseña — si lo pide, avisame, porque significaría que
 *      hay que loguear dos veces.
 *   2. Buscar el expediente con la barra de arriba ("Ingrese el número
 *      GDE"), con el número TAL CUAL está cargado en expediente_nro (ojo:
 *      el formato real tiene un espacio raro antes de "-APN", ej.
 *      "EX-2025-114025128- -APN-DGM#EA" — no lo "limpiamos").
 *   3. Aparece un renglón con un combo "Acciones" (Seleccione / Visualizar
 *      / Tramitar / Adquirir) — elegimos "Visualizar".
 *   4. Se abre un diálogo "Tramitación" con la pestaña "Documentos" ya
 *      activa: una tabla "Con Pase" (Orden, Tipo de Documento, Número
 *      Documento, Referencia, Fecha de Asociación, Fecha de Creación)
 *      ordenada de más nuevo a más viejo — el de arriba es el último
 *      movimiento.
 *
 * TODO(calibrar): si el buscador de arriba no encuentra el expediente
 * (puede pasar si no tenés una tarea propia pendiente ahí), la
 * alternativa que mostraste es la pestaña "Consultas" → radio
 * "Tramitados por mi repartición" → Buscar. Si el paso 2 falla seguido
 * para expedientes que sabés que existen, agregamos ese flujo acá.
 */
export async function buscarMovimientosGde(
  page: Page,
  numeroExpediente: string,
): Promise<MovimientoGde[]> {
  await page.goto(GDE_URL, { waitUntil: "domcontentloaded" });
  await paso(page, "0-panel");

  const buscador = page.getByPlaceholder("Ingrese el número GDE");
  await buscador.waitFor({ timeout: 15000 });
  await buscador.fill(numeroExpediente);
  await buscador.press("Enter");
  await page.waitForLoadState("domcontentloaded");
  await page.waitForTimeout(800);
  await paso(page, "1-resultado-busqueda");

  const fila = page.locator("tr", { hasText: numeroExpediente }).first();
  if ((await fila.count()) === 0) {
    await paso(page, "2-sin-resultados");
    throw new Error(
      `No se encontró el expediente ${numeroExpediente} con el buscador de arriba (puede necesitar el flujo de "Consultas" → Tramitados por mi repartición, todavía no calibrado).`,
    );
  }

  const combo = fila.locator("select");
  await combo.waitFor({ timeout: 10000 });
  await combo.selectOption({ label: "Visualizar" });
  await page.waitForTimeout(800);
  await paso(page, "3-tras-visualizar");

  // Nos guiamos por el encabezado "Tipo de Documento" en vez de una clase
  // CSS interna de ZK (que suele ser inestable entre versiones).
  const tabla = page
    .locator('table:has(th:has-text("Tipo de Documento")), table:has(td:has-text("Tipo de Documento"))')
    .first();
  await tabla.waitFor({ timeout: 10000 }).catch(() => {});

  const filasDocumentos = tabla.locator("tbody tr");
  const total = await filasDocumentos.count();
  const movimientos: MovimientoGde[] = [];

  for (let i = 0; i < Math.min(total, 5); i++) {
    const celdas = filasDocumentos.nth(i).locator("td");
    const ordenTexto = ((await celdas.nth(0).textContent()) ?? "").trim();
    const tipo = ((await celdas.nth(1).textContent()) ?? "").trim();
    const numero = ((await celdas.nth(2).textContent()) ?? "").trim();
    const referencia = ((await celdas.nth(3).textContent()) ?? "").trim();
    const fechaAsociacion = ((await celdas.nth(4).textContent()) ?? "").trim();
    const fechaCreacion = ((await celdas.nth(5).textContent()) ?? "").trim();

    if (!ordenTexto && !numero) continue;

    movimientos.push({
      orden: ordenTexto && !Number.isNaN(Number(ordenTexto)) ? Number(ordenTexto) : null,
      tipo_documento: tipo || null,
      numero_documento: numero || null,
      referencia: referencia || null,
      fecha_asociacion: fechaAsociacion || null,
      fecha_creacion: fechaCreacion || null,
    });
  }

  if (movimientos.length === 0) await paso(page, "4-sin-documentos");

  return movimientos;
}
