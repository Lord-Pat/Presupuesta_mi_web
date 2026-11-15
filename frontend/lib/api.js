export class ApiError extends Error {
  constructor(message, kind, status) {
    super(message)
    this.name = "ApiError"
    this.kind = kind
    this.status = status
  }
}

async function request(
  path,
  { signal, timeoutMs = 12000, responseType = "json", ...options } = {}
) {
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
  let timedOut = false
  const timeout = setTimeout(() => {
    timedOut = true
    abort()
  }, timeoutMs)
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
      if (timedOut)
        throw new ApiError(
          "El servidor ha tardado demasiado en responder. Vuelve a intentarlo.",
          "timeout"
        )
      throw new ApiError(
        "No se puede establecer conexión con el servidor. Comprueba que Express esté disponible y vuelve a intentarlo.",
        "connection"
      )
    }
    if (response.ok && responseType === "pdf") {
      if (
        response.status !== 200 ||
        !response.headers
          .get("content-type")
          ?.toLowerCase()
          .startsWith("application/pdf")
      )
        throw new ApiError(
          "El servidor no ha devuelto un PDF válido. Vuelve a intentarlo.",
          "response"
        )
      let blob
      try {
        blob = await response.blob()
        if (
          (await blob.slice(0, 5).text()) !== "%PDF-" ||
          !(await blob.slice(-16).text()).includes("%%EOF")
        )
          throw new Error("PDF inválido")
      } catch (error) {
        if (signal?.aborted) throw error
        throw new ApiError(
          timedOut
            ? "El PDF ha tardado demasiado en generarse. Vuelve a intentarlo."
            : "No se ha podido cargar el archivo PDF. Vuelve a intentarlo.",
          timedOut ? "timeout" : "response"
        )
      }
      const sugerido = response.headers
        .get("content-disposition")
        ?.match(/filename="([^"]+)"/)?.[1]
      return {
        blob,
        nombre: /^presupuesto-webquote-[a-z0-9-]+\.pdf$/.test(sugerido ?? "")
          ? sugerido
          : "presupuesto-webquote-cliente.pdf",
      }
    }
    let data
    try {
      data = await response.json()
    } catch {
      if (signal?.aborted)
        throw new DOMException("Solicitud cancelada", "AbortError")
      if (timedOut)
        throw new ApiError(
          "El servidor ha tardado demasiado en responder. Vuelve a intentarlo.",
          "timeout"
        )
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
    if (!response.ok) {
      const error = new ApiError(
        typeof data?.error === "string"
          ? data.error
          : `El servidor ha respondido con un error HTTP ${response.status}.`,
        "http",
        response.status
      )
      if (data?.errores && typeof data.errores === "object")
        error.fields = data.errores
      throw error
    }
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

export async function validateRequest(values, options) {
  const data = await request("/api/solicitudes/validar", {
    ...options,
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(values),
  })
  if (
    data?.valida !== true ||
    typeof data.solicitud?.cliente !== "string" ||
    !data.solicitud.cliente.trim() ||
    data.solicitud.cliente.length > 120 ||
    typeof data.solicitud?.descripcion !== "string" ||
    !data.solicitud.descripcion.trim() ||
    data.solicitud.descripcion.length > 2000
  )
    throw unexpected()
  return data
}

export async function getCatalog(options) {
  const data = await request("/api/catalogo", options)
  if (
    !Array.isArray(data?.servicios) ||
    !data.servicios.every(
      (servicio) =>
        typeof servicio.id === "string" && typeof servicio.nombre === "string"
    )
  )
    throw unexpected()
  return data
}

export async function generateBudgetPdf(confirmado, options) {
  const {
    estado,
    solicitud,
    propuesta,
    serviciosSeleccionados,
    configuracion,
    aclaraciones,
  } = confirmado
  return request("/api/presupuesto/pdf", {
    ...options,
    timeoutMs: 30000,
    responseType: "pdf",
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      estado,
      solicitud,
      propuesta: {
        resumen: propuesta.resumen,
        dudas: propuesta.dudas,
        necesidadesNoCubiertas: propuesta.necesidadesNoCubiertas,
      },
      serviciosSeleccionados,
      configuracion,
      aclaraciones,
    }),
  })
}

export async function generateProposal(values, options) {
  const data = await request("/api/propuestas", {
    ...options,
    timeoutMs: 60000,
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(values),
  })
  const text = (value) => typeof value === "string" && value.trim().length > 0
  if (
    !text(data?.resumen) ||
    !Array.isArray(data.serviciosPropuestos) ||
    !data.serviciosPropuestos.every(
      (servicio) => text(servicio?.id) && text(servicio?.justificacion)
    ) ||
    !Array.isArray(data.dudas) ||
    !data.dudas.every(text) ||
    !Array.isArray(data.necesidadesNoCubiertas) ||
    !data.necesidadesNoCubiertas.every(text)
  )
    throw unexpected()
  return data
}
