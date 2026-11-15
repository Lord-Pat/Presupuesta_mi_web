"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { generateBudgetPdf } from "@/lib/api"

export function usePresupuestoPDF(confirmado, autoGenerar = false) {
  const [archivo, setArchivo] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [aprobado, setAprobado] = useState(false)
  const [vistaCargada, setVistaCargada] = useState(false)
  const pending = useRef(null)
  const temporal = useRef(null)
  useEffect(
    () => () => {
      pending.current?.abort()
      if (temporal.current) URL.revokeObjectURL(temporal.current)
    },
    [confirmado]
  )

  const generar = useCallback(async () => {
    if (pending.current || confirmado?.estado !== "confirmado") return
    const controller = new AbortController()
    pending.current = controller
    setLoading(true)
    setError(null)
    setAprobado(false)
    setVistaCargada(false)
    if (temporal.current) URL.revokeObjectURL(temporal.current)
    temporal.current = null
    setArchivo(null)
    try {
      const resultado = await generateBudgetPdf(confirmado, {
        signal: controller.signal,
      })
      if (controller.signal.aborted) return
      const url = URL.createObjectURL(resultado.blob)
      temporal.current = url
      setArchivo({ url, nombre: resultado.nombre })
    } catch (failure) {
      if (!controller.signal.aborted) setError(failure.message)
    } finally {
      if (pending.current === controller) {
        pending.current = null
        setLoading(false)
      }
    }
  }, [confirmado])
  useEffect(() => {
    if (!autoGenerar) return
    const timer = setTimeout(generar, 0)
    return () => clearTimeout(timer)
  }, [autoGenerar, generar])

  function aprobar() {
    if (archivo) {
      setVistaCargada(true)
      setAprobado(true)
      setError(null)
    }
  }
  function descargar() {
    if (!archivo || !aprobado || confirmado?.estado !== "confirmado") return
    const enlace = document.createElement("a")
    enlace.href = archivo.url
    enlace.download = archivo.nombre
    document.body.appendChild(enlace)
    enlace.click()
    enlace.remove()
  }
  const falloVisor = useCallback(() => {
    setVistaCargada(false)
    setAprobado(false)
    setError(
      "No se ha podido mostrar la vista previa. Puedes reabrirla o revisar el PDF en otra pestaña."
    )
  }, [])
  return {
    archivo,
    loading,
    error,
    aprobado,
    vistaCargada,
    generar,
    aprobar,
    descargar,
    falloVisor,
    vistaLista: () => {
      setVistaCargada(true)
      setError(null)
    },
    setError,
  }
}
