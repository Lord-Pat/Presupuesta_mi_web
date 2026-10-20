"use client"

import { PanelsTopLeft, Building2, Server } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useApiResource } from "@/hooks/use-api-resource"
import { getRates, getApiStatus } from "@/lib/api"
import { formatEuro } from "@/lib/format"
import { RequestError, RequestLoading } from "@/components/request-feedback"
import { connectionLabel } from "@/lib/connection-status"

function InfoCard({ title, icon: Icon, children }) {
  return (
    <Card className="shadow-none">
      <CardContent className="pt-0">
        <div className="mb-4 flex items-center justify-between">
          <span className="icon-tile">
            <Icon />
          </span>
          <span className="text-xs text-muted-foreground">
            {title === "Estado API" ? "Integración" : "Precio base"}
          </span>
        </div>
        <h2 className="text-sm font-medium">{title}</h2>
        {children}
      </CardContent>
    </Card>
  )
}

export function DashboardCards() {
  const rates = useApiResource(getRates)
  const connection = useApiResource(getApiStatus)
  return (
    <>
      <div className="grid gap-4 md:grid-cols-3">
        {[
          {
            title: "Landing Page",
            key: "landing",
            icon: PanelsTopLeft,
            description: "Una página para presentar tu idea.",
          },
          {
            title: "Web corporativa",
            key: "corporativa",
            icon: Building2,
            description: "Un espacio digital para tu empresa.",
          },
        ].map(({ title, key, icon, description }) => (
          <InfoCard key={key} title={title} icon={icon}>
            {rates.status === "loading" ? (
              <RequestLoading>Cargando tarifa...</RequestLoading>
            ) : (
              <p className="mt-2 text-3xl font-semibold tracking-tight">
                {rates.data ? formatEuro(rates.data[key]) : "—"}
              </p>
            )}
            <p className="mt-2 text-xs text-muted-foreground">{description}</p>
          </InfoCard>
        ))}
        <InfoCard title="Estado API" icon={Server}>
          <div className="mt-3" aria-live="polite">
            <Badge
              variant={
                connection.status === "error" ? "destructive" : "secondary"
              }
            >
              {connectionLabel(connection)}
            </Badge>
          </div>
          {connection.status === "loading" ? (
            <RequestLoading>Comprobando disponibilidad...</RequestLoading>
          ) : (
            <>
              <p className="mt-2 text-xs text-muted-foreground">
                {connection.error
                  ? connection.error.message
                  : "El servidor ha confirmado su disponibilidad."}
              </p>
              <Button
                type="button"
                variant="link"
                className="mt-2 h-auto p-0 text-xs"
                onClick={connection.retry}
              >
                Comprobar conexión
              </Button>
            </>
          )}
        </InfoCard>
      </div>
      {rates.error && (
        <RequestError message={rates.error.message} retry={rates.retry} />
      )}
    </>
  )
}
