"use client"

import { useEffect, useRef, useState } from "react"
import { usePresupuestoPDF } from "@/hooks/use-presupuesto-pdf"
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert"
import { RequestError, RequestLoading } from "@/components/request-feedback"

export function PresupuestoPDF({
  confirmado,
  onModificar,
  autoGenerar = false,
}) {
  const pdf = usePresupuestoPDF(confirmado, autoGenerar)
  const { archivo, vistaCargada, aprobado, setError } = pdf
  const [abierto, setAbierto] = useState(true)
  const visor = useRef(null)
  // Algunos navegadores no notifican onError para el visor PDF nativo.
  useEffect(() => {
    if (!archivo || vistaCargada || aprobado || !abierto) return
    const timer = setTimeout(
      () =>
        setError(
          "Si la vista previa no aparece en tu navegador, abre el PDF en otra pestaña para revisarlo antes de aprobarlo."
        ),
      15000
    )
    return () => clearTimeout(timer)
  }, [archivo, vistaCargada, aprobado, abierto, setError])
  function imprimir() {
    try {
      visor.current?.contentWindow?.focus()
      visor.current?.contentWindow?.print()
    } catch {
      pdf.setError(
        "Para imprimir, abre el PDF en otra pestaña y utiliza la opción de impresión del navegador."
      )
    }
  }
  return (
    <Card>
      <CardHeader>
        <CardTitle>Documento del presupuesto</CardTitle>
        <CardDescription>
          {confirmado.solicitud.cliente} · Revisa el documento antes de
          aprobarlo. Los impuestos no están calculados.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-5">
        {!pdf.archivo && (
          <Button
            type="button"
            disabled={pdf.loading}
            onClick={() => {
              setAbierto(true)
              pdf.generar()
            }}
          >
            {pdf.loading ? "Generando PDF..." : "Generar vista previa PDF"}
          </Button>
        )}
        {pdf.loading && (
          <RequestLoading>
            Preparando tu documento con los importes del servidor...
          </RequestLoading>
        )}
        {pdf.error && <RequestError message={pdf.error} />}
        {pdf.archivo && (
          <>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setAbierto((actual) => !actual)}
              >
                {abierto ? "Cerrar vista previa" : "Mostrar vista previa"}
              </Button>
              <a
                href={pdf.archivo.url}
                target="_blank"
                rel="noopener noreferrer"
                onClick={pdf.vistaLista}
                className="inline-flex min-h-8 items-center text-sm text-primary underline underline-offset-4"
              >
                Abrir PDF en otra pestaña
              </a>
            </div>
            {abierto && (
              <iframe
                ref={visor}
                src={`${pdf.archivo.url}#toolbar=0&view=FitH`}
                title="Vista previa del presupuesto PDF"
                className="h-[70vh] min-h-96 w-full rounded-lg border bg-muted"
                onLoad={pdf.vistaLista}
                onError={pdf.falloVisor}
              />
            )}
            <p className="text-xs leading-5 text-muted-foreground">
              Revisa todas las páginas. Si tu navegador no muestra el documento
              aquí, ábrelo en otra pestaña y vuelve para aprobarlo.
            </p>
            {pdf.aprobado ? (
              <Alert role="status">
                <AlertTitle>Documento aprobado</AlertTitle>
                <AlertDescription>
                  La descarga utiliza exactamente el archivo que acabas de
                  revisar.
                </AlertDescription>
              </Alert>
            ) : (
              <Button type="button" onClick={pdf.aprobar}>
                Aprobar documento
              </Button>
            )}
            <div className="flex flex-col gap-3 sm:flex-row">
              <Button
                type="button"
                disabled={!pdf.aprobado}
                onClick={pdf.descargar}
              >
                Descargar presupuesto PDF
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={!pdf.aprobado || !abierto}
                onClick={imprimir}
              >
                Imprimir PDF
              </Button>
            </div>
          </>
        )}
        <Button
          type="button"
          variant="outline"
          disabled={pdf.loading}
          onClick={onModificar}
        >
          Modificar servicios y regenerar PDF
        </Button>
      </CardContent>
    </Card>
  )
}
