"use client"

import { useEffect, useRef, useState } from "react"
import { calculateQuote } from "@/lib/api"

export function useQuote() {
  const [values, setValues] = useState({
    tipo: "landing",
    paginas: "1",
    formulario: false,
    segundoIdioma: false,
  })
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)
  const pending = useRef(null)

  useEffect(() => () => pending.current?.abort(), [])

  function change(name, value) {
    pending.current?.abort()
    pending.current = null
    setValues((current) => ({ ...current, [name]: value }))
    setResult(null)
    setError(null)
    setLoading(false)
  }

  async function submit(event) {
    event.preventDefault()
    if (pending.current) return
    setResult(null)
    setError(null)
    const paginas = Number(values.paginas)
    if (
      values.paginas.trim() === "" ||
      !Number.isInteger(paginas) ||
      paginas < 1 ||
      paginas > 20
    ) {
      setError("El número de páginas debe ser un entero entre 1 y 20")
      return
    }
    if (
      !["landing", "corporativa"].includes(values.tipo) ||
      typeof values.formulario !== "boolean" ||
      typeof values.segundoIdioma !== "boolean"
    ) {
      setError("Revisa las opciones del proyecto antes de continuar.")
      return
    }
    const controller = new AbortController()
    pending.current = controller
    setLoading(true)
    try {
      const quote = await calculateQuote(
        {
          tipo: values.tipo,
          paginas,
          formulario: values.formulario,
          segundoIdioma: values.segundoIdioma,
        },
        { signal: controller.signal }
      )
      if (!controller.signal.aborted) setResult(quote)
    } catch (failure) {
      if (!controller.signal.aborted) setError(failure.message)
    } finally {
      if (pending.current === controller) {
        pending.current = null
        setLoading(false)
      }
    }
  }

  return { values, result, error, loading, change, submit }
}
