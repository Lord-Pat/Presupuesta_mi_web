"use client"

import { useEffect, useRef } from "react"
import { getCatalog } from "@/lib/api"
import { useApiResource } from "@/hooks/use-api-resource"
import { usePresupuestoWizard } from "@/hooks/use-presupuesto-wizard"
import { PresupuestoTour, etapas } from "@/components/presupuesto-tour"
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { PresupuestoResumenCompacto } from "@/components/presupuesto-resumen-compacto"
import { RequestError, RequestLoading } from "@/components/request-feedback"
import { PresupuestoPDF } from "@/components/presupuesto-pdf"

function Flujo({
  catalogo,
  solicitud,
  propuesta,
  activo,
  onSalir,
  onConfirmar,
}) {
  const { estado, loading, cambiar, ir, calcular, vigente } =
    usePresupuestoWizard({ solicitud, propuesta, catalogo, onConfirmar })
  const titulo = useRef(null)
  useEffect(() => {
    if (activo) titulo.current?.focus({ preventScroll: true })
  }, [estado.paso, estado.viendoPDF, activo])
  const base = catalogo.servicios.find(
    (servicio) =>
      estado.seleccion.includes(servicio.id) && servicio.categoria === "base"
  )
  return (
    <div className="max-w-3xl" hidden={!activo}>
      <PresupuestoTour
        paso={estado.paso}
        activo={activo && !estado.viendoPDF}
        loading={loading}
        ir={ir}
      >
        <div className="mt-4 flex flex-col gap-5">
          {!estado.viendoPDF && (
            <nav aria-label="Progreso del presupuesto">
              <ol className="grid grid-cols-3 gap-2">
                {etapas.map((etapa, indice) => (
                  <li key={etapa}>
                    <button
                      type="button"
                      onClick={() => ir(indice)}
                      disabled={indice > estado.paso || loading}
                      aria-current={indice === estado.paso ? "step" : undefined}
                      data-active={indice === estado.paso}
                      aria-label={`Paso ${indice + 1}: ${etapa}`}
                      className="flex w-full flex-col items-center gap-2 rounded-lg border p-2 text-center text-xs disabled:opacity-50 data-[active=true]:border-primary data-[active=true]:bg-accent data-[active=true]:text-primary"
                    >
                      <span className="font-semibold">{indice + 1}</span>
                      <span className="hidden sm:inline">{etapa}</span>
                    </button>
                  </li>
                ))}
              </ol>
            </nav>
          )}
          <div id="wizard-stage-title" className="rounded-lg bg-card p-3">
            <p className="mb-1 text-xs text-muted-foreground">
              {estado.viendoPDF
                ? "Documento"
                : `Paso ${estado.paso + 1} de ${etapas.length}`}{" "}
              · {solicitud.cliente}
            </p>
            <h2
              ref={titulo}
              tabIndex={-1}
              className="text-xl font-semibold outline-none"
            >
              {estado.viendoPDF
                ? "Vista previa del presupuesto"
                : etapas[estado.paso]}
            </h2>
          </div>
          <div id="wizard-guide-slot" />
          <div
            key={estado.paso}
            className="wizard-stage flex flex-col gap-5"
            aria-busy={loading}
          >
            {estado.paso === 0 && (
              <>
                <p className="text-sm text-muted-foreground">
                  Selecciona una única base y los complementos que quieras
                  incluir. Al cambiar de base conservas los demás servicios.
                </p>
                {catalogo.servicios.map((servicio) => {
                  const seleccionado = estado.seleccion.includes(servicio.id)
                  return (
                    <Card
                      key={servicio.id}
                      className={seleccionado ? "ring-primary" : undefined}
                    >
                      <CardHeader>
                        <div className="flex items-center justify-between gap-3">
                          <label
                            htmlFor={`servicio-${servicio.id}`}
                            className="font-medium"
                          >
                            {servicio.nombre}
                          </label>
                          <Switch
                            id={`servicio-${servicio.id}`}
                            checked={seleccionado}
                            disabled={
                              loading ||
                              (servicio.categoria !== "base" && !base)
                            }
                            onCheckedChange={() =>
                              cambiar({
                                type: "servicio",
                                id: servicio.id,
                                catalogo,
                              })
                            }
                          />
                        </div>
                        <CardDescription>
                          {servicio.descripcion}
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <Badge variant={seleccionado ? "default" : "secondary"}>
                          {seleccionado
                            ? "Seleccionado"
                            : servicio.categoria === "base"
                              ? "Servicio base"
                              : "Opcional"}
                        </Badge>
                      </CardContent>
                    </Card>
                  )
                })}
                <Button
                  type="button"
                  variant="outline"
                  disabled={loading}
                  onClick={() => cambiar({ type: "quitarTodos" })}
                >
                  Quitar todos los servicios
                </Button>
              </>
            )}
            {estado.paso === 1 && (
              <Card>
                <CardHeader>
                  <CardTitle>Páginas del proyecto</CardTitle>
                  <CardDescription>
                    La primera página está incluida en el precio base. Solo las
                    páginas posteriores son adicionales.
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col gap-6">
                  <div className="flex flex-col gap-2">
                    <label htmlFor="wizard-paginas" className="field-label">
                      Número total de páginas
                    </label>
                    <Input
                      id="wizard-paginas"
                      type="number"
                      min={1}
                      max={20}
                      step={1}
                      required
                      value={estado.configuracion.paginas}
                      disabled={loading}
                      onChange={(event) =>
                        cambiar({ type: "paginas", valor: event.target.value })
                      }
                      aria-describedby="wizard-paginas-help wizard-error"
                      aria-invalid={Boolean(estado.error)}
                    />
                    <p
                      id="wizard-paginas-help"
                      className="text-xs text-muted-foreground"
                    >
                      {propuesta.paginasDetectadas != null
                        ? `La IA detectó ${propuesta.paginasDetectadas} páginas. Puedes modificar el total.`
                        : "No se ha podido determinar el total. Indica entre 1 y 20 páginas."}{" "}
                      La primera está incluida; las adicionales se ajustan a
                      esta cantidad.
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}
            {estado.paso === 2 && !estado.viendoPDF && (
              <>
                <PresupuestoResumenCompacto
                  estado={estado}
                  catalogo={catalogo}
                  vigente={vigente}
                  loading={loading}
                />
                <div className="flex flex-col gap-3 sm:flex-row">
                  <Button
                    type="button"
                    variant="outline"
                    disabled={loading}
                    onClick={() => ir(0)}
                  >
                    Modificar presupuesto
                  </Button>
                  <Button
                    type="button"
                    disabled={loading || !vigente}
                    onClick={() => calcular(true)}
                  >
                    {loading
                      ? "Comprobando presupuesto..."
                      : "Confirmar y continuar"}
                  </Button>
                </div>
              </>
            )}
            {estado.viendoPDF && estado.confirmado && (
              <PresupuestoPDF
                autoGenerar
                confirmado={estado.confirmado}
                onModificar={() => ir(0)}
              />
            )}
            <div id="wizard-error">
              {estado.error && (
                <RequestError
                  message={estado.error}
                  retry={
                    estado.paso === 2 && !estado.viendoPDF
                      ? () => calcular()
                      : undefined
                  }
                />
              )}
            </div>
          </div>
          {estado.viendoPDF ? (
            <Button type="button" variant="outline" onClick={() => ir(2)}>
              Volver al presupuesto
            </Button>
          ) : (
            estado.paso < 2 && (
              <div className="flex flex-wrap justify-between gap-3 border-t pt-5">
                <Button
                  type="button"
                  variant="outline"
                  disabled={loading || estado.paso === 0}
                  onClick={() => ir(estado.paso - 1)}
                >
                  Anterior
                </Button>
                <Button
                  type="button"
                  disabled={loading}
                  onClick={() => ir(estado.paso + 1)}
                >
                  Siguiente
                </Button>
              </div>
            )
          )}
          <Button
            type="button"
            variant="ghost"
            disabled={loading}
            onClick={onSalir}
          >
            Volver a la solicitud sin perder la revisión
          </Button>
        </div>
      </PresupuestoTour>
    </div>
  )
}

export default function PresupuestoWizard(props) {
  const catalogo = useApiResource(getCatalog)
  if (catalogo.error)
    return (
      <RequestError message={catalogo.error.message} retry={catalogo.retry} />
    )
  if (!catalogo.data)
    return (
      <RequestLoading>
        Cargando el catálogo para revisar la propuesta...
      </RequestLoading>
    )
  return <Flujo {...props} catalogo={catalogo.data} />
}
