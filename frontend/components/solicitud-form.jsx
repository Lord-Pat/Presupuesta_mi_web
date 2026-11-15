"use client"

import { LoaderCircle, CheckCircle } from "lucide-react"
import { useState } from "react"
import dynamic from "next/dynamic"
import { useSolicitud } from "@/hooks/use-solicitud"
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert"
import { RequestError } from "@/components/request-feedback"
const PresupuestoWizard = dynamic(
  () => import("@/components/presupuesto-wizard"),
  { ssr: false }
)

export function SolicitudForm() {
  const {
    values,
    errors,
    error,
    loading,
    analizando,
    solicitud,
    propuesta,
    change,
    submit,
    analizar,
    setPresupuestoConfirmado,
  } = useSolicitud()
  const [revisando, setRevisando] = useState(false)
  return (
    <div className="flex flex-col gap-6">
      <Card
        className="max-w-3xl shadow-none"
        hidden={revisando && Boolean(propuesta)}
      >
        <CardHeader>
          <CardTitle>Cuéntanos tu proyecto</CardTitle>
          <CardDescription>
            Indica quién solicita la web y explica qué necesita. Ambos campos
            son obligatorios.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={submit}
            noValidate
            aria-busy={loading}
            className="flex flex-col gap-6"
          >
            <div
              className="flex flex-col gap-2.5"
              data-invalid={Boolean(errors.cliente)}
            >
              <label htmlFor="cliente" className="field-label">
                Nombre del cliente o empresa
              </label>
              <Input
                id="cliente"
                name="cliente"
                required
                maxLength={120}
                autoComplete="organization"
                placeholder="Ej. Restaurante Mediterráneo"
                value={values.cliente}
                disabled={loading}
                onChange={(event) => change("cliente", event.target.value)}
                aria-invalid={Boolean(errors.cliente)}
                aria-describedby="cliente-help cliente-error"
                className="h-11"
              />
              <p id="cliente-help" className="text-xs text-muted-foreground">
                Máximo 120 caracteres.
              </p>
              <p
                id="cliente-error"
                role={errors.cliente ? "alert" : undefined}
                className="text-sm text-destructive"
              >
                {errors.cliente}
              </p>
            </div>
            <div
              className="flex flex-col gap-2.5"
              data-invalid={Boolean(errors.descripcion)}
            >
              <label htmlFor="descripcion" className="field-label">
                Descripción del proyecto
              </label>
              <textarea
                id="descripcion"
                name="descripcion"
                required
                maxLength={2000}
                rows={8}
                placeholder="Explica a qué se dedica tu negocio, qué contenido quieres mostrar y qué necesitas de tu web."
                value={values.descripcion}
                disabled={loading}
                onChange={(event) => change("descripcion", event.target.value)}
                aria-invalid={Boolean(errors.descripcion)}
                aria-describedby="descripcion-count descripcion-error"
                className="w-full min-w-0 resize-y rounded-lg border border-input bg-transparent px-3 py-2 text-base outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-50 aria-invalid:border-destructive md:text-sm"
              />
              <p
                id="descripcion-count"
                className="text-right text-xs text-muted-foreground"
              >
                {values.descripcion.length} / 2000 caracteres
              </p>
              <p
                id="descripcion-error"
                role={errors.descripcion ? "alert" : undefined}
                className="text-sm text-destructive"
              >
                {errors.descripcion}
              </p>
            </div>
            {error && <RequestError message={error} />}
            {solicitud && (
              <Alert role="status">
                <CheckCircle />
                <AlertTitle>Solicitud validada correctamente</AlertTitle>
                <AlertDescription>
                  {solicitud.cliente}, los datos de tu proyecto están preparados
                  para el siguiente paso.
                </AlertDescription>
              </Alert>
            )}
            <div className="flex flex-col gap-3 sm:flex-row">
              <Button
                type="submit"
                disabled={loading}
                variant={solicitud ? "outline" : "default"}
                className="h-11 w-full sm:w-auto"
              >
                {loading && !analizando && (
                  <LoaderCircle
                    data-icon="inline-start"
                    className="animate-spin"
                  />
                )}
                {loading && !analizando
                  ? "Validando solicitud..."
                  : "Continuar"}
              </Button>
              {solicitud && (
                <Button
                  type="button"
                  onClick={analizar}
                  disabled={loading}
                  className="h-11 w-full sm:w-auto"
                >
                  {analizando && (
                    <LoaderCircle
                      data-icon="inline-start"
                      className="animate-spin"
                    />
                  )}
                  {analizando
                    ? "Analizando proyecto..."
                    : "Generar propuesta con IA"}
                </Button>
              )}
            </div>
            {analizando && (
              <p role="status" className="text-sm text-muted-foreground">
                Estamos analizando tu solicitud. Puede tardar unos segundos.
              </p>
            )}
          </form>
        </CardContent>
      </Card>
      {propuesta && (
        <div role="status" className="sr-only">
          Propuesta generada correctamente.
        </div>
      )}
      {propuesta && !revisando && (
        <Card className="max-w-3xl">
          <CardHeader>
            <CardTitle>Propuesta preparada</CardTitle>
            <CardDescription>
              Revisa las sugerencias, configura tu presupuesto y aprueba el PDF
              final.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button type="button" onClick={() => setRevisando(true)}>
              Iniciar revisión guiada
            </Button>
          </CardContent>
        </Card>
      )}
      {propuesta && (
        <PresupuestoWizard
          solicitud={solicitud}
          propuesta={propuesta}
          activo={revisando}
          onSalir={() => setRevisando(false)}
          onConfirmar={setPresupuestoConfirmado}
        />
      )}
    </div>
  )
}
