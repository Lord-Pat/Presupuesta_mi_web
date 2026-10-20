import { ReceiptText, FileText, LockKeyhole } from "lucide-react"
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { formatEuro } from "@/lib/format"

export function QuoteSummary({ result = null, loading = false }) {
  return (
    <Card className="h-full shadow-none">
      <CardHeader>
        <div className="section-heading">
          <span className="icon-tile">
            <ReceiptText />
          </span>
          <div>
            <CardTitle className="text-base">Resumen del presupuesto</CardTitle>
            <CardDescription className="mt-1.5">
              Cada detalle, en un solo lugar.
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent aria-live="polite" aria-busy={loading}>
        <dl className="flex flex-col gap-5 py-2 text-sm">
          {[
            ["Precio base", "base"],
            ["Páginas adicionales", "paginasAdicionales"],
            ["Formulario", "formulario"],
            ["Segundo idioma", "segundoIdioma"],
          ].map(([label, key]) => (
            <div key={label} className="flex justify-between gap-3">
              <dt className="text-muted-foreground">{label}</dt>
              <dd aria-label={result ? undefined : "Sin calcular"}>
                {result ? formatEuro(result[key]) : "—"}
              </dd>
            </div>
          ))}
        </dl>
        <Separator className="my-6" />
        <div className="flex items-center justify-between rounded-lg bg-muted px-4 py-4">
          <span className="text-sm font-semibold">Total estimado</span>
          <span
            className="text-2xl font-semibold"
            aria-label={result ? undefined : "Sin calcular"}
          >
            {result ? formatEuro(result.total) : "—"}
          </span>
        </div>
        {result ? (
          <p className="py-9 text-center text-sm text-muted-foreground">
            Presupuesto recibido del servidor · {result.moneda}
          </p>
        ) : (
          <div className="flex flex-col items-center gap-3 px-3 py-9 text-center">
            <span className="flex size-12 items-center justify-center rounded-full border bg-muted/40">
              <FileText className="size-5 text-muted-foreground" />
            </span>
            <p className="text-sm font-medium">
              {loading
                ? "Calculando presupuesto..."
                : "Aún no hay un presupuesto"}
            </p>
            <p className="max-w-64 text-xs leading-5 text-muted-foreground">
              Configura tu proyecto y pulsa «Calcular presupuesto» para ver el
              desglose.
            </p>
          </div>
        )}
        <p className="flex items-center justify-center gap-1.5 text-[11px] text-muted-foreground">
          <LockKeyhole className="size-3" />
          El presupuesto no se guarda en un historial.
        </p>
      </CardContent>
    </Card>
  )
}
