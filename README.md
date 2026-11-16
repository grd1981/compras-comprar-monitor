# Monitor de Compras — comprar.gob.ar

Dashboard privado + scraper diario para seguir novedades de procesos de
compras y contrataciones en [comprar.gob.ar](https://comprar.gob.ar): consultas
nuevas, cambios de estado y vencimientos de plazos próximos.

## Cómo funciona

- **Dashboard** (Next.js + Supabase Auth): pantalla de "Novedades" y un
  ABM de "Expedientes" para decirle al sistema qué procesos seguir.
- **Scraper** (`scripts/scrape.ts`, Playwright): corre una vez por día **en
  tu PC** (no en GitHub Actions — ver por qué más abajo), se loguea en
  comprar.gob.ar, visita cada expediente activo, compara contra el último
  snapshot guardado y genera novedades cuando hay diferencias.
- **Supabase** (Postgres): guarda expedientes, snapshots históricos y
  novedades. El scraper escribe con la *service role key* (sin pasar por
  RLS); el dashboard lee/escribe como usuario autenticado.

```
Tu PC (Programador de Tareas, 1 vez por día)
        │  login + scrape
        ▼
   comprar.gob.ar  ──►  scripts/scrape.ts  ──►  Supabase (snapshots, novedades)
                                                    ▲
                                                    │ lee/marca leídas
                                              Dashboard Next.js (Vercel)
```

⚠️ **Por qué no corre en GitHub Actions**: el login de comprar.gob.ar pasa
por GDE (`cas.gde.gob.ar`), que tiene un desafío anti-bots de Cloudflare.
Las IPs de los runners de GitHub Actions (datacenter de Microsoft) quedan
bloqueadas ahí, aunque los selectores estén bien calibrados. Tu conexión
normal de casa/oficina no tiene ese problema, así que el scraper corre
desde tu propia PC con una tarea programada diaria.

## 1. Crear el proyecto en Supabase

1. Creá un proyecto nuevo en [supabase.com](https://supabase.com).
2. Andá a **SQL Editor** y ejecutá el contenido completo de
   [`supabase/schema.sql`](./supabase/schema.sql). Crea las tablas
   `expedientes`, `snapshots`, `novedades`, `scrape_runs` y sus políticas
   de RLS.
3. En **Authentication → Users**, creá un usuario (tu email) con
   contraseña: es el login del dashboard. No hay registro público, así
   que se crea a mano una única vez.
4. En **Project Settings → API** copiá:
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL` / `SUPABASE_URL`
   - `anon public key` → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role key` → `SUPABASE_SERVICE_ROLE_KEY` (¡secreta, nunca la
     pongas en el dashboard ni la commitees!)

## 2. Correr el dashboard localmente

```bash
cp .env.example .env.local
# completá NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY
npm install
npm run dev
```

Entrá a `http://localhost:3000`, logueate con el usuario que creaste en
Supabase Auth y agregá los expedientes que querés seguir (número, URL
directa al proceso en comprar.gob.ar, organismo opcional).

Para tenerlo accesible desde el celular todos los días, lo más simple es
deployarlo en [Vercel](https://vercel.com) (gratis para este uso) con las
mismas dos variables de entorno públicas.

## 3. Configurar el scraper en tu PC (Windows)

### 3.1. Instalar lo necesario (una sola vez)

1. Instalá [Node.js](https://nodejs.org) versión 22 o superior (bajá el
   instalador "LTS" o el que diga 22.x, para Windows).
2. Instalá [Git](https://git-scm.com/downloads) si no lo tenés.
3. Abrí una terminal (**PowerShell** o **Símbolo del sistema**) y cloná el
   repo:
   ```bash
   git clone https://github.com/grd1981/compras-comprar-monitor.git
   cd compras-comprar-monitor
   npm install
   npx playwright install chromium
   ```

### 3.2. Crear el archivo de variables (`.env.local`)

En la carpeta del proyecto, copiá `.env.example` a `.env.local` y
completalo con estos 6 valores. Son **3 credenciales distintas**, no
confundirlas: el CUIL se usa en la pantalla de Argentina.gob.ar, y el
usuario GDE + contraseña se usan después, en la pantalla propia de GDE.

```
SUPABASE_URL=https://xiglmxylurspjszytcgj.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<tu secret key de Supabase>
COMPRAR_USER=<tu CUIL/CUIT, sin guiones>
COMPRAR_GDE_USER=<tu usuario GDE, ej: dgrene>
COMPRAR_PASS=<tu contraseña de GDE>
AVISO_VENCIMIENTO_DIAS=3
```

⚠️ Este archivo queda **solo en tu PC** (`.gitignore` ya lo excluye, nunca
se sube a GitHub). Nadie más que vos lo ve.

Probalo a mano una vez:
```bash
npm run scrape -- --debug
```
Si termina sin errores, está listo. Si falla, mandame el `.txt`/`.png` que
se guarda en `scripts/debug/` como hicimos hasta ahora.

### 3.3. Programar que corra solo todos los días

1. Abrí **Programador de tareas** (buscalo en el menú de Windows).
2. **Crear tarea básica** → nombre: `Monitor de Compras`.
3. Desencadenador: **Diariamente**, elegí el horario (ej: 08:00, con tu PC
   prendida y conectada a internet a esa hora).
4. Acción: **Iniciar un programa**.
   - Programa/script: `npm.cmd`
   - Agregar argumentos: `run scrape`
   - Iniciar en: la ruta completa de la carpeta del proyecto (ej.
     `C:\Users\TuUsuario\compras-comprar-monitor`)
5. Finalizar. Podés hacer click derecho → **Ejecutar** para probarla ya
   mismo sin esperar al horario programado.

Si tu PC es Mac o Linux, el equivalente es un `cron` diario corriendo
`npm run scrape` desde la carpeta del proyecto (avisame y te paso los
pasos exactos para tu caso).

## 4. Calibrar los selectores del sitio (importante)

No tengo acceso a tu cuenta real de comprar.gob.ar, así que
[`scripts/comprar-adapter.ts`](./scripts/comprar-adapter.ts) — el único
archivo con lógica específica del sitio — arranca con selectores
"razonables" pero **probablemente no coincidan exactamente** con el HTML
real hasta que los ajustes una vez.

⚠️ **Login vía GDE**: comprar.gob.ar no tiene login propio — el link
"Ingresar" lleva a la pantalla de identidad de Argentina.gob.ar
(CUIL/CUIT/Pasaporte) y de ahí a `cas.gde.gob.ar` (GDE) para la
contraseña; al autenticar, vuelve a comprar.gob.ar ya logueado por SSO.
Si en las capturas de debug ves que pide **captcha o un segundo factor**
(SMS/TOTP) más allá del desafío de Cloudflare ya resuelto, avisame y lo
vemos con otro enfoque.

Cómo calibrarlo (ahora siempre en tu PC, por el bloqueo de Cloudflare a
GitHub Actions explicado arriba):

1. Corré `npm run scrape -- --debug` con `.env.local` cargado.
2. Si algún selector no encuentra nada, vas a ver en la carpeta
   `scripts/debug/` capturas de pantalla y el HTML de la página en
   ese momento (incluye una captura por cada paso del login, no solo al
   fallar, para ver rápido hasta dónde llegó).
3. Abrí esas capturas, inspeccioná el HTML real (clic derecho →
   Inspeccionar en el navegador) y ajustá los selectores en
   `comprar-adapter.ts` (`extraerEstado`, `extraerPlazoLimite`,
   `extraerConsultas`, y el formulario de login en `iniciarSesion`).
4. Repetí hasta que el dry-run extraiga bien estado, plazo y consultas de
   un expediente que conozcas.

Es la única parte del proyecto que necesita esta vuelta manual — el resto
(dashboard, base de datos, diffing, workflow) ya funciona end-to-end.

## 5. Uso del día a día

1. Agregás expedientes a seguir en `/expedientes` (pausar/eliminar cuando
   ya no te interesan).
2. Todos los días, a la hora que programaste en el Programador de Tareas
   de tu PC, corre el scraper solo (con la PC prendida y conectada).
3. Entrás al dashboard (desde cualquier lado, Vercel) y en `/` ves las
   novedades nuevas: consultas que
   entraron, cambios de estado, y avisos de vencimiento próximo
   (configurable con `AVISO_VENCIMIENTO_DIAS`, 3 días por defecto).
4. Marcás como leídas las que ya viste.

## Próximos pasos posibles (no incluidos todavía)

- Notificación por email/WhatsApp además del dashboard (hoy hay que
  entrar a mirar).
- Vista de historial completo por expediente (hoy solo se guarda en la
  tabla `snapshots`, no tiene pantalla propia).
- Soporte de 2FA/captcha en el login de comprar.gob.ar, si el sitio lo pide.
