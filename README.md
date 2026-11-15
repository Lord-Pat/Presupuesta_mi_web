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
| GET | `/api/catalogo` | Devuelve servicios y reglas del catálogo | `200 OK` |
| POST | `/api/solicitudes/validar` | Valida nombre y descripción | `200 OK` o `400 Bad Request` |
| POST | `/api/propuestas` | Analiza la solicitud con OpenAI y valida la propuesta | `200 OK` o error controlado |
| POST | `/api/presupuesto` | Valida y calcula un presupuesto | `200 OK` o `400 Bad Request` |
| POST | `/api/presupuesto/pdf` | Valida, recalcula y genera un PDF en memoria | `200 application/pdf` o error JSON |

### Propuestas con IA (punto 3)

Usa Node.js 22 o posterior (se ha comprobado con Node.js 24). Express carga
`backend/.env` y `backend/.env.local` con las herramientas nativas de Node.js,
independientemente del directorio desde el que arranque. Las variables del proceso
tienen prioridad; `.env.local` prevalece sobre `.env`.

Configura **solo en el backend** las variables indicadas en `backend/.env.example`:
`OPENAI_API_KEY` (clave privada) y `OPENAI_MODEL` (por defecto `gpt-4.1-mini`, compatible
con Structured Outputs). Si ya tienes `backend/.env.local`, conserva su configuración.
Nunca utilices `NEXT_PUBLIC_` para la clave. `.gitignore` excluye los archivos `.env*`,
salvo las plantillas `.env.example` sin secretos. Reinicia Express al cambiar el entorno.

En `/solicitud`, rellena el formulario y pulsa **Continuar**. Después puedes pulsar
**Generar propuesta con IA**. La IA devuelve sugerencias: la revisión y confirmación
corresponden al usuario mediante el wizard descrito en el punto 4. La IA no calcula
precios. Los datos y el resultado se conservan únicamente en el estado del frontend
mientras la vista permanezca montada.

`POST /api/propuestas` recibe el mismo objeto que la validación de solicitudes:

```json
{
  "cliente": "Empresa ficticia",
  "descripcion": "Necesito una web para presentar mi negocio."
}
```

El SDK oficial llama a la Responses API con un esquema JSON estricto. Las instrucciones
están separadas del texto del cliente y utilizan directamente el catálogo del backend.
El nombre del cliente no se envía a OpenAI. Se utiliza `store: false`, un timeout de
45 segundos, un límite de salida y cero reintentos automáticos.

El servidor valida estructura, textos, IDs del catálogo, duplicados y selección de una
única base. Una propuesta sin servicios debe incluir dudas o necesidades no cubiertas.
También rechaza propiedades adicionales e importes, fechas y plazos explícitos detectados
en los textos. Las instrucciones prohíben inventar capacidades y distinguen un formulario
de solicitudes de reserva de un sistema de reservas automáticas.

Ejemplo de respuesta ficticia:

```json
{
  "resumen": "Web informativa para presentar un negocio.",
  "serviciosPropuestos": [
    { "id": "corporativa", "justificacion": "Permite presentar el negocio y sus servicios." }
  ],
  "dudas": ["¿Cuántas páginas independientes necesita?"],
  "necesidadesNoCubiertas": []
}
```

Los errores devuelven `{ "error": "Mensaje comprensible", "codigo": "CODIGO" }`;
los errores de entrada también incluyen `errores` por campo. Se usan HTTP 400 para
entrada inválida, 429 para límite o cuota, 502 para credenciales/configuración del
proveedor o respuesta inválida, 503 para clave ausente o conexión no disponible,
504 para timeout y 500 para fallos inesperados. No se reenvían errores internos del SDK.
El usuario puede reintentar manualmente; los datos del formulario se mantienen.

Ejecuta `npm test` desde `backend` y desde `frontend`. Las pruebas automatizadas usan
respuestas simuladas y un transporte ficticio del SDK: **no consumen créditos**.
Cubren los casos A–F del enunciado, errores del proveedor, respuestas inválidas,
IDs desconocidos, bases incompatibles y regresiones de las funciones anteriores.

