import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import type { Page } from "playwright";
import type { Consulta } from "../src/lib/types";
import type { SnapshotData } from "./diff";

const DEBUG = process.argv.includes("--debug");

/** Cloudflare a veces muestra una pantalla intermedia "Just a moment..."
 * mientras verifica que el navegador no sea un bot. Suele resolverse sola
 * en pocos segundos sin intervención; esperamos a que el título cambie
 * antes de seguir, en vez de asumir que ya cargó la página siguiente. */
async function esperarCloudflare(page: Page): Promise<void> {
  try {
    await page.waitForFunction(
      () => !document.title.toLowerCase().includes("just a moment"),
      { timeout: 20000 },
    );
  } catch {
    // Si a los 15s seguimos en el challenge, probablemente no se resuelve
    // solo (ver captura de debug para confirmarlo).
  }
}

/** Captura una foto del estado actual, solo si --debug está activo. Sirve
 * para ver cada paso del login sin esperar a que algo falle. */
async function paso(page: Page, nombre: string): Promise<void> {
  if (!DEBUG) return;
  const dir = path.join(process.cwd(), "scripts", "debug");
  await mkdir(dir, { recursive: true });
  const base = path.join(dir, `paso-${nombre}-${Date.now()}`);
  await page.screenshot({ path: `${base}.png`, fullPage: true }).catch(() => {});
  const html = await page.content().catch(() => null);
  if (html) await writeFile(`${base}.html`, html, "utf-8");
}

/**
 * ⚠️ ESTE ARCHIVO NECESITA CALIBRACIÓN CONTRA EL SITIO REAL.
 *
 * No tengo forma de navegar comprar.gob.ar con tus credenciales reales, así
 * que los selectores de abajo son un punto de partida razonable (basado
 * en cómo suelen armarse estos portales) pero probablemente no coincidan
 * 1:1 con el HTML real. Para calibrarlos:
 *
 *   1. Corré `npm run scrape -- --debug` una vez con tus credenciales.
 *   2. Si algo falla, se van a guardar capturas y el HTML de la página en
 *      scripts/debug/ (carpeta ignorada por git, nunca se sube nada).
 *   3. Abrí esas capturas, inspeccioná el HTML real en el navegador
 *      (botón derecho → Inspeccionar) y ajustá los selectores acá abajo.
 *   4. Repetí hasta que el dry-run extraiga bien estado / consultas / plazo.
 *
 * Toda la lógica específica del sitio vive en este único archivo — el
 * resto del scraper (diff.ts, scrape.ts) no sabe nada de comprar.gob.ar.
 *
 * IMPORTANTE — login en DOS pasos vía GDE (SSO): comprar.gob.ar no tiene
 * login propio. El flujo real (confirmado por el usuario) es:
 *
 *   1. comprar.gob.ar pide solo el USUARIO (sin contraseña) y redirige a GDE.
 *   2. GDE pide usuario + contraseña y, al autenticar, redirige de vuelta
 *      a comprar.gob.ar ya logueado por SSO.
 *
 * Por eso `iniciarSesion` completa el formulario en dos tandas: primero
 * el campo de usuario en comprar.gob.ar, y luego usuario+contraseña en la
 * página de GDE a la que redirige.
 *
 * ⚠️ Riesgo real a verificar en la calibración: si el login de GDE pide
 * captcha o un segundo factor (SMS/TOTP), la automatización completa NO
 * va a ser posible tal cual — en ese caso avisame apenas lo veas en las
 * capturas de debug y vemos una alternativa (ej: sesión persistente con
 * cookies guardadas a mano, en vez de loguear desde cero cada corrida).
 */

const BASE_URL = "https://comprar.gob.ar";
// URL de la pantalla de comprar.gob.ar donde se tipea el usuario antes de
// redirigir a GDE. Si tenés el link directo a esa pantalla, pasalo acá.
const ENTRY_URL = process.env.COMPRAR_LOGIN_URL ?? BASE_URL;

