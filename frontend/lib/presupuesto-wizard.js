// Estado del flujo y adaptación de cantidades; los importes solo vienen de Express.
export function crearEstadoWizard(solicitud, propuesta) {
  return {
    solicitud,
    propuesta,
    seleccion: propuesta.serviciosPropuestos.map(({ id }) => id),
    configuracion: {
      paginas:
        propuesta.paginasDetectadas == null
          ? ""
          : String(propuesta.paginasDetectadas),
    },
    aclaraciones: propuesta.dudas.map((pregunta) => ({
      pregunta,
      respuesta: "",
    })),
    calculo: null,
    confirmado: null,
    paso: 0,
    viendoPDF: false,
    revision: 0,
    error: null,
  }
}

export function validarSeleccion(seleccion, catalogo) {
  if (
    new Set(seleccion).size !== seleccion.length ||
    seleccion.some(
      (id) => !catalogo.servicios.some((servicio) => servicio.id === id)
    )
  )
    return "La selección contiene servicios desconocidos o duplicados."
  const bases = seleccion.filter((id) =>
    catalogo.reglas.serviciosBase.includes(id)
  )
  if (bases.length !== 1)
    return "Selecciona un único servicio base para continuar."
  return null
}

export function datosPresupuesto(estado, catalogo) {
  const error = validarSeleccion(estado.seleccion, catalogo)
  if (error) throw new Error(error)
  const paginas = Number(estado.configuracion.paginas)
  if (
    !String(estado.configuracion.paginas).trim() ||
    !Number.isInteger(paginas) ||
    paginas < 1 ||
    paginas > 20
  )
    throw new Error(
      "Indica el número total de páginas: un entero entre 1 y 20. La primera ya está incluida."
    )
  if (estado.seleccion.includes("paginaAdicional") !== paginas > 1)
    throw new Error(
      "Revisa la selección de páginas adicionales y el número total de páginas."
    )
  return {
    tipo: estado.seleccion.find((id) =>
      catalogo.reglas.serviciosBase.includes(id)
    ),
    paginas,
    formulario: estado.seleccion.includes("formulario"),
    segundoIdioma: estado.seleccion.includes("segundoIdioma"),
  }
}

export function calculoVigente(estado, catalogo) {
  try {
    return Boolean(
      estado.calculo &&
      estado.calculo.revision === estado.revision &&
      JSON.stringify(estado.calculo.datos) ===
        JSON.stringify(datosPresupuesto(estado, catalogo))
    )
  } catch {
    return false
  }
}

export function wizardReducer(estado, accion) {
  const invalidar = (cambios) => ({
    ...estado,
    ...cambios,
    revision: estado.revision + 1,
    calculo: null,
    confirmado: null,
    error: null,
    viendoPDF: false,
  })
  switch (accion.type) {
    case "servicio": {
      const { id, catalogo } = accion
      if (!catalogo.servicios.some((servicio) => servicio.id === id))
        return { ...estado, error: "El servicio no pertenece al catálogo." }
      const bases = catalogo.reglas.serviciosBase
      const activo = estado.seleccion.includes(id)
      if (
        !bases.includes(id) &&
        !estado.seleccion.some((actual) => bases.includes(actual))
      )
        return { ...estado, error: "Selecciona primero un servicio base." }
      let seleccion = bases.includes(id)
        ? activo
          ? []
          : [
              ...estado.seleccion.filter((actual) => !bases.includes(actual)),
              id,
            ]
        : activo
          ? estado.seleccion.filter((actual) => actual !== id)
          : [...estado.seleccion, id]
      if (
        bases.includes(id) &&
        !activo &&
        Number(estado.configuracion.paginas) > 1 &&
        !seleccion.includes("paginaAdicional")
      )
        seleccion = [...seleccion, "paginaAdicional"]
      const configuracion =
        id === "paginaAdicional"
          ? {
              paginas: activo
                ? "1"
                : Number(estado.configuracion.paginas) > 1
                  ? estado.configuracion.paginas
                  : "",
            }
          : estado.configuracion
      return invalidar({ seleccion, configuracion })
    }
    case "quitarTodos":
      return invalidar({ seleccion: [] })
    case "paginas": {
      const paginas = Number(accion.valor)
      let seleccion = estado.seleccion
      if (
        String(accion.valor).trim() &&
        Number.isInteger(paginas) &&
        paginas >= 1 &&
        paginas <= 20 &&
        seleccion.some((id) => id === "landing" || id === "corporativa")
      ) {
        seleccion = seleccion.filter((id) => id !== "paginaAdicional")
        if (paginas > 1) seleccion = [...seleccion, "paginaAdicional"]
      }
      return invalidar({ seleccion, configuracion: { paginas: accion.valor } })
    }
    case "aclaracion":
      return {
        ...estado,
        confirmado: null,
        viendoPDF: false,
        aclaraciones: estado.aclaraciones.map((item, indice) =>
          indice === accion.indice ? { ...item, respuesta: accion.valor } : item
        ),
      }
    case "paso":
      return { ...estado, paso: accion.paso, viendoPDF: false, error: null }
    case "pdf":
      return estado.confirmado ? { ...estado, viendoPDF: true } : estado
    case "error":
      return { ...estado, error: accion.error }
    case "iniciarCalculo":
      return { ...estado, confirmado: null, viendoPDF: false, error: null }
    case "calculo":
      if (accion.revision !== estado.revision) return estado
      return {
        ...estado,
        calculo: {
          datos: accion.datos,
          resultado: accion.resultado,
          revision: accion.revision,
        },
        confirmado: null,
        error: null,
      }
    case "confirmar":
      if (!calculoVigente(estado, accion.catalogo))
        return {
          ...estado,
          error: "Debes recalcular el presupuesto antes de confirmar.",
        }
      return {
        ...estado,
        confirmado: structuredClone({
          solicitud: estado.solicitud,
          propuesta: estado.propuesta,
          serviciosSeleccionados: [...estado.seleccion],
          configuracion: estado.calculo.datos,
          aclaraciones: estado.aclaraciones,
          dudasPendientes: estado.aclaraciones
            .filter((item) => !item.respuesta.trim())
            .map((item) => item.pregunta),
          necesidadesNoCubiertas: estado.propuesta.necesidadesNoCubiertas,
          presupuesto: estado.calculo.resultado,
          estado: "confirmado",
        }),
      }
    default:
      return estado
  }
}
