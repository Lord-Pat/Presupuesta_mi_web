"use client"

import { useEffect, useReducer, useRef, useState } from "react"
import { calculateQuote } from "@/lib/api"
import {
  crearEstadoWizard,
  wizardReducer,
  datosPresupuesto,
  validarSeleccion,
  calculoVigente,
} from "@/lib/presupuesto-wizard"

export function usePresupuestoWizard({
  solicitud,
  propuesta,
  catalogo,
  onConfirmar,
}) {
  const [estado, dispatch] = useReducer(wizardReducer, null, () =>
    crearEstadoWizard(solicitud, propuesta)
  )
  const [loading, setLoading] = useState(false)
  const pending = useRef(null)
  useEffect(() => () => pending.current?.abort(), [])

  function cambiar(accion) {
    if (pending.current) return
    dispatch(accion)
    onConfirmar(null)
  }

  function ir(paso) {
    if (pending.current) return
    try {
      if (paso > 0) {
        const error = validarSeleccion(estado.seleccion, catalogo)
        if (error) throw new Error(error)
      }
      if (paso > 1) datosPresupuesto(estado, catalogo)
      if (!Number.isInteger(paso) || paso < 0 || paso > 2) return
      dispatch({ type: "paso", paso })
      if (paso === 2 && !calculoVigente(estado, catalogo)) void calcular()
    } catch (error) {
      dispatch({ type: "error", error: error.message })
    }
  }

  async function calcular(confirmar = false) {
    if (pending.current) return
    let datos
    try {
      datos = datosPresupuesto(estado, catalogo)
      if (confirmar && !calculoVigente(estado, catalogo))
        throw new Error("Debes recalcular el presupuesto antes de confirmar.")
    } catch (error) {
      dispatch({ type: "error", error: error.message })
      return
    }
    const controller = new AbortController()
    pending.current = controller
    setLoading(true)
    dispatch({ type: "iniciarCalculo" })
    onConfirmar(null)
    try {
      const resultado = await calculateQuote(datos, {
        signal: controller.signal,
      })
      if (controller.signal.aborted) return
      const accion = {
        type: "calculo",
        datos,
        resultado,
        revision: estado.revision,
      }
      dispatch(accion)
      if (confirmar) {
        const claves = [
          "base",
          "paginasAdicionales",
          "formulario",
          "segundoIdioma",
          "total",
          "moneda",
        ]
        if (
          !claves.every(
            (clave) => resultado[clave] === estado.calculo.resultado[clave]
          )
        ) {
          dispatch({
            type: "error",
            error:
              "Los importes del servidor han cambiado. Revisa el nuevo desglose antes de confirmar de nuevo.",
          })
          return
        }
        const actualizado = wizardReducer(estado, accion)
        const confirmado = wizardReducer(actualizado, {
          type: "confirmar",
          catalogo,
        })
        dispatch({ type: "confirmar", catalogo })
        onConfirmar(confirmado.confirmado)
        dispatch({ type: "pdf" })
      }
    } catch (error) {
      if (!controller.signal.aborted)
        dispatch({ type: "error", error: error.message })
    } finally {
      if (pending.current === controller) {
        pending.current = null
        setLoading(false)
      }
    }
  }

  return {
    estado,
    loading,
    cambiar,
    ir,
    calcular,
    vigente: calculoVigente(estado, catalogo),
  }
}
