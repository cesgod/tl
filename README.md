# Taís Löwe · Nutricionista — sitio web

Landing page, portal de planes alimentarios y panel de administración, con la identidad del *Manual de Marca v1.0* (Verde Bosque, Dorado, Cormorant Garamond + Jost, arcos y círculos).

## Cómo correrlo

Requiere Node.js 18 o superior. No usa dependencias externas.

```bash
npm start
```

| Página | URL |
|---|---|
| Landing | http://localhost:3000/ |
| Portal de planes | http://localhost:3000/portal |
| Panel de administración | http://localhost:3000/admin |

## Configuración — `config.json`

- `adminPassword`: solo para uso local. Online se usa la variable de entorno `ADMIN_PASSWORD`, así la contraseña nunca queda en GitHub.
- `brand`: WhatsApp, email, Instagram, dirección, matrícula y horarios. Se muestran en la landing y en el pie del plan descargable. Los botones de WhatsApp usan el número de `whatsapp`.
- Puerto: `port` o la variable `PORT`.

## Cómo funciona el portal

1. La persona completa 6 pasos: objetivo, datos (sexo, edad, peso, altura y cintura opcional), movimiento (ocupación, pasos, entrenamientos con días, minutos e intensidad, sueño y estrés), preferencias (tipo de dieta, alergias, alimentos que no le gustan o que prefiere, cantidad de comidas, tiempo para cocinar), salud y contacto.
2. **El servidor** hace todo el cálculo y guarda el plan completo. A la persona **solo se le devuelve un código** (por ejemplo `TL-0007`). No ve calorías, macros ni el menú.
3. Para recibir el plan tiene que contactar: puede escribir por WhatsApp con el código ya cargado en el mensaje o pedir que la contacten. La solicitud queda registrada en el panel.

### Cálculos (`lib/engine.js`)

- Metabolismo basal: Mifflin-St Jeor. Si hay cintura, se promedia con Katch-McArdle usando el % de grasa estimado (RFM).
- Actividad diaria: factor según ocupación más un ajuste por pasos.
- Ejercicio: MET netos por tipo e intensidad × peso × duración × días, promediado por día.
- Objetivo: déficit o superávit según objetivo y ritmo, con pisos mínimos de seguridad. Si hay embarazo, enfermedad renal, antecedentes de TCA o la persona es menor de 18 años, se anula el déficit.
- Macros: proteína en g/kg según objetivo (con peso ajustado si el IMC es mayor a 30), grasas entre 28 y 32 % con un mínimo por kg, y el resto en hidratos.
- También calcula agua, fibra, cambio estimado por semana y semanas hasta el peso objetivo.
- Plan de 7 días: porciones calculadas para cada comida que respetan dieta, alergias y alimentos rechazados, priorizan favoritos y van rotando. Incluye lista de compras semanal, recomendaciones y alertas clínicas.

## Panel de administración

- Indicadores: planes creados, pedidos de contacto, nuevos, en seguimiento y entregados.
- Gráficos de planes por día (últimos 30 días) y por objetivo.
- Tabla con búsqueda y filtros, y estado editable por plan.
- Detalle de cada plan: cálculo completo, alertas, contacto, notas privadas, WhatsApp directo y opción para eliminar.
- **Descargar plan**: documento HTML con la marca, listo para imprimir o guardar como PDF.
- **Exportar CSV** con todos los planes.

Los datos se guardan en `data/plans.json`. Hacé copias de seguridad de ese archivo.

## Publicar en internet

GitHub guarda el código, pero **no puede ejecutarlo**: GitHub Pages solo sirve páginas estáticas, y el portal y el panel necesitan un servidor Node.js. El repositorio está listo para conectarse a un hosting.

### Opción A — Render (recomendada para empezar, gratis)

1. Subí este proyecto a un repositorio de GitHub (puede ser privado).
2. En [render.com](https://render.com) entrá con tu cuenta de GitHub → **New → Blueprint** → elegí el repositorio.
3. Render lee `render.yaml` y crea el servicio solo. En unos minutos te da una URL como `https://tais-lowe.onrender.com`.
4. La contraseña del panel se genera automáticamente: **Dashboard → tais-lowe → Environment → `ADMIN_PASSWORD`**. Podés cambiarla ahí.
5. Cada `git push` a `main` vuelve a publicar el sitio.

> **Plan gratuito:** el servicio se duerme después de 15 minutos sin visitas (la primera carga tarda unos 30 segundos) y **los planes guardados se borran al reiniciar**. Sirve para probar. Para uso real, pasá al plan *Starter* y activá el disco persistente (instrucciones en `render.yaml`).

**Dominio propio:** en Render → *Settings → Custom Domains* agregá `taislowe.com` (o el que tengas) y creá en tu proveedor de dominio el registro DNS que te indica (CNAME para `www`, A o ALIAS para el dominio raíz). El certificado HTTPS es automático.

### Opción B — Railway, Fly.io o un VPS con Docker

El `Dockerfile` incluido funciona en cualquier hosting con Docker. Montá un volumen persistente en `/data` y definí `ADMIN_PASSWORD`.

```bash
docker build -t tais-lowe .
```

```bash
docker run -d -p 3000:3000 -v tais-data:/data -e ADMIN_PASSWORD=una-clave-segura tais-lowe
```

En un VPS, poné delante [Caddy](https://caddyserver.com) para tener HTTPS automático con tu dominio.

### Variables de entorno

| Variable | Para qué sirve |
|---|---|
| `ADMIN_PASSWORD` | Contraseña del panel. En producción es obligatoria: no se acepta la de ejemplo. |
| `DATA_DIR` | Carpeta donde se guarda `plans.json`. Apuntala a un disco persistente. |
| `TRUST_PROXY=1` | Necesaria detrás de un hosting o proxy: toma la IP real del visitante y marca la cookie como segura. |
| `NODE_ENV=production` | Activa los controles de producción. |
| `PORT` | Puerto (los hostings lo definen solos). |

## Antes de lanzar oficialmente

- Completar los datos de `brand` en `config.json` (WhatsApp, email, Instagram, dirección, matrícula).
- Usar un disco persistente y hacer copias de `plans.json`, porque contiene datos personales y de salud.
- Los valores nutricionales son aproximados y el plan es orientativo. Taís lo revisa antes de entregarlo.
