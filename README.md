# Monitor de Compras — comprar.ar

Dashboard privado + scraper diario para seguir novedades de procesos de
compras y contrataciones en [comprar.ar](https://comprar.ar): consultas
nuevas, cambios de estado y vencimientos de plazos próximos.

## Cómo funciona

- **Dashboard** (Next.js + Supabase Auth): pantalla de "Novedades" y un
  ABM de "Expedientes" para decirle al sistema qué procesos seguir.
- **Scraper** (`scripts/scrape.ts`, Playwright): corre una vez por día vía
  GitHub Actions, se loguea en comprar.ar, visita cada expediente activo,
  compara contra el último snapshot guardado y genera novedades cuando
  hay diferencias.
- **Supabase** (Postgres): guarda expedientes, snapshots históricos y
  novedades. El scraper escribe con la *service role key* (sin pasar por
  RLS); el dashboard lee/escribe como usuario autenticado.

```
GitHub Actions (cron diario)
        │  login + scrape
        ▼
   comprar.ar  ──►  scripts/scrape.ts  ──►  Supabase (snapshots, novedades)
                                                    ▲
                                                    │ lee/marca leídas
                                              Dashboard Next.js (vos)
```

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
directa al proceso en comprar.ar, organismo opcional).

Para tenerlo accesible desde el celular todos los días, lo más simple es
deployarlo en [Vercel](https://vercel.com) (gratis para este uso) con las
mismas dos variables de entorno públicas.

## 3. Configurar el scraper (GitHub Actions)

En **Settings → Secrets and variables → Actions** de este repo, cargá
estos *secrets*:

| Secret | Valor |
|---|---|
| `SUPABASE_URL` | mismo que `NEXT_PUBLIC_SUPABASE_URL` |
| `SUPABASE_SERVICE_ROLE_KEY` | la *service role key* de Supabase |
| `COMPRAR_USER` | tu usuario de comprar.ar |
| `COMPRAR_PASS` | tu contraseña de comprar.ar |

El workflow [`scrape-daily.yml`](./.github/workflows/scrape-daily.yml) ya
está programado para correr todos los días a las 08:00 (hora Argentina).
También lo podés disparar a mano desde la pestaña **Actions** del repo
("Run workflow").

⚠️ Guardá `COMPRAR_PASS` **solo** como GitHub Secret. Nunca me la pases a
mí por chat ni la escribas en ningún archivo del repo — un secret de
GitHub Actions no es legible ni por vos una vez guardado, y el scraper
solo lo usa en memoria dentro de la corrida.

## 4. Calibrar los selectores del sitio (importante)

No tengo acceso a tu cuenta real de comprar.ar, así que
[`scripts/comprar-adapter.ts`](./scripts/comprar-adapter.ts) — el único
archivo con lógica específica del sitio — arranca con selectores
"razonables" pero **probablemente no coincidan exactamente** con el HTML
real hasta que los ajustes una vez.

⚠️ **Login vía GDE**: comprar.ar no tiene login propio — usa como
identidad **GDE** (Gestión Documental Electrónica). El scraper navega a
comprar.ar y deja que la redirección a GDE ocurra sola; el formulario que
completa con `COMPRAR_USER`/`COMPRAR_PASS` es el de GDE. Si en las
capturas de debug ves que GDE pide **captcha o un segundo factor**
(SMS/TOTP), la automatización completa de ese paso no va a funcionar tal
cual — avisame apenas lo veas y lo resolvemos con otro enfoque (por
ejemplo, reutilizar una sesión ya logueada en vez de loguear desde cero
en cada corrida).

Cómo calibrarlo:

1. Corré el workflow manualmente desde GitHub Actions con la opción
   **debug** en `true` (o localmente: `npm run scrape -- --debug` con las
   variables de `.env.example` cargadas en tu shell).
2. Si algún selector no encuentra nada, vas a ver un artifact/carpeta
   `scripts/debug/` con capturas de pantalla y el HTML de la página en
   ese momento.
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
2. Todos los días a las 08:00 corre el scraper solo.
3. Entrás al dashboard y en `/` ves las novedades nuevas: consultas que
   entraron, cambios de estado, y avisos de vencimiento próximo
   (configurable con `AVISO_VENCIMIENTO_DIAS`, 3 días por defecto).
4. Marcás como leídas las que ya viste.

## Próximos pasos posibles (no incluidos todavía)

- Notificación por email/WhatsApp además del dashboard (hoy hay que
  entrar a mirar).
- Vista de historial completo por expediente (hoy solo se guarda en la
  tabla `snapshots`, no tiene pantalla propia).
- Soporte de 2FA/captcha en el login de comprar.ar, si el sitio lo pide.
