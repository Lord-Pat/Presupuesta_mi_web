# WebQuote — Presupuesta mi web

Aplicación para calcular presupuestos de proyectos web. Incluye un **frontend en Next.js y shadcn/ui** y una **API REST independiente en Node.js y Express**. La API valida los datos recibidos, aplica las tarifas definidas en el servidor y devuelve el presupuesto desglosado en euros.

## Tecnologías

| Parte | Tecnologías |
|---|---|
| Frontend | Next.js (App Router), React, JavaScript, shadcn/ui, Tailwind CSS |
| Backend | Node.js, Express, JavaScript, CORS |
| Pruebas | Postman; pruebas automatizadas con `node:test`; Playwright/Chromium para la integración |

Los presupuestos **no se guardan en una base de datos**. El frontend no calcula precios: todos los importes proceden de la API.

## Estructura del proyecto

```text
WebQuote/
├── frontend/                 # Dashboard de Next.js
│   ├── app/
│   ├── components/
│   ├── hooks/
│   ├── lib/
│   ├── .env.example
│   ├── package.json
│   └── package-lock.json
├── backend/                  # API REST de Express
│   ├── src/
│   │   ├── config/tarifas.js
│   │   ├── services/presupuesto.service.js
│   │   └── validators/presupuesto.validator.js
│   ├── server.js
│   ├── package.json
│   └── package-lock.json
├── .gitignore
└── README.md
```

## Instalación y ejecución

**Requisitos:** Node.js y npm instalados. Deben utilizarse **dos terminales**, una para el backend y otra para el frontend. Ejecuta los comandos desde la raíz del repositorio.

### 1. Iniciar la API (puerto 3001)

```bash
cd backend
npm install
node server.js
```

La API quedará disponible en `http://localhost:3001`. Puedes comprobar su funcionamiento en `http://localhost:3001/api/estado`, que debe responder `{"status":"ok"}`.

### 2. Configurar e iniciar el frontend (puerto 3000)

Abre una **segunda terminal**:

```bash
cd frontend
npm install
```

Copia `frontend/.env.example` a `frontend/.env.local` si este último no existe, y configura:

```dotenv
NEXT_PUBLIC_API_URL=http://localhost:3001
```

Después, desde `frontend`:

```bash
npm run dev
```

Abre `http://localhost:3000` en el navegador. **Deja ambas terminales abiertas.** El backend permite mediante CORS las peticiones desde `http://localhost:3000`. Si Next.js arranca en otro puerto, tendrás que adaptar el origen permitido en la configuración CORS de Express.

Si modificas una variable `NEXT_PUBLIC_`, reinicia el servidor de desarrollo; para una compilación de producción deberás volver a compilar.

Opcionalmente, para ejecutar el frontend en modo producción local, desde `frontend`:

```bash
npm run build
npm start
```

Express debe seguir arrancado por separado.

## API REST

### Rutas

| Método | Ruta | Descripción | Respuesta esperada |
|---|---|---|---|
| GET | `/api/estado` | Comprueba si el servicio funciona | `200 OK` |
| GET | `/api/tarifas` | Devuelve las tarifas del servidor | `200 OK` |
| POST | `/api/presupuesto` | Valida y calcula un presupuesto | `200 OK` o `400 Bad Request` |

### Tarifas del servidor

| Concepto | Precio |
|---|---:|
| Landing (primera página incluida) | 300 € |
| Web corporativa (primera página incluida) | 600 € |
| Cada página adicional | 50 € |
| Formulario de contacto | 80 € |
| Segundo idioma | 150 € |

No se aplican impuestos, descuentos ni conceptos adicionales.

### Ejemplo de solicitud POST

**URL:** `http://localhost:3001/api/presupuesto`  
**Cabecera:** `Content-Type: application/json`

```json
{
  "tipo": "corporativa",
  "paginas": 4,
  "formulario": true,
  "segundoIdioma": false
}
```

**Respuesta — HTTP 200:**

