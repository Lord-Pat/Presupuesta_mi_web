"use client"

import { useEffect, useState } from "react"

export function useApiResource(load) {
  const [attempt, setAttempt] = useState(0)
  const [state, setState] = useState({
    status: "loading",
    data: null,
    error: null,
  })

  useEffect(() => {
    const controller = new AbortController()
    load({ signal: controller.signal }).then(
      (data) => {
        if (!controller.signal.aborted)
          setState({ status: "success", data, error: null })
      },
      (error) => {
        if (!controller.signal.aborted)
          setState({ status: "error", data: null, error })
      }
    )
    return () => controller.abort()
  }, [load, attempt])

  function retry() {
    setState({ status: "loading", data: null, error: null })
    setAttempt((current) => current + 1)
  }

  return { ...state, retry }
}