Referencias: [Structured Outputs](https://developers.openai.com/api/docs/guides/structured-outputs?api-mode=responses)
y [modelo por defecto](https://developers.openai.com/api/docs/models/gpt-4.1-mini).

### Revisión y confirmación guiada (punto 4)

Tras generar una propuesta, pulsa **Iniciar revisión guiada**. El wizard mantiene
su propio paso y sus validaciones, independientemente del tour Onborda:

1. Revisar el cliente, resumen, recomendaciones, justificaciones y necesidades no cubiertas.
2. Elegir servicios del catálogo. Los interruptores añaden o eliminan servicios;
   cambiar de base sustituye la anterior conservando los complementos y cantidades.
   Quitar la base elimina sus complementos; puedes volver a elegirlos sin perder
   las cantidades y aclaraciones escritas. Sin base no se puede avanzar al cálculo.
3. Configurar páginas y aclaraciones. Sin páginas adicionales, la selección incluye
   únicamente la primera página de la base. Al activar páginas adicionales, se exige
   el total entre 2 y 20, sin asignar automáticamente una cantidad. Las respuestas a
   dudas son opcionales y no sustituyen las cantidades ni las opciones seleccionadas.
4. Calcular con `POST /api/presupuesto`. Se envían exclusivamente `tipo`, `paginas`,
   `formulario` y `segundoIdioma`. Se muestra el desglose y total que devuelve Express.
5. Revisar y confirmar. La confirmación consulta otra vez a Express; si los importes
   han cambiado, exige revisar el nuevo desglose y confirmar de nuevo.

Cualquier cambio de servicios o páginas invalida el cálculo y la confirmación.
Las respuestas de cálculos anteriores se descartan mediante una revisión de estado.
Retroceder o volver a la solicitud conserva el wizard mientras no se cambie o regenere
la solicitud/propuesta. No se usa almacenamiento permanente.

Onborda utiliza `OnbordaProvider`, `Onborda`, `useOnborda` y tarjetas shadcn/ui propias.
Su spotlight destaca el título del paso activo. La tarjeta de ayuda ocupa espacio en
la página y la capa visual no intercepta clics en los formularios. Se puede cerrar con
**Cerrar guía**, **Ocultar ayuda** o Escape, y abrir de nuevo con **Mostrar guía**.
Sus botones llaman a las mismas validaciones del wizard; no permiten saltárselas.
Tailwind CSS 4 escanea los estilos del paquete mediante `@source`. Las versiones
instaladas satisfacen los peer dependencies de Next.js 16 y React 19.

`usePresupuestoWizard` separa la solicitud, propuesta, selección, configuración,
aclaraciones, cálculo de Express, confirmación y paso. Al confirmar, se entrega a
`useSolicitud.presupuestoConfirmado` una copia de esos datos: incluye IDs seleccionados,
configuración, aclaraciones, dudas pendientes, necesidades fuera del catálogo y
desglose económico. Este snapshot se utiliza para generar el PDF del punto 5.

Las pruebas de estado están en `frontend/tests/presupuesto-wizard.test.js`. Las suites
anteriores siguen ejecutándose con `npm test` en cada aplicación. La comprobación en
Chromium utiliza una propuesta ficticia sin llamar a OpenAI y cálculos del Express real,
incluido un fallo simulado, cambios de selección, recálculo y confirmación final.

Referencia: [documentación de Onborda](https://www.onborda.dev/docs).

### Generación, revisión y descarga PDF (punto 5)

Después de confirmar, el wizard permite avanzar a un sexto paso: **Revisar y
descargar presupuesto**. La ayuda Onborda continúa sin reiniciar las etapas anteriores.

1. Pulsa **Generar vista previa PDF**. Express valida el snapshot confirmado y vuelve
   a calcular los importes utilizando `presupuesto_service.js`.
2. Revisa el PDF real en el visor integrado, o ábrelo en otra pestaña si el navegador
   no admite un visor PDF incrustado. Puedes cerrar y reabrir la vista previa.
3. Pulsa **Aprobar documento** para confirmar explícitamente que lo has revisado.
4. **Descargar presupuesto PDF** utiliza el mismo Blob de la vista previa, sin una
   nueva solicitud ni una segunda generación. La descarga repetida reutiliza el archivo.
   También se ofrece impresión, con alternativa mediante el visor del navegador.

La generación utiliza únicamente **PDFKit** en el backend, con formato A4, cabeceras
WebQuote, fecha de Madrid, identificador UUID, tabla de partidas y total en EUR.
Los servicios y descripciones proceden del catálogo. Las partidas y el total proceden
del cálculo centralizado, no de los importes enviados por el cliente. No se calculan
impuestos ni se inventan datos fiscales, plazos o condiciones comerciales.

El PDF incluye el resumen existente, detalle de la solicitud, dudas, respuestas y
necesidades no cubiertas claramente separadas del alcance presupuestado. Los textos
extensos tienen saltos de página, cabeceras repetidas y numeración. Se utilizan las
fuentes estándar Helvetica, compatibles con español y euros; los símbolos que esas
fuentes no representan se sustituyen por `?` para evitar texto PDF inválido.

`POST /api/presupuesto/pdf` recibe los campos `estado: "confirmado"`, `solicitud`,
`propuesta` (resumen, dudas y necesidades), `serviciosSeleccionados`, `configuracion`
y `aclaraciones`. El servidor verifica límites de texto, IDs conocidos y únicos,
una única base y correspondencia entre la selección y las cantidades/opciones.
Los importes recibidos se ignoran. La aprobación del documento es una acción local
explícita; el marcador de confirmación no sustituye la validación del servidor.

La respuesta correcta es binaria, con `Content-Type: application/pdf`, nombre seguro
en `Content-Disposition`, `Cache-Control: no-store` y `nosniff`. Los errores usan JSON
y HTTP 400 para datos inválidos, 413 para tamaño excesivo y 500 para fallos de generación,
sin exponer errores internos. El frontend comprueba MIME, cabecera y final del archivo.

Modificar servicios, páginas o aclaraciones invalida la confirmación y cierra la
etapa PDF. Al salir de esa etapa se abortan peticiones pendientes y se revocan las
URLs temporales, impidiendo descargar el documento anterior. Una nueva confirmación
requiere una nueva vista previa y una nueva aprobación. No se usa base de datos ni
almacenamiento permanente de documentos o datos de clientes.

Para Vercel, despliega el backend como aplicación Express con raíz `backend/` y el
frontend con raíz `frontend/`. La aplicación exporta Express desde `server.js`; el PDF
se genera en memoria, sin escrituras en disco ni navegador instalado en el servidor.
`backend/vercel.json` incluye los recursos tipográficos de PDFKit en el empaquetado.
Configura `FRONTEND_ORIGIN` en Express con el origen de tu frontend desplegado
(admite varios separados por comas), y `NEXT_PUBLIC_API_URL` en Next.js con la URL del
backend. El valor local por defecto sigue siendo `http://localhost:3000` para CORS.
No se ha publicado un despliegue durante esta implementación.

Las pruebas PDF automatizadas están en `backend/tests/pdf.test.js`; cubren landing,
extras, servicios eliminados, dudas pendientes, textos multipágina, validación,
totales manipulados, errores y nombres de descarga. `frontend/tests/api.test.js`
también cubre la respuesta binaria, archivos truncados y errores del endpoint.
La QA en Chromium completo verificó visualmente el PDF nativo, comparó por SHA-256
la vista previa con la descarga, comprobó descargas repetidas e invalidación al editar.
Las herramientas de inspección PDF utilizadas para QA están fuera del repositorio
y no añaden otra librería PDF a las dependencias de la aplicación.

Referencias: [PDFKit](https://pdfkit.org/docs/getting_started.html)
y [Express en Vercel](https://vercel.com/docs/frameworks/backend/express).

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
