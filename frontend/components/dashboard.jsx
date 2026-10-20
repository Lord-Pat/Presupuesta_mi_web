import Link from "next/link"
import { ArrowRight, Server } from "lucide-react"
import { DashboardCards } from "@/components/dashboard-cards"
import { QuoteWorkspace } from "@/components/quote-workspace"

export { QuoteWorkspace }

export function ConnectionNotice() {
  return (
    <Link
      href="/estado-api"
      className="group flex items-center gap-4 rounded-xl border bg-muted/25 px-5 py-4 transition-colors hover:bg-muted focus-visible:outline-2 focus-visible:outline-primary"
    >
      <Server className="size-5 shrink-0 text-muted-foreground" />
      <div className="flex-1">
        <p className="text-sm font-medium">Conexión con Express</p>
        <p className="mt-1 text-xs leading-5 text-muted-foreground">
          Consulta el estado del servicio y comprueba la conexión cuando lo
          necesites.
        </p>
      </div>
      <ArrowRight className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-1" />
    </Link>
  )
}

export function Dashboard() {
  return (
    <div className="flex flex-col gap-6">
      <DashboardCards />
      <QuoteWorkspace />
      <ConnectionNotice />
    </div>
  )
}
