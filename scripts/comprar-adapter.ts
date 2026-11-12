import type { Page } from "playwright";
import type { Consulta } from "../src/lib/types";
import type { SnapshotData } from "./diff";

/**
 * ⚠️ ESTE ARCHIVO NECESITA CALIBRACIÓN CONTRA EL SITIO REAL.
 *
 * No tengo forma de navegar comprar.ar con tus credenciales reales, así
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
 * resto del scraper (diff.ts, scrape.ts) no sabe nada de comprar.ar.
 *
 * IMPORTANTE — login vía GDE (SSO): comprar.ar no tiene login propio, usa
 * como identidad GDE (Gestión Documental Electrónica). Al entrar a una
 * sección privada de comprar.ar, el sitio redirige automáticamente al
 * login de GDE; una vez autenticado ahí, GDE redirige de vuelta a
 * comprar.ar ya logueado. Por eso acá NO navegamos a una URL de login de
 * comprar.ar: navegamos a una página privada de comprar.ar (la de un
 * expediente, por ejemplo) y dejamos que la redirección a GDE ocurra
 * sola; el formulario que se completa es el de GDE.
 *
 * ⚠️ Riesgo real a verificar en la calibración: si el login de GDE pide
 * captcha o un segundo factor (SMS/TOTP), la automatización completa NO
 * va a ser posible tal cual — en ese caso avisame apenas lo veas en las
 * capturas de debug y vemos una alternativa (ej: sesión persistente con
 * cookies guardadas a mano, en vez de loguear desde cero cada corrida).
 */

const BASE_URL = "https://comprar.ar";
// URL de una página privada de comprar.ar que dispare la redirección a
// GDE. Si tenés un link directo a "Mis procesos" o similar, pasalo acá.
const ENTRY_URL = process.env.COMPRAR_LOGIN_URL ?? BASE_URL;

export async function iniciarSesion(page: Page): Promise<void> {
  const usuario = process.env.COMPRAR_USER;
  const password = process.env.COMPRAR_PASS;

  if (!usuario || !password) {
    throw new Error("Faltan COMPRAR_USER y/o COMPRAR_PASS en el entorno.");
  }

  // Navegamos a comprar.ar y dejamos que redirija solo a GDE.
  await page.goto(ENTRY_URL, { waitUntil: "networkidle" });

  // TODO(calibrar): ajustar estos selectores al formulario real de GDE.
  // GDE suele pedir CUIT/usuario y contraseña en una sola pantalla.
  await page.fill(
    'input[name="usuario"], input[name="cuit"], input[type="email"]',
    usuario,
  );
  await page.fill('input[name="password"], input[type="password"]', password);
  await page.click('button[type="submit"]');

  // TODO(calibrar): si GDE muestra un paso intermedio para elegir el
  // organismo/usuario de GDE con el que operar (algunos usuarios tienen
  // varios), agregar acá el click correspondiente antes de seguir.

  // TODO(calibrar): reemplazar por un selector que solo exista una vez
  // logueado (ej: el menú de usuario, o el link a "Mis procesos").
  await page.waitForLoadState("networkidle");
}

export async function extraerExpediente(
  page: Page,
  url: string,
): Promise<SnapshotData> {
  await page.goto(url, { waitUntil: "networkidle" });

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
