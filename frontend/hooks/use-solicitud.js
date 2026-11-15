"use client"

import { useEffect, useRef, useState } from "react"
import { validateRequest, generateProposal } from "@/lib/api"

export function useSolicitud() {
  const [values, setValues] = useState({ cliente: "", descripcion: "" })
  const [errors, setErrors] = useState({})
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)
  const [solicitud, setSolicitud] = useState(null)
  const [propuesta, setPropuesta] = useState(null)
  const [analizando, setAnalizando] = useState(false)
  const [presupuestoConfirmado, setPresupuestoConfirmado] = useState(null)
  const pending = useRef(null)

  useEffect(() => () => pending.current?.abort(), [])

  function change(name, value) {
    if (pending.current) return
    setValues((current) => ({ ...current, [name]: value }))
    setErrors((current) => ({ ...current, [name]: undefined }))
    setError(null)
    setSolicitud(null)
    setPropuesta(null)
    setPresupuestoConfirmado(null)
  }

  async function submit(event) {
    event.preventDefault()
    if (pending.current) return
    setError(null)
    setSolicitud(null)
    setPropuesta(null)
    setPresupuestoConfirmado(null)
    const nextErrors = {}
    for (const [campo, etiqueta, limite] of [
      ["cliente", "El nombre del cliente o empresa", 120],
      ["descripcion", "La descripción del proyecto", 2000],
    ]) {
      if (!values[campo].trim())
        nextErrors[campo] = `${etiqueta} es un campo obligatorio`
      else if (values[campo].length > limite)
        nextErrors[campo] =
          `${etiqueta} no puede superar los ${limite} caracteres`
    }
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length) {
      event.currentTarget.elements
        .namedItem(Object.keys(nextErrors)[0])
        ?.focus()
      return
    }

    const controller = new AbortController()
    pending.current = controller
    setLoading(true)
    try {
      const data = await validateRequest(
        {
          cliente: values.cliente.trim(),
          descripcion: values.descripcion.trim(),
        },
        { signal: controller.signal }
      )
      if (!controller.signal.aborted) {
        setSolicitud(data.solicitud)
        setValues(data.solicitud)
      }
    } catch (failure) {
      if (!controller.signal.aborted) {
        setErrors(failure.fields ?? {})
        setError(failure.message)
      }
    } finally {
      if (pending.current === controller) {
        pending.current = null
        setLoading(false)
      }
    }
  }

  async function analizar() {
    if (!solicitud || pending.current) return
    const controller = new AbortController()
    pending.current = controller
    setAnalizando(true)
    setError(null)
    setPropuesta(null)
    setPresupuestoConfirmado(null)
    try {
      const data = await generateProposal(solicitud, {
        signal: controller.signal,
      })
      if (!controller.signal.aborted) setPropuesta(data)
    } catch (failure) {
      if (!controller.signal.aborted) setError(failure.message)
    } finally {
      if (pending.current === controller) {
        pending.current = null
        setAnalizando(false)
      }
    }
  }

  return {
    values,
    errors,
    error,
    loading: loading || analizando,
    analizando,
    solicitud,
    propuesta,
    change,
    submit,
    analizar,
    presupuestoConfirmado,
    setPresupuestoConfirmado,
  }
}
