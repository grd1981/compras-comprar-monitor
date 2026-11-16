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
 * IMPORTANTE — login en DOS pasos, con identidades DISTINTAS (confirmado
 * por el usuario): comprar.gob.ar no tiene login propio.
 *
 *   1. Click en "Ingresar" → pantalla de identidad de Argentina.gob.ar,
 *      pide CUIL/CUIT/Pasaporte (variable COMPRAR_USER).
 *   2. Redirige a GDE, que pide OTRO usuario (ej: "dgrene", variable
 *      COMPRAR_GDE_USER — no es el CUIL) + contraseña (COMPRAR_PASS). Al
 *      autenticar, vuelve a comprar.gob.ar ya logueado por SSO.
 *
 * Son 3 variables de entorno distintas, no 2 — no confundir el CUIL con
 * el usuario GDE.
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
  // Son 3 datos distintos: el CUIL/CUIT/Pasaporte se usa en la pantalla
  // de identidad de Argentina.gob.ar; el usuario GDE (ej: "dgrene") y la
  // contraseña se usan después, en la pantalla propia de GDE.
  const cuil = process.env.COMPRAR_USER;
  const usuarioGde = process.env.COMPRAR_GDE_USER;
  const password = process.env.COMPRAR_PASS;

  if (!cuil || !usuarioGde || !password) {
    throw new Error(
      "Faltan COMPRAR_USER, COMPRAR_GDE_USER y/o COMPRAR_PASS en el entorno.",
    );
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
  await page.fill("#txtUsername_txtTextBox", cuil);
  await page.click("#lnkConfirmar");
  await page.waitForLoadState("domcontentloaded");
  await esperarCloudflare(page);
  await paso(page, "2-tras-usuario-comprar");

  // Paso 2: ya en la pantalla propia de GDE (cas.gde.gob.ar), pide
  // usuario (ej: "dgrene") y contraseña — son credenciales GDE, no el
  // CUIL de arriba. Esta pantalla usa un framework (ZK) que genera ids
  // aleatorios en cada carga, así que NO hay que buscar por id: se
  // identifican por su placeholder. El botón "Acceder" es
  // type="button" (no "submit"), se busca por el texto.
  // Confirmado con captura real (calibrado):
  await page.fill('input[placeholder="Usuario/Cuil/Cuit"]', usuarioGde);
  await page.fill('input[placeholder="Contraseña"]', password);

  // Esta pantalla usa reCAPTCHA invisible de Google: si se clickea
  // "Acceder" antes de que termine de cargar el script de Google, tira
  // "grecaptcha is not defined" y el login falla en silencio (confirmado
  // con captura real). Un humano tarda unos segundos en escribir
  // usuario/contraseña, dándole tiempo de sobra; acá hay que esperarlo
  // explícitamente.
  await page
    .waitForFunction(() => typeof (window as unknown as { grecaptcha?: unknown }).grecaptcha !== "undefined", {
      timeout: 15000,
    })
    .catch(() => {});
  await page.waitForTimeout(1500);

  await page.click('button:has-text("Acceder")');

  // GDE es una app ZK: muchas acciones son AJAX, no navegaciones de
  // página completa. Si el login es correcto, en algún momento redirige
  // de vuelta a comprar.gob.ar (cambia de dominio); si falla, se queda
  // en la misma pantalla. Esperamos a que pase el cambio de dominio,
  // con un timeout generoso, antes de dar por terminado el paso.
  await page
    .waitForURL((url) => !url.hostname.includes("gde.gob.ar"), { timeout: 20000 })
    .catch(() => {});
  await page.waitForLoadState("domcontentloaded");
  await esperarCloudflare(page);
  await paso(page, "3-tras-login-gde");

  // TODO(calibrar): si GDE muestra un paso intermedio para elegir el
  // organismo/usuario de GDE con el que operar (algunos usuarios tienen
  // varios), agregar acá el click correspondiente antes de seguir.

  // Verificación: si seguimos viendo el link "Ingresar" (visible solo
  // para usuarios NO logueados), el login falló en silencio —
  // confirmado con una corrida real donde el formulario de GDE se vació
  // sin mensaje de error visible y terminamos en la home pública. Mejor
  // fallar fuerte acá que seguir como si nada.
  const sigueDeslogueado = (await page.locator("#lnkIngresar").count()) > 0;
  if (sigueDeslogueado) {
    await paso(page, "4-login-fallido");
    throw new Error(
      "El login no se completó: seguimos viendo el link \"Ingresar\", o sea sin sesión iniciada. Revisá que COMPRAR_GDE_USER y COMPRAR_PASS sean correctos.",
    );
  }

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
