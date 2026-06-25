# Enlace — Guía de despliegue

Sigue estos pasos una sola vez. Después cualquier persona podrá usar Enlace desde su celular o computador sin instalar nada.

---

## Paso 1 — Crea una cuenta en GitHub

Ve a https://github.com y crea una cuenta gratuita si no tienes una.

---

## Paso 2 — Sube el proyecto a GitHub

1. En GitHub, haz clic en el botón verde **New** para crear un repositorio nuevo.
2. Nómbralo `enlace`.
3. Déjalo en **Public** y haz clic en **Create repository**.
4. En la página del repositorio recién creado, haz clic en **uploading an existing file**.
5. Arrastra y suelta todos los archivos y carpetas de este ZIP.
6. Haz clic en **Commit changes**.

---

## Paso 3 — Crea una cuenta en Vercel

Ve a https://vercel.com y haz clic en **Sign up**.
Elige **Continue with GitHub** para conectar ambas cuentas.

---

## Paso 4 — Despliega el proyecto

1. En Vercel, haz clic en **Add New Project**.
2. Busca el repositorio `enlace` y haz clic en **Import**.
3. No cambies ninguna configuración. Haz clic en **Deploy**.
4. Espera unos segundos. Vercel te dará una URL como `enlace.vercel.app`.

---

## Paso 5 — Agrega tu API Key de Anthropic

Este es el único paso técnico. Sin esto el chat no responde.

1. En Vercel, entra a tu proyecto y ve a **Settings → Environment Variables**.
2. Haz clic en **Add**.
3. En **Name** escribe exactamente: `ANTHROPIC_API_KEY`
4. En **Value** pega tu API key (empieza con `sk-ant-...`).
   Puedes obtenerla en https://console.anthropic.com/settings/keys
5. Haz clic en **Save**.
6. Ve a **Deployments**, haz clic en los tres puntos del último deploy y elige **Redeploy**.

---

## Listo

Tu app estará disponible en la URL que Vercel te dio.
Cualquier persona puede abrirla desde su celular y verá el botón **Agregar a pantalla de inicio** para instalarla como app nativa.

---

## Si necesitas actualizar algo

Sube los archivos modificados a GitHub (mismo proceso del Paso 2) y Vercel actualizará la app automáticamente en menos de un minuto.
