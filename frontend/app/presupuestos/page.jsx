import { PageShell } from "@/components/page-header"
import { QuoteWorkspace, ConnectionNotice } from "@/components/dashboard"

export const metadata = { title: "Presupuestos" }
export default function Page() {
  return (
    <PageShell
      title="Presupuestos"
      description="Configura tu proyecto y consulta el desglose de tu presupuesto."
    >
      <div className="flex flex-col gap-6">
        <QuoteWorkspace />
        <ConnectionNotice />
      </div>
    </PageShell>
  )
}
