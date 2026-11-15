import { test } from "node:test"
import assert from "node:assert/strict"
import { createRequire } from "node:module"
import {
  crearEstadoWizard,
  wizardReducer,
  validarSeleccion,
  datosPresupuesto,
  calculoVigente,
} from "../lib/presupuesto-wizard.js"

const require = createRequire(import.meta.url)
const catalogo = require("../../backend/src/config/catalogo.js")
const solicitud = {
  cliente: "Empresa ficticia",
  descripcion: "Web informativa.",
}
const propuesta = {
  resumen: "Web ficticia con contacto.",
  serviciosPropuestos: [
    { id: "corporativa", justificacion: "Presenta la empresa." },
    { id: "formulario", justificacion: "Permite el contacto." },
  ],
  dudas: ["¿Qué contenido se mostrará?"],
  necesidadesNoCubiertas: ["Reservas automáticas pendientes de valoración."],
}
const inicial = () => crearEstadoWizard(solicitud, propuesta)
const servicio = (estado, id) =>
  wizardReducer(estado, { type: "servicio", id, catalogo })
const calcular = (estado) =>
  wizardReducer(estado, {
    type: "calculo",
    revision: estado.revision,
    datos: datosPresupuesto(estado, catalogo),
    resultado: {
      base: 1,
      paginasAdicionales: 2,
      formulario: 3,
      segundoIdioma: 4,
      total: 987,
      moneda: "EUR",
    },
  })

test("inicia con solicitud y propuesta separadas, sin inventar cantidades", () => {
  const estado = inicial()
  assert.deepEqual(estado.seleccion, ["corporativa", "formulario"])
  assert.equal(estado.configuracion.paginas, "")
  assert.equal(estado.calculo, null)
  assert.equal(estado.confirmado, null)
  assert.equal(estado.aclaraciones[0].respuesta, "")
})

test("elimina un recomendado, añade otro y cambia de base conservando extras y cantidades", () => {
  let estado = servicio(inicial(), "formulario")
  assert.ok(!estado.seleccion.includes("formulario"))
  estado = servicio(estado, "segundoIdioma")
  estado = servicio(estado, "paginaAdicional")
  estado = wizardReducer(estado, { type: "paginas", valor: "4" })
  estado = servicio(estado, "landing")
  assert.deepEqual(datosPresupuesto(estado, catalogo), {
    tipo: "landing",
    paginas: 4,
    formulario: false,
    segundoIdioma: true,
  })
  assert.ok(!estado.seleccion.includes("corporativa"))
  assert.equal(estado.configuracion.paginas, "4")
})

test("rechaza desconocidos, duplicados y dos bases", () => {
  assert.match(servicio(inicial(), "tienda").error, /catálogo/)
  for (const seleccion of [
    ["corporativa", "landing"],
    ["landing", "landing"],
    ["tienda"],
    ["formulario"],
    [],
  ])
    assert.ok(validarSeleccion(seleccion, catalogo))
  const sinBase = wizardReducer(inicial(), { type: "quitarTodos" })
  assert.deepEqual(sinBase.seleccion, [])
  assert.ok(servicio(sinBase, "formulario").error)
})

test("valida las páginas adicionales sin elegir automáticamente una cantidad", () => {
  const estado = servicio(inicial(), "paginaAdicional")
  for (const paginas of ["", " ", "0", "1", "1.5", "21", "abc"]) {
    assert.throws(
      () =>
        datosPresupuesto({ ...estado, configuracion: { paginas } }, catalogo),
      /entero entre 2 y 20/
    )
  }
  for (const paginas of ["2", "20"])
    assert.equal(
      datosPresupuesto({ ...estado, configuracion: { paginas } }, catalogo)
        .paginas,
      Number(paginas)
    )
  assert.equal(datosPresupuesto(inicial(), catalogo).paginas, 1)
})

test("conserva datos y aclaraciones al retroceder y permite dudas pendientes", () => {
  let estado = wizardReducer(inicial(), {
    type: "aclaracion",
    indice: 0,
    valor: "Carta e información ficticia",
  })
  estado = wizardReducer(estado, { type: "paso", paso: 3 })
  estado = wizardReducer(estado, { type: "paso", paso: 0 })
  assert.equal(estado.aclaraciones[0].respuesta, "Carta e información ficticia")
  assert.deepEqual(estado.seleccion, inicial().seleccion)
  assert.equal(datosPresupuesto(inicial(), catalogo).paginas, 1)
})

test("cada cambio económico invalida cálculo y confirmación; ignora respuestas antiguas", () => {
  let estado = calcular(inicial())
  assert.ok(calculoVigente(estado, catalogo))
  estado = wizardReducer(estado, { type: "confirmar", catalogo })
  assert.ok(estado.confirmado)
  const anterior = estado.calculo
  estado = servicio(estado, "segundoIdioma")
  assert.equal(estado.calculo, null)
  assert.equal(estado.confirmado, null)
  const tardia = wizardReducer(estado, { type: "calculo", ...anterior })
  assert.equal(tardia.calculo, null)
  assert.equal(
    wizardReducer(estado, { type: "confirmar", catalogo }).confirmado,
    null
  )
  estado = calcular(estado)
  estado = wizardReducer(estado, { type: "paginas", valor: "3" })
  assert.equal(estado.calculo, null)
})

test("la confirmación conserva el total del servidor, sin recalcularlo, y deja un snapshot para PDF", () => {
  const estado = wizardReducer(calcular(inicial()), {
    type: "confirmar",
    catalogo,
  })
  assert.equal(estado.confirmado.presupuesto.total, 987)
  assert.deepEqual(
    estado.confirmado.configuracion,
    datosPresupuesto(estado, catalogo)
  )
  assert.deepEqual(estado.confirmado.dudasPendientes, propuesta.dudas)
  assert.deepEqual(
    estado.confirmado.necesidadesNoCubiertas,
    propuesta.necesidadesNoCubiertas
  )
  assert.notEqual(estado.confirmado.solicitud, solicitud)
  assert.equal(estado.confirmado.estado, "confirmado")
})

test("una propuesta vacía permite comenzar y seleccionar una base manualmente", () => {
  const estado = crearEstadoWizard(solicitud, {
    ...propuesta,
    serviciosPropuestos: [],
  })
  assert.ok(validarSeleccion(estado.seleccion, catalogo))
  assert.equal(
    validarSeleccion(servicio(estado, "landing").seleccion, catalogo),
    null
  )
})
