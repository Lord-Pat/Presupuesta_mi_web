"use client"

import { createContext, useContext, useEffect, useState } from "react"
import { createPortal } from "react-dom"
import { Onborda, OnbordaProvider, useOnborda } from "onborda"
import { useReducedMotion } from "framer-motion"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

export const etapas = [
  "Seleccionar servicios",
  "Configurar proyecto",
  "Revisar y confirmar presupuesto",
]
const explicaciones = [
  "Elige una base y activa los complementos que necesites. Puedes cambiar de base conservando los demás ajustes.",
  "Revisa el número total de páginas detectado y ajusta la cantidad si lo necesitas. La primera página está incluida en el servicio base.",
  "Revisa los importes calculados por Express. Puedes modificar el presupuesto o confirmar y continuar directamente a la vista previa del PDF.",
]
const tours = etapas.map((titulo, indice) => ({
  tour: `presupuesto-${indice}`,
  steps: [
    {
      title: titulo,
      content: explicaciones[indice],
      icon: indice + 1,
      selector: "#wizard-stage-title",
      side: "bottom",
      pointerPadding: 12,
      pointerRadius: 12,
    },
  ],
}))
const GuiaContext = createContext(null)

function TarjetaGuia({ step }) {
  const guia = useContext(GuiaContext)
  const slot =
    typeof document !== "undefined" &&
    document.getElementById("wizard-guide-slot")
  if (!slot) return null
  // La tarjeta ocupa espacio en el flujo: nunca tapa controles del formulario.
  return createPortal(
    <Card
      className="wizard-guide-card shadow-none"
      role="region"
      aria-label="Ayuda de Onborda"
    >
      <CardHeader>
        <CardTitle>
          Guía · {step.icon} de {etapas.length} · {step.title}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <p className="text-sm leading-6 text-muted-foreground">
          {step.content}
        </p>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            disabled={guia.paso === 0 || guia.loading}
            onClick={guia.anterior}
          >
            Anterior
          </Button>
          {guia.paso < etapas.length - 1 && (
            <Button
              type="button"
              disabled={guia.loading}
              onClick={guia.siguiente}
            >
              Siguiente
            </Button>
          )}
          <Button type="button" variant="ghost" onClick={guia.cerrar}>
            Cerrar guía
          </Button>
        </div>
      </CardContent>
    </Card>,
    slot
  )
}

function GuiaActiva({ paso, activo, loading, ir, children }) {
  const reducirMovimiento = useReducedMotion()
  const [mostrar, setMostrar] = useState(true)
  const { startOnborda, closeOnborda } = useOnborda()
  useEffect(() => {
    if (activo && mostrar) startOnborda(`presupuesto-${paso}`)
    else closeOnborda()
    return closeOnborda
  }, [paso, activo, mostrar, startOnborda, closeOnborda])
  useEffect(() => {
    if (!activo || !mostrar) return
    const cerrar = (event) => {
      if (event.key === "Escape") setMostrar(false)
    }
    document.addEventListener("keydown", cerrar)
    return () => document.removeEventListener("keydown", cerrar)
  }, [activo, mostrar])
  return (
    <GuiaContext.Provider
      value={{
        paso,
        loading,
        anterior: () => ir(paso - 1),
        siguiente: () => ir(paso + 1),
        cerrar: () => setMostrar(false),
      }}
    >
      <Onborda
        steps={tours}
        interact
        shadowOpacity="0.12"
        cardComponent={TarjetaGuia}
        cardTransition={{
          duration: reducirMovimiento ? 0 : 0.2,
          ease: "easeOut",
        }}
      >
        {activo && (
          <Button
            type="button"
            variant="outline"
            onClick={() => setMostrar((actual) => !actual)}
          >
            {mostrar ? "Ocultar ayuda" : "Mostrar guía"}
          </Button>
        )}
        {children}
      </Onborda>
    </GuiaContext.Provider>
  )
}

export function PresupuestoTour(props) {
  return (
    <OnbordaProvider>
      <GuiaActiva {...props} />
    </OnbordaProvider>
  )
}
