import { PageShell } from "@/components/page-header"
import { SolicitudForm } from "@/components/solicitud-form"

export const metadata = { title: "Solicitud" }

export default function Page() {
  return (
    <PageShell title="Solicitud de proyecto" description="Describe la web que tienes en mente para empezar a preparar tu solicitud.">
      <SolicitudForm />
    </PageShell>
  )
}
