"use client"

import { getCatalog } from "@/lib/api"
import { useApiResource } from "@/hooks/use-api-resource"
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { RequestError } from "@/components/request-feedback"

export function PropuestaPreview({ propuesta }) {
  const catalogo = useApiResource(getCatalog)
  const nombres = new Map(
    catalogo.data?.servicios.map((servicio) => [servicio.id, servicio.nombre])
  )
  return (
    <Card
      className="max-w-3xl shadow-none"
      role="region"
      aria-label="Propuesta de servicios"
    >
      <CardHeader>
        <Badge variant="secondary">Pendiente de revisión</Badge>
        <CardTitle role="heading" aria-level={2}>
          Propuesta de tu proyecto
        </CardTitle>
        <CardDescription>
          Recomendaciones de IA para revisar en el siguiente paso.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-6 break-words">
        <section aria-label="Resumen del proyecto">
          <h3 className="mb-2 font-medium">Resumen del proyecto</h3>
          <p className="text-sm leading-6 text-muted-foreground">
            {propuesta.resumen}
          </p>
        </section>
        <section aria-label="Servicios propuestos">
          <h3 className="mb-3 font-medium">Servicios propuestos</h3>
          {catalogo.error && (
            <RequestError
              message="No se han podido cargar los nombres del catálogo. Se muestran sus identificadores."
              retry={catalogo.retry}
            />
          )}
          {propuesta.serviciosPropuestos.length ? (
            <ul className="flex flex-col gap-4">
              {propuesta.serviciosPropuestos.map((servicio) => (
                <li key={servicio.id} className="flex flex-col gap-1">
                  <span className="text-sm font-medium">
                    {nombres.get(servicio.id) ?? servicio.id}
                  </span>
                  <p className="text-sm leading-6 text-muted-foreground">
                    {servicio.justificacion}
                  </p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">
              Necesitamos aclarar el alcance antes de proponer servicios.
            </p>
          )}
        </section>
        {[
          [
            "Dudas que deben aclararse",
            propuesta.dudas,
            "No se han identificado dudas adicionales.",
          ],
          [
            "Necesidades no cubiertas",
            propuesta.necesidadesNoCubiertas,
            "No se han identificado necesidades fuera del catálogo.",
          ],
        ].map(([titulo, elementos, vacio]) => (
          <section key={titulo} aria-label={titulo}>
            <h3 className="mb-2 font-medium">{titulo}</h3>
            {elementos.length ? (
              <ul className="flex list-disc flex-col gap-2 pl-5 text-sm leading-6 text-muted-foreground">
                {elementos.map((texto, index) => (
                  <li key={index}>{texto}</li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">{vacio}</p>
            )}
          </section>
        ))}
      </CardContent>
    </Card>
  )
}
