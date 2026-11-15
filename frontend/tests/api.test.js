import { afterEach, test } from "node:test"
import assert from "node:assert/strict"
import {
  calculateQuote,
  getApiStatus,
  getRates,
  validateRequest,
  generateProposal,
  getCatalog,
  generateBudgetPdf,
} from "../lib/api.js"

const originalFetch = globalThis.fetch
const originalUrl = process.env.NEXT_PUBLIC_API_URL

const confirmadoPDF = {
  estado: "confirmado",
  solicitud: {
    cliente: "Empresa ficticia",
    descripcion: "Una web informativa.",
  },
  propuesta: {
    resumen: "Web ficticia.",
    dudas: [],
    necesidadesNoCubiertas: [],
  },
  serviciosSeleccionados: ["landing"],
  configuracion: {
    tipo: "landing",
    paginas: 1,
    formulario: false,
    segundoIdioma: false,
  },
  aclaraciones: [],
  presupuesto: { total: 1 },
}

test("solicita el PDF sin enviar importes y recibe el mismo archivo binario con nombre seguro", async () => {
  reply(null)
  const contenido = "%PDF-1.3\nArchivo ficticio de pruebas\n%%EOF"
  globalThis.fetch = async (url, options) => {
    assert.equal(url, "http://express.test/api/presupuesto/pdf")
    assert.equal(options.method, "POST")
    assert.equal(JSON.parse(options.body).presupuesto, undefined)
    assert.deepEqual(
      JSON.parse(options.body).configuracion,
      confirmadoPDF.configuracion
    )
    return new Response(contenido, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition":
          'inline; filename="presupuesto-webquote-empresa.pdf"',
      },
    })
  }
  const archivo = await generateBudgetPdf(confirmadoPDF)
  assert.equal(archivo.nombre, "presupuesto-webquote-empresa.pdf")
  assert.equal(await archivo.blob.text(), contenido)
})

test("gestiona errores de generación, respuestas que no son PDF y archivos truncados", async () => {
  reply({ error: "No se ha podido generar el PDF" }, 500)
  await assert.rejects(generateBudgetPdf(confirmadoPDF), {
    kind: "http",
    status: 500,
  })
  for (const [mime, body] of [
    ["text/html", "Error"],
    ["application/pdf", "no es PDF"],
    ["application/pdf", "%PDF-1.3 truncado"],
  ]) {
    globalThis.fetch = async () =>
      new Response(body, { headers: { "Content-Type": mime } })
    await assert.rejects(generateBudgetPdf(confirmadoPDF), { kind: "response" })
  }
})

test("descarta nombres de archivo inseguros proporcionados por el servidor", async () => {
  reply(null)
  globalThis.fetch = async () =>
    new Response("%PDF-1.3\n%%EOF", {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": 'inline; filename="../../secreto.pdf"',
      },
    })
  assert.equal(
    (await generateBudgetPdf(confirmadoPDF)).nombre,
    "presupuesto-webquote-cliente.pdf"
  )
})

const propuestaFicticia = {
  resumen: "Web informativa ficticia.",
  serviciosPropuestos: [
    { id: "landing", justificacion: "Una página para presentar el negocio." },
  ],
  dudas: [],
  necesidadesNoCubiertas: [],
}

test("envía la solicitud validada para proponer servicios sin calcular precios", async () => {
  const solicitud = {
    cliente: "Empresa ficticia",
    descripcion: "Una web informativa.",
  }
  reply(null)
  globalThis.fetch = async (url, options) => {
    assert.equal(url, "http://express.test/api/propuestas")
    assert.equal(options.method, "POST")
    assert.deepEqual(JSON.parse(options.body), solicitud)
    assert.equal(options.timeoutMs, undefined)
    return Response.json(propuestaFicticia)
  }
  assert.deepEqual(await generateProposal(solicitud), propuestaFicticia)
})

test("conserva los errores HTTP de IA para permitir reintentar", async () => {
  for (const status of [400, 429, 500, 502, 503, 504]) {
    reply({ error: "Error controlado de IA" }, status)
    await assert.rejects(generateProposal({}), {
      kind: "http",
      status,
      message: "Error controlado de IA",
    })
  }
})

test("rechaza propuestas incompletas del servidor", async () => {
  for (const data of [
    null,
    {},
    { ...propuestaFicticia, dudas: null },
    { ...propuestaFicticia, serviciosPropuestos: [null] },
  ]) {
    reply(data)
    await assert.rejects(generateProposal({}), { kind: "response" })
  }
})

test("permite cargar nombres desde el catálogo sin duplicarlos en el frontend", async () => {
  const catalogo = { servicios: [{ id: "landing", nombre: "Landing page" }] }
  reply(catalogo)
  assert.deepEqual(await getCatalog(), catalogo)
  reply({ servicios: "incorrecto" })
  await assert.rejects(getCatalog(), { kind: "response" })
})

test("informa de desconexión al generar una propuesta y permite cancelar", async () => {
  reply(null)
  globalThis.fetch = async () => {
    throw new TypeError("Failed to fetch")
  }
  await assert.rejects(generateProposal({}), { kind: "connection" })
  const controller = new AbortController()
  controller.abort()
  globalThis.fetch = async (_, { signal }) => signal.throwIfAborted()
  await assert.rejects(generateProposal({}, { signal: controller.signal }), {
    name: "AbortError",
  })
})