```json
{
  "base": 600,
  "paginasAdicionales": 150,
  "formulario": 80,
  "segundoIdioma": 0,
  "total": 830,
  "moneda": "EUR"
}
```

Cálculo: **600 €** de base + **3 × 50 €** por páginas adicionales + **80 €** de formulario + **0 €** de segundo idioma = **830 €**.

### Validaciones

Antes de calcular, el backend comprueba lo siguiente:

- El cuerpo es un objeto JSON y contiene los cuatro campos obligatorios.
- `tipo` solo acepta `"landing"` o `"corporativa"`.
- `paginas` es un **entero** entre 1 y 20; `"4"` y `2.5` no son válidos.
- `formulario` y `segundoIdioma` son **booleanos**; `"false"` no es válido.
- Las propiedades adicionales no alteran las tarifas ni fuerzan el importe total.

Si los datos son incorrectos, el servidor devuelve **HTTP 400** con un mensaje de error y no calcula el presupuesto. El backend también responde con un error JSON para cuerpos JSON mal formados.

## Pruebas de funcionamiento de la API

Las pruebas se han realizado en **Postman**, verificando las rutas, los códigos HTTP, las validaciones y los cálculos. Los resultados de la tabla corresponden a las comprobaciones realizadas durante el desarrollo.

### 1. Endpoints GET

| Método | Endpoint | Resultado esperado | Resultado obtenido |
|---|---|---|---|
| GET | `/api/estado` | HTTP 200 · `{"status":"ok"}` | Correcto · HTTP 200 |
| GET | `/api/tarifas` | HTTP 200 · tarifas oficiales | Correcto · HTTP 200 |

### 2. Casos de prueba del endpoint POST

**Configuración común:** método `POST`, URL `http://localhost:3001/api/presupuesto`, cabecera `Content-Type: application/json` y cuerpo **raw JSON**.

| Caso | Solicitud enviada (JSON) | Resultado esperado | Resultado obtenido |
|---|---|---|---|
| 1 | `{"tipo":"landing","paginas":1,"formulario":false,"segundoIdioma":false}` | 200 · 300 € | 200 · 300 € |
| 2 | `{"tipo":"corporativa","paginas":4,"formulario":true,"segundoIdioma":false}` | 200 · 830 € | 200 · 830 € |
| 3 | `{"tipo":"landing","paginas":2,"formulario":true,"segundoIdioma":true}` | 200 · 580 € | 200 · 580 € |
| 4 | `{"tipo":"landing","paginas":20,"formulario":false,"segundoIdioma":false}` | 200 · 1.250 € | 200 · 1.250 € |
| 5 | `{"tipo":"corporativa","paginas":0,"formulario":true,"segundoIdioma":false}` | 400 Bad Request | 400 Bad Request |
| 6 | `{"tipo":"corporativa","paginas":21,"formulario":true,"segundoIdioma":false}` | 400 Bad Request | 400 Bad Request |
| 7 | `{"tipo":"corporativa","paginas":2.5,"formulario":true,"segundoIdioma":false}` | 400 Bad Request | 400 Bad Request |
| 8 | `{"tipo":"tienda","paginas":4,"formulario":true,"segundoIdioma":false}` | 400 Bad Request | 400 Bad Request |
| 9 | `{"tipo":"corporativa","paginas":4,"formulario":"false","segundoIdioma":false}` | 400 Bad Request | 400 Bad Request |

En los casos inválidos, los demás campos se mantienen correctos para aislar cada validación. Los errores se devuelven con mensajes explicativos.

### 3. Desglose del caso 2

| Concepto | Importe |
|---|---:|
| Web corporativa | 600 € |
| Tres páginas adicionales | 150 € |
| Formulario de contacto | 80 € |
| Segundo idioma | 0 € |
| **Total** | **830 €** |

**Resultado:** los nueve casos de prueba se han superado correctamente.

## Integración del frontend con Express

