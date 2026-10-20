import { PageShell } from "@/components/page-header"
import { ApiStatus } from "@/components/api-status"

export const metadata = { title: "Estado API" }
export default function Page() {
  return (
    <PageShell
      title="Estado API"
      description="Consulta la información de integración y las rutas previstas del backend."
    >
      <ApiStatus />
    </PageShell>
  )
}
