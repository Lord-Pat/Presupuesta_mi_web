import { PageShell } from "@/components/page-header"
import { Dashboard } from "@/components/dashboard"

export default function Page() {
  return (
    <PageShell
      title="Dashboard"
      description="Gestiona tus presupuestos de desarrollo web desde un único lugar."
    >
      <Dashboard />
    </PageShell>
  )
}