test("acota la espera de una propuesta a 60 segundos y comunica el timeout", async (context) => {
  context.mock.timers.enable({ apis: ["setTimeout"] })
  reply(null)
  globalThis.fetch = async (_, { signal }) =>
    new Promise((resolve, reject) => {
      signal.addEventListener(
        "abort",
        () => reject(new DOMException("Timeout", "AbortError")),
        { once: true }
      )
    })
  const pending = generateProposal({})
  context.mock.timers.tick(60000)
  await assert.rejects(pending, { kind: "timeout" })
})

test("envía la solicitud al endpoint de validación y devuelve los datos preparados", async () => {
  const solicitud = {
    cliente: "Empresa ficticia",
    descripcion: "Necesito una web informativa.",
  }
  reply(null)
  globalThis.fetch = async (url, options) => {
    assert.equal(url, "http://express.test/api/solicitudes/validar")
    assert.equal(options.method, "POST")
    assert.equal(options.headers["Content-Type"], "application/json")
    assert.deepEqual(JSON.parse(options.body), solicitud)
    return Response.json({ valida: true, solicitud })
  }
  assert.deepEqual(await validateRequest(solicitud), {
    valida: true,
    solicitud,
  })
})

test("conserva los errores de campo de Express", async () => {
  const errores = { cliente: "El nombre es obligatorio" }
  reply({ valida: false, error: "Revisa los datos", errores }, 400)
  await assert.rejects(validateRequest({}), (error) => {
    assert.equal(error.status, 400)
    assert.deepEqual(error.fields, errores)
    return true
  })
})

test("informa de fallo de conexión al validar la solicitud", async () => {
  reply(null)
  globalThis.fetch = async () => {
    throw new TypeError("Failed to fetch")
  }
  await assert.rejects(validateRequest({}), { kind: "connection" })
})

test("rechaza confirmaciones sin datos válidos", async () => {
  reply({
    valida: true,
    solicitud: { cliente: "", descripcion: "Proyecto ficticio" },
  })
  await assert.rejects(validateRequest({}), { kind: "response" })
})

afterEach(() => {
  globalThis.fetch = originalFetch
  if (originalUrl === undefined) delete process.env.NEXT_PUBLIC_API_URL
  else process.env.NEXT_PUBLIC_API_URL = originalUrl
})

function reply(data, status = 200) {
  process.env.NEXT_PUBLIC_API_URL = "http://express.test/"
  globalThis.fetch = async () => Response.json(data, { status })
}

test("envía JSON con los tipos originales y presenta el total del servidor sin recalcularlo", async () => {
  const values = {
    tipo: "landing",
    paginas: 2,
    formulario: true,
    segundoIdioma: false,
  }
  const result = {
    base: 1,
    paginasAdicionales: 2,
    formulario: 3,
    segundoIdioma: 0,
    total: 987,
    moneda: "EUR",
  }
  reply(result)
  globalThis.fetch = async (url, options) => {
    assert.equal(url, "http://express.test/api/presupuesto")
    assert.equal(options.method, "POST")
    assert.equal(options.headers["Content-Type"], "application/json")
    assert.deepEqual(JSON.parse(options.body), values)
    return Response.json(result)
  }
  assert.deepEqual(await calculateQuote(values), result)
})

test("conserva el mensaje y el código de un error HTTP 400", async () => {
  reply({ error: "El número de páginas debe ser un entero entre 1 y 20" }, 400)
  await assert.rejects(calculateQuote({}), {
    kind: "http",
    status: 400,
    message: "El número de páginas debe ser un entero entre 1 y 20",
  })
})

test("distingue una conexión fallida de una respuesta inesperada", async () => {
  reply({ status: "ok" })
  globalThis.fetch = async () => {
    throw new TypeError("Failed to fetch")
  }
  await assert.rejects(getApiStatus(), { kind: "connection" })
  reply({ status: "unknown" })
  await assert.rejects(getApiStatus(), { kind: "response" })
})

test("rechaza JSON inválido y errores HTTP sin JSON", async () => {
  reply(null)
  globalThis.fetch = async () => new Response("<html>Error</html>")
  await assert.rejects(getRates(), { kind: "response" })
  globalThis.fetch = async () => new Response("Unavailable", { status: 503 })
  await assert.rejects(getRates(), { kind: "http", status: 503 })
})

test("no sustituye tarifas ausentes ni acepta importes de tipo string", async () => {
  reply({
    landing: "300",
    corporativa: 600,
    paginaAdicional: 50,
    formulario: 80,
    segundoIdioma: 150,
  })
  await assert.rejects(getRates(), { kind: "response" })
  reply({ landing: 300 })
  await assert.rejects(getRates(), { kind: "response" })
})

test("acepta importes cero y rechaza presupuestos incompletos o de otra moneda", async () => {
  const result = {
    base: 300,
    paginasAdicionales: 0,
    formulario: 0,
    segundoIdioma: 0,
    total: 300,
    moneda: "EUR",
  }
  reply(result)
  assert.deepEqual(await calculateQuote({}), result)
  reply({ ...result, moneda: "USD" })
  await assert.rejects(calculateQuote({}), { kind: "response" })
  reply({ total: 300, moneda: "EUR" })
  await assert.rejects(calculateQuote({}), { kind: "response" })
})

test("la cancelación conserva AbortError y no se anuncia como desconexión", async () => {
  reply(null)
  globalThis.fetch = async (_, { signal }) => {
    signal.throwIfAborted()
  }
  const controller = new AbortController()
  controller.abort()
  await assert.rejects(getRates({ signal: controller.signal }), {
    name: "AbortError",
  })
})

test("informa cuando falta la URL sin hacer peticiones", async () => {
  delete process.env.NEXT_PUBLIC_API_URL
  globalThis.fetch = async () => assert.fail("No debe enviar la petición")
  await assert.rejects(getApiStatus(), { kind: "config" })
})
