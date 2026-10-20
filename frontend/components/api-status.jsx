"use client"

import {
  Server,
  Unplug,
  CircleDashed,
  LoaderCircle,
  CheckCircle2,
} from "lucide-react"
import { useApiResource } from "@/hooks/use-api-resource"
import { getApiStatus } from "@/lib/api"
import { connectionLabel } from "@/lib/connection-status"
import { RequestError } from "@/components/request-feedback"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

const endpoints = [
  {
    method: "GET",
    path: "/api/estado",
    description: "Consultar el estado del servicio.",
  },
  {
    method: "GET",
    path: "/api/tarifas",
    description: "Obtener los precios base y los complementos.",
  },
  {
    method: "POST",
    path: "/api/presupuesto",
    description:
      "Calcular el presupuesto a partir de las opciones del proyecto.",
  },
]

export function ApiStatus() {
  const connection = useApiResource(getApiStatus)
  const loading = connection.status === "loading"
  const connected = connection.status === "success"
  return (
    <div className="flex flex-col gap-6">
      <Card className="shadow-none">
        <CardContent className="flex flex-col gap-5 sm:flex-row sm:items-start">
          <span className="icon-tile size-12!">
            {loading ? (
              <LoaderCircle className="animate-spin" />
            ) : connected ? (
              <CheckCircle2 />
            ) : (
              <Unplug />
            )}
          </span>
          <div className="flex-1">
            <div className="mb-2 flex flex-wrap items-center gap-3">
              <h2 className="text-lg font-semibold">Conexión con el backend</h2>
              <Badge
                variant={connection.error ? "destructive" : "secondary"}
                aria-live="polite"
              >
                <span className="mr-1 size-1.5 rounded-full bg-muted-foreground" />
                {connectionLabel(connection)}
              </Badge>
            </div>
            <p className="text-sm leading-6 text-muted-foreground">
              {loading
                ? "Comprobando la disponibilidad del servidor Express..."
                : connected
                  ? "El servidor ha confirmado que está disponible para recibir solicitudes."
                  : "No se ha podido confirmar la disponibilidad del servidor."}
            </p>
            <p className="mt-3 text-xs text-muted-foreground">
              La consulta se realiza al entrar y al pulsar el botón. No hay
              comprobaciones periódicas.
            </p>
            <Button
              type="button"
              variant="outline"
              className="mt-4 gap-2"
              disabled={loading}
              onClick={connection.retry}
            >
              {loading && (
                <LoaderCircle
                  className="animate-spin"
                  data-icon="inline-start"
                />
              )}
              {loading ? "Comprobando conexión..." : "Comprobar conexión"}
            </Button>
          </div>
        </CardContent>
      </Card>
      {connection.error && <RequestError message={connection.error.message} />}
      <Card className="shadow-none">
        <CardHeader>
          <div className="section-heading">
            <span className="icon-tile">
              <Server />
            </span>
            <div>
              <CardTitle>Rutas de la API</CardTitle>
              <CardDescription className="mt-1.5">
                Puntos de conexión del backend Express. Cada ruta se consulta de
                forma independiente.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="divide-y">
            {endpoints.map(({ method, path, description }) => (
              <div
                key={path}
                className="flex flex-wrap items-center gap-4 py-6 first:pt-2"
              >
                <Badge
                  variant={method === "POST" ? "outline" : "secondary"}
                  className="w-14 justify-center font-mono text-xs"
                >
                  {method}
                </Badge>
                <div className="min-w-0 flex-1 basis-40">
                  <h3 className="font-mono text-sm font-medium break-all">
                    {path}
                  </h3>
                  <p className="mt-1.5 text-xs leading-5 text-muted-foreground">
                    {description}
                  </p>
                </div>
                <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <CircleDashed className="size-3.5" />
                  {path === "/api/estado"
                    ? connectionLabel(connection)
                    : "Sin comprobar en esta pantalla"}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
