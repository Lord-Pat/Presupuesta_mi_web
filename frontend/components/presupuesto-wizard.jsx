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
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert"
import { QuoteSummary } from "@/components/quote-summary"
import { RequestError, RequestLoading } from "@/components/request-feedback"
import { PresupuestoPDF } from "@/components/presupuesto-pdf"

function Aclaraciones({ estado }) {
  return (
    <div className="flex flex-col gap-4">
      <section>
        <h3 className="mb-2 font-medium">Dudas y aclaraciones</h3>
        {estado.aclaraciones.length ? (
          <ul className="flex list-disc flex-col gap-2 pl-5 text-sm">
            {estado.aclaraciones.map(({ pregunta, respuesta }, indice) => (
              <li key={indice}>
                {pregunta}
                <p className="mt-1 text-muted-foreground">
                  {respuesta.trim() || "Pendiente de aclarar"}
                </p>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">
            Sin dudas adicionales.
          </p>
        )}
      </section>
      <Alert>
        <AlertTitle>Necesidades fuera del catálogo</AlertTitle>
        <AlertDescription>
          {estado.propuesta.necesidadesNoCubiertas.length ? (
            <ul className="flex list-disc flex-col gap-2 pl-4">
              {estado.propuesta.necesidadesNoCubiertas.map((texto, indice) => (
                <li key={indice}>{texto}</li>
              ))}
            </ul>
          ) : (
            "No se han identificado necesidades no cubiertas."
          )}
          <p className="mt-2">
            Estas necesidades no forman parte de los servicios presupuestados.
          </p>
        </AlertDescription>
      </Alert>
    </div>
  )
}

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
  }, [estado.paso, activo])
  const base = catalogo.servicios.find(
    (servicio) =>
      estado.seleccion.includes(servicio.id) && servicio.categoria === "base"
  )
  return (
    <div className="max-w-3xl" hidden={!activo}>
      <PresupuestoTour
        paso={estado.paso}
        activo={activo}
        loading={loading}
        vigente={vigente}
        confirmado={Boolean(estado.confirmado)}
        ir={ir}
      >
        <div className="mt-4 flex flex-col gap-5">
          <nav aria-label="Progreso del presupuesto">
            <ol className="grid grid-cols-6 gap-2">
              {etapas.map((etapa, indice) => (
                <li key={etapa}>
                  <button
                    type="button"
                    onClick={() => ir(indice)}
                    disabled={indice > estado.paso || loading}
                    aria-current={indice === estado.paso ? "step" : undefined}
                    aria-label={`Paso ${indice + 1}: ${etapa}`}
                    className="flex w-full flex-col items-center gap-2 rounded-lg border p-2 text-center text-xs disabled:opacity-50 aria-current:border-primary aria-current:bg-accent"
                  >
                    <span className="font-semibold">{indice + 1}</span>
                    <span className="hidden sm:inline">{etapa}</span>
                  </button>
                </li>
              ))}
            </ol>
          </nav>
          <div id="wizard-stage-title" className="rounded-lg bg-card p-3">
            <p className="mb-1 text-xs text-muted-foreground">
              Paso {estado.paso + 1} de {etapas.length} · {solicitud.cliente}
            </p>
            <h2
              ref={titulo}
              tabIndex={-1}
              className="text-xl font-semibold outline-none"
            >
              {etapas[estado.paso]}
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
                <Card>
                  <CardHeader>
                    <CardTitle>Resumen del proyecto</CardTitle>
                    <CardDescription>
                      Las recomendaciones son sugerencias pendientes de tu
                      decisión.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm leading-6">{propuesta.resumen}</p>
                  </CardContent>
                </Card>
                {propuesta.serviciosPropuestos.length ? (
                  propuesta.serviciosPropuestos.map((sugerencia) => {
                    const servicio = catalogo.servicios.find(
                      ({ id }) => id === sugerencia.id
                    )
                    return (
                      <Card key={sugerencia.id}>
                        <CardHeader>
                          <Badge variant="secondary">Sugerencia de IA</Badge>
                          <CardTitle>
                            {servicio?.nombre ?? sugerencia.id}
                          </CardTitle>
                          <CardDescription>
                            {servicio?.descripcion}
                          </CardDescription>
                        </CardHeader>
                        <CardContent>
                          <p className="text-sm leading-6">
                            <span className="font-medium">
                              Por qué se recomienda:{" "}
                            </span>
                            {sugerencia.justificacion}
                          </p>
                        </CardContent>
                      </Card>
                    )
                  })
                ) : (
                  <Alert>
                    <AlertTitle>
                      La propuesta no recomienda servicios
                    </AlertTitle>
                    <AlertDescription>
                      Puedes consultar el catálogo y elegir una base en el
                      siguiente paso.
                    </AlertDescription>
                  </Alert>
                )}
                <Aclaraciones estado={estado} />
              </>
            )}
            {estado.paso === 1 && (
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
            {estado.paso === 2 && (
              <Card>
                <CardHeader>
                  <CardTitle>Páginas y aclaraciones</CardTitle>
                  <CardDescription>
                    La primera página está incluida en el precio base. Solo las
                    páginas posteriores son adicionales.
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col gap-6">
                  {estado.seleccion.includes("paginaAdicional") ? (
                    <div className="flex flex-col gap-2">
                      <label htmlFor="wizard-paginas" className="field-label">
                        Número total de páginas
                      </label>
                      <Input
                        id="wizard-paginas"
                        type="number"
                        min={2}
                        max={20}
                        step={1}
                        required
                        value={estado.configuracion.paginas}
                        disabled={loading}
                        onChange={(event) =>
                          cambiar({
                            type: "paginas",
                            valor: event.target.value,
                          })
                        }
                        aria-describedby="wizard-paginas-help wizard-error"
                        aria-invalid={Boolean(estado.error)}
                      />
                      <p
                        id="wizard-paginas-help"
                        className="text-xs text-muted-foreground"
                      >
                        Indica un entero entre 2 y 20. No asumimos cuántas
                        páginas necesitas.
                      </p>
                    </div>
                  ) : (
                    <Alert>
                      <AlertTitle>Una página incluida</AlertTitle>
                      <AlertDescription>
                        Tu selección no incluye páginas adicionales. Si
                        necesitas más de una página, vuelve a «Elegir servicios»
                        y actívalas.
                      </AlertDescription>
                    </Alert>
                  )}
                  {estado.aclaraciones.map(
                    ({ pregunta, respuesta }, indice) => (
                      <div key={indice} className="flex flex-col gap-2">
                        <label
                          htmlFor={`duda-${indice}`}
                          className="field-label"
                        >
                          {pregunta}
                        </label>
                        <Input
                          id={`duda-${indice}`}
                          value={respuesta}
                          maxLength={1000}
                          placeholder="Opcional · puede quedar pendiente"
                          disabled={loading}
                          onChange={(event) =>
                            cambiar({
                              type: "aclaracion",
                              indice,
                              valor: event.target.value,
                            })
                          }
                        />
                      </div>
                    )
                  )}
                  <p className="text-xs leading-5 text-muted-foreground">
                    Las respuestas son aclaraciones: las páginas y los servicios
                    que has seleccionado determinan el cálculo. Puedes dejar
                    pendientes las demás dudas.
                  </p>
                </CardContent>
              </Card>
            )}
            {estado.paso === 3 && (
              <>
                <p className="text-sm">
                  Servicio base: <strong>{base?.nombre}</strong>. Total de
                  páginas:{" "}
                  {estado.seleccion.includes("paginaAdicional")
                    ? estado.configuracion.paginas
                    : 1}
                  .
                </p>
                <Button
                  type="button"
                  disabled={loading}
                  onClick={() => calcular()}
                >
                  {loading
                    ? "Calculando presupuesto..."
                    : vigente
                      ? "Recalcular presupuesto"
                      : "Calcular presupuesto"}
                </Button>
                <QuoteSummary
                  result={vigente ? estado.calculo.resultado : null}
                  loading={loading}
                />
              </>
            )}
            {estado.paso === 4 && (
              <>
                <Card>
                  <CardHeader>
                    <CardTitle>{solicitud.cliente}</CardTitle>
                    <CardDescription>{propuesta.resumen}</CardDescription>
                  </CardHeader>
                  <CardContent className="flex flex-col gap-4">
                    <h3 className="font-medium">
                      Servicios finalmente seleccionados
                    </h3>
                    <ul className="flex list-disc flex-col gap-2 pl-5 text-sm">
                      {estado.seleccion.map((id) => (
                        <li key={id}>
                          {
                            catalogo.servicios.find(
                              (servicio) => servicio.id === id
                            )?.nombre
                          }
                        </li>
                      ))}
                    </ul>
                    <p className="text-sm">
                      {estado.calculo?.datos.paginas} páginas en total · Primera
                      página incluida ·{" "}
                      {Math.max(0, (estado.calculo?.datos.paginas ?? 1) - 1)}{" "}
                      páginas adicionales.
                    </p>
                  </CardContent>
                </Card>
                <QuoteSummary
                  result={vigente ? estado.calculo.resultado : null}
                  loading={loading}
                />
                <Aclaraciones estado={estado} />
                {estado.confirmado && (
                  <Alert role="status">
                    <AlertTitle>Presupuesto confirmado</AlertTitle>
                    <AlertDescription>
                      Tu selección y el desglose validado están preparados para
                      revisar y generar el documento PDF en el siguiente paso.
                    </AlertDescription>
                  </Alert>
                )}
                <div className="flex flex-col gap-3 sm:flex-row">
                  <Button
                    type="button"
                    variant="outline"
                    disabled={loading}
                    onClick={() => ir(1)}
                  >
                    Modificar selección
                  </Button>
                  <Button
                    type="button"
                    disabled={loading || !vigente || Boolean(estado.confirmado)}
                    onClick={() => calcular(true)}
                  >
                    {loading
                      ? "Comprobando presupuesto..."
                      : estado.confirmado
                        ? "Confirmado"
                        : "Confirmar presupuesto"}
                  </Button>
                </div>
              </>
            )}
            {estado.paso === 5 && estado.confirmado && (
              <PresupuestoPDF
                confirmado={estado.confirmado}
                onModificar={() => ir(1)}
              />
            )}
            <div id="wizard-error">
              {estado.error && <RequestError message={estado.error} />}
            </div>
          </div>
          <div className="flex flex-wrap justify-between gap-3 border-t pt-5">
            <Button
              type="button"
              variant="outline"
              disabled={loading || estado.paso === 0}
              onClick={() => ir(estado.paso - 1)}
            >
              Anterior
            </Button>
            {estado.paso < etapas.length - 1 && (
              <Button
                type="button"
                disabled={
                  loading ||
                  (estado.paso === 3 && !vigente) ||
                  (estado.paso === 4 && !estado.confirmado)
                }
                onClick={() => ir(estado.paso + 1)}
              >
                Siguiente
              </Button>
            )}
          </div>
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