El dashboard conserva el diseño original. Las páginas de Next.js utilizan componentes de servidor cuando es posible, y los controles interactivos se implementan como componentes cliente. El navegador llama directamente a la API REST de Express; **no se han creado endpoints sustitutos en Next.js**.

### Organización de la integración

- `frontend/lib/api.js`: llamadas con `fetch`, URL centralizada, gestión de JSON, errores HTTP, fallo de conexión, respuestas inesperadas y cancelación. Las solicitudes tienen un tiempo máximo de espera de 12 segundos.
- `frontend/lib/format.js`: presentación de euros mediante `Intl.NumberFormat` con configuración española.
- `frontend/hooks/use-api-resource.js`: carga de estado y tarifas, con reintentos manuales y sin consultas periódicas.
- `frontend/hooks/use-quote.js`: datos del formulario, conversión de páginas a entero, envío de los cuatro campos, errores y resultado. Cancela solicitudes obsoletas y evita envíos duplicados.
- `frontend/components/quote-workspace.jsx`, `quote-form.jsx` y `quote-summary.jsx`: formulario y desglose reutilizados en Dashboard y Presupuestos.
- `frontend/components/dashboard-cards.jsx`, `rates-table.jsx` y `api-status.jsx`: visualización de tarifas y estado reales, con indicadores de carga y reintentos.
- `frontend/components/request-feedback.jsx` y `frontend/components/ui/alert.jsx`: mensajes de carga y errores.
- `frontend/jsconfig.json`: alias `@/` relativo a `frontend`.

El frontend **no calcula precios ni utiliza tarifas de respaldo**. Muestra únicamente los importes recibidos de Express. Al cambiar los campos, limpia el presupuesto anterior. No hay historial ni persistencia.

### Pruebas automatizadas del frontend

Desde `frontend`, se han utilizado los siguientes comandos:

```bash
npm test
npm run lint
npm run build
```

Se han ejecutado **8 pruebas automatizadas** del módulo HTTP mediante `node:test`, con respuestas controladas para comprobar: contrato JSON, tipos de datos, errores 400, fallos de conexión, respuestas inesperadas, datos incompletos, cancelación y ausencia de configuración. Estas pruebas no requieren Express.

### Pruebas de integración con navegador

Según las comprobaciones realizadas con Playwright/Chromium y el backend real:

| Prueba | Resultado observado |
|---|---|
| Estado real y comprobación manual | Estado conectado y nueva petición al pulsar el botón |
| Tabla y tarjetas de precios | Tarifas obtenidas de Express |
| Landing, 1 página, sin extras | 300 € |
| Corporativa, 4 páginas, con formulario | 830 € |
| Landing, 2 páginas, ambos extras | 580 € |
| Landing, 20 páginas, sin extras | 1.250 € |
| Formulario en Dashboard y Presupuestos | POST con entero y booleanos reales; muestra el resultado del servidor |
| Error 400 real | Mensaje del backend visible y posibilidad de corregir y reintentar |
| Solicitud en curso | Botón deshabilitado, indicador de carga y un único envío |
| Edición durante o después del cálculo | Se descarta el resultado anterior y la solicitud pendiente |
| Express detenido y reiniciado | Desconexión visible y recuperación mediante reintento, conservando los campos |
| Navegación responsive | Cuatro páginas y menú móvil, sin desbordamiento a 1440 px y 390 px |
| Consola | Sin errores inesperados de JavaScript durante las comprobaciones |

Para comprobar el error 400 en la interfaz se alteró únicamente la solicitud de prueba a `paginas: 0`; el mensaje procedió del validador real de Express. Además se simularon mediante respuestas controladas un estado inesperado y un HTTP 503 en tarifas. Estos últimos **no fueron respuestas reales del backend**. No se han comprobado otros navegadores.

## Conclusión

La API valida las entradas antes de calcular, mantiene las tarifas bajo control del servidor, devuelve los desgloses exigidos y permite reproducir los casos de prueba. El frontend Next.js consume esta API para mostrar los precios, comprobar el estado del servicio y calcular presupuestos sin duplicar la lógica de negocio.
