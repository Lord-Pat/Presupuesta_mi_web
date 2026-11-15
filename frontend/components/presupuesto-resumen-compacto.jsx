import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  TableFooter,
} from "@/components/ui/table"
import { formatEuro } from "@/lib/format"
import { RequestLoading } from "@/components/request-feedback"

export function PresupuestoResumenCompacto({
  estado,
  catalogo,
  vigente,
  loading,
}) {
  if (!vigente)
    return loading ? (
      <RequestLoading>Calculando los importes en Express...</RequestLoading>
    ) : (
      <p className="text-sm text-muted-foreground">
        El presupuesto no está disponible. Reintenta el cálculo o modifica la
        selección.
      </p>
    )
  const { datos, resultado } = estado.calculo
  const campos = {
    [datos.tipo]: "base",
    paginaAdicional: "paginasAdicionales",
    formulario: "formulario",
    segundoIdioma: "segundoIdioma",
  }
  return (
    <div className="rounded-lg border bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Servicio</TableHead>
            <TableHead className="text-center">Cantidad</TableHead>
            <TableHead className="text-right">Importe</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {catalogo.servicios
            .filter(({ id }) => estado.seleccion.includes(id))
            .map((servicio) => (
              <TableRow key={servicio.id}>
                <TableCell className="font-medium whitespace-normal">
                  {servicio.nombre}
                </TableCell>
                <TableCell className="text-center">
                  {servicio.id === "paginaAdicional" ? datos.paginas - 1 : 1}
                </TableCell>
                <TableCell className="text-right whitespace-nowrap">
                  {formatEuro(resultado[campos[servicio.id]])}
                </TableCell>
              </TableRow>
            ))}
        </TableBody>
        <TableFooter>
          <TableRow>
            <TableCell colSpan={2}>Total · {resultado.moneda}</TableCell>
            <TableCell className="text-right text-lg font-semibold whitespace-nowrap">
              {formatEuro(resultado.total)}
            </TableCell>
          </TableRow>
        </TableFooter>
      </Table>
    </div>
  )
}
