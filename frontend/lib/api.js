export class ApiError extends Error {
  constructor(message, kind, status) {
    super(message)
    this.name = "ApiError"
    this.kind = kind
    this.status = status
  }
}

async function request(path, { signal, ...options } = {}) {
  const baseUrl = process.env.NEXT_PUBLIC_API_URL?.trim().replace(/\/+$/, "")
  if (!baseUrl)
    throw new ApiError(
      "La conexión con la API no está configurada. Define NEXT_PUBLIC_API_URL y reinicia el frontend.",
      "config"
    )

  const controller = new AbortController()
  const abort = () => controller.abort()
  signal?.addEventListener("abort", abort, { once: true })
  if (signal?.aborted) controller.abort()
  const timeout = setTimeout(abort, 12000)
  try {
    let response
    try {
      response = await fetch(`${baseUrl}${path}`, {
        ...options,
        cache: "no-store",
        signal: controller.signal,
      })
    } catch (error) {
      if (signal?.aborted) throw error
      throw new ApiError(
        "No se puede establecer conexión con el servidor. Comprueba que Express esté disponible y vuelve a intentarlo.",
        "connection"
      )
    }
    let data
    try {
      data = await response.json()
    } catch {
      if (signal?.aborted)
        throw new DOMException("Solicitud cancelada", "AbortError")
      if (!response.ok)
        throw new ApiError(
          `El servidor ha respondido con un error HTTP ${response.status}. Vuelve a intentarlo.`,
          "http",
          response.status
        )
      throw new ApiError(
        "El servidor ha devuelto una respuesta inesperada. Se esperaba JSON válido.",
        "response"
      )
    }
    if (!response.ok)
      throw new ApiError(
        typeof data?.error === "string"
          ? data.error
          : `El servidor ha respondido con un error HTTP ${response.status}.`,
        "http",
        response.status
      )
    if (response.status !== 200)
      throw new ApiError(
        "El servidor ha devuelto una respuesta inesperada.",
        "response",
        response.status
      )
    return data
  } finally {
    clearTimeout(timeout)
    signal?.removeEventListener("abort", abort)
  }
}

const validAmounts = (data, keys) =>
  data &&
  keys.every(
    (key) =>
      typeof data[key] === "number" &&
      Number.isFinite(data[key]) &&
      data[key] >= 0
  )
const unexpected = () =>
  new ApiError(
    "El servidor ha devuelto datos inesperados. Vuelve a intentarlo.",
    "response"
  )

export async function getApiStatus(options) {
  const data = await request("/api/estado", options)
  if (data?.status !== "ok") throw unexpected()
  return data
}

export async function getRates(options) {
  const data = await request("/api/tarifas", options)
  if (
    !validAmounts(data, [
      "landing",
      "corporativa",
      "paginaAdicional",
      "formulario",
      "segundoIdioma",
    ])
  )
    throw unexpected()
  return data
}

export async function calculateQuote(values, options) {
  const data = await request("/api/presupuesto", {
    ...options,
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(values),
  })
  if (
    !validAmounts(data, [
      "base",
      "paginasAdicionales",
      "formulario",
      "segundoIdioma",
      "total",
    ]) ||
    data.moneda !== "EUR"
  )
    throw unexpected()
  return data
}
