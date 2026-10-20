import { PageShell } from "@/components/page-header"
import { RatesTable } from "@/components/rates-table"

export const metadata = { title: "Tarifas" }
export default function Page() {
  return (
    <PageShell
      title="Tarifas"
      description="Una base clara para cada proyecto. Consulta los precios y complementos disponibles."
    >
      <RatesTable />
    </PageShell>
  )
}