export async function iniciarSesion(page: Page): Promise<void> {
  const usuario = process.env.COMPRAR_USER;
  const password = process.env.COMPRAR_PASS;

  if (!usuario || !password) {
    throw new Error("Faltan COMPRAR_USER y/o COMPRAR_PASS en el entorno.");
  }

  // Paso 0: home pública de comprar.gob.ar. Hay que clickear "Ingresar"
  // (id="lnkIngresar") para llegar a la pantalla de login real.
  await page.goto(ENTRY_URL, { waitUntil: "domcontentloaded" });
  await esperarCloudflare(page);
  await paso(page, "0-home");

  await page.click("#lnkIngresar");
  await page.waitForLoadState("domcontentloaded");
  await esperarCloudflare(page);
  await paso(page, "1-tras-click-ingresar");

  // Paso 1: pantalla de comprar.gob.ar, solo pide el usuario.
  // Pantalla "Ingresá" de Argentina.gob.ar: pide CUIL/CUIT/Pasaporte.
  // Confirmado con captura real (calibrado):
  await page.fill("#txtUsername_txtTextBox", usuario);
  await page.click("#lnkConfirmar");
  await page.waitForLoadState("domcontentloaded");
  await esperarCloudflare(page);
  await paso(page, "2-tras-usuario-comprar");

  // Paso 2: siguiente pantalla de Argentina.gob.ar, debería pedir la
  // contraseña (todavía sin calibrar selector exacto — ajustar según la
  // captura "paso-2-tras-usuario-comprar" del próximo run).
  // TODO(calibrar): reemplazar por el selector real una vez visto el HTML.
  await page.fill(
    'input[name="password"], input[type="password"], #txtPassword_txtTextBox',
    password,
  );
  await page.click('#lnkConfirmar, button[type="submit"]');
  await page.waitForLoadState("domcontentloaded");
  await esperarCloudflare(page);
  await paso(page, "3-tras-login-gde");

  // TODO(calibrar): si GDE muestra un paso intermedio para elegir el
  // organismo/usuario de GDE con el que operar (algunos usuarios tienen
  // varios), agregar acá el click correspondiente antes de seguir.

  // TODO(calibrar): reemplazar por un selector que solo exista una vez
  // logueado y de vuelta en comprar.gob.ar (ej: el menú de usuario, o el
  // link a "Mis procesos").
  await page.waitForLoadState("domcontentloaded");
}

export async function extraerExpediente(
  page: Page,
  url: string,
): Promise<SnapshotData> {
  await page.goto(url, { waitUntil: "domcontentloaded" });

  // TODO(calibrar): estos tres extractores son los que más importa
  // afinar. Cada uno debe devolver `null`/`[]` si no encuentra nada en
  // vez de tirar una excepción, para que un cambio de layout en una
  // sección no tumbe la revisión de las otras.
  const estado = await extraerEstado(page);
  const plazoLimite = await extraerPlazoLimite(page);
  const consultas = await extraerConsultas(page);

  return { estado, plazo_limite: plazoLimite, consultas };
}

async function extraerEstado(page: Page): Promise<string | null> {
  const el = page.locator('[data-testid="estado-proceso"], .estado-proceso').first();
  if ((await el.count()) === 0) return null;
  const texto = (await el.textContent())?.trim();
  return texto || null;
}

async function extraerPlazoLimite(page: Page): Promise<string | null> {
  const el = page
    .locator('[data-testid="fecha-limite"], .fecha-limite-oferta')
    .first();
  if ((await el.count()) === 0) return null;
  const texto = (await el.textContent())?.trim();
  if (!texto) return null;
  return parseFechaArgentina(texto);
}

async function extraerConsultas(page: Page): Promise<Consulta[]> {
  const filas = page.locator('[data-testid="consulta-item"], .consulta-item');
  const total = await filas.count();
  const consultas: Consulta[] = [];

  for (let i = 0; i < total; i++) {
    const fila = filas.nth(i);
    const id =
      (await fila.getAttribute("data-consulta-id")) ?? `consulta-${i}`;
    const texto = ((await fila.locator(".consulta-texto").first().textContent()) ?? "").trim();
    const fecha = ((await fila.locator(".consulta-fecha").first().textContent()) ?? "").trim();
    const respuestaLocator = fila.locator(".consulta-respuesta").first();
    const respuesta =
      (await respuestaLocator.count()) > 0
        ? ((await respuestaLocator.textContent()) ?? "").trim() || null
        : null;

    if (texto) {
      consultas.push({ id, texto, fecha: fecha || null, respuesta });
    }
  }

  return consultas;
}

/** Convierte "dd/mm/yyyy hh:mm" (formato típico AR) a ISO. Ajustar si el
 * sitio usa otro formato. */
function parseFechaArgentina(texto: string): string | null {
  const match = texto.match(
    /(\d{1,2})\/(\d{1,2})\/(\d{4})(?:[ T](\d{1,2}):(\d{2}))?/,
  );
  if (!match) return null;
  const [, dd, mm, yyyy, hh = "0", min = "0"] = match;
  const fecha = new Date(
    Number(yyyy),
    Number(mm) - 1,
    Number(dd),
    Number(hh),
    Number(min),
  );
  return Number.isNaN(fecha.getTime()) ? null : fecha.toISOString();
}
