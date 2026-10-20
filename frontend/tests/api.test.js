import { afterEach, test } from "node:test"
import assert from "node:assert/strict"
import { calculateQuote, getApiStatus, getRates } from "../lib/api.js"

const originalFetch = globalThis.fetch
const originalUrl = process.env.NEXT_PUBLIC_API_URL
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
