"use client"

import { useApiResource } from "@/hooks/use-api-resource"
import { getRates } from "@/lib/api"
import { formatEuro } from "@/lib/format"
import { RequestError, RequestLoading } from "@/components/request-feedback"
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  TableCaption,
} from "@/components/ui/table"
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

const rates = [
  [
    "Landing Page",
    "Una página enfocada en presentar un producto, servicio o idea.",
    "landing",
    "Proyecto",
  ],
  [
    "Web corporativa",
    "Un sitio para presentar tu empresa y sus servicios.",
    "corporativa",
    "Proyecto",
  ],
  [
    "Página adicional",
    "Amplía tu sitio con nuevas páginas de contenido.",
    "paginaAdicional",
    "Complemento",
  ],
  [
    "Formulario de contacto",
    "Un espacio para que tus visitantes puedan escribirte.",
    "formulario",
    "Complemento",
  ],
  [
    "Segundo idioma",
    "Presenta el contenido de tu web en otro idioma.",
    "segundoIdioma",
    "Complemento",
  ],
]

export function RatesTable() {
  const { status, data, error, retry } = useApiResource(getRates)
  return (
    <Card className="shadow-none">
      <CardHeader>
        <CardTitle>Tarifas de desarrollo web</CardTitle>
        <CardDescription>
          Precios base y complementos para cada tipo de proyecto.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {status === "loading" ? (
          <RequestLoading>Consultando tarifas...</RequestLoading>
        ) : error ? (
          <RequestError message={error.message} retry={retry} />
        ) : (
          <Table>
            <TableCaption className="pb-2 text-left text-xs">
              Tarifas obtenidas del servidor Express. Tabla de solo lectura.
            </TableCaption>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="pl-4">Concepto</TableHead>
                <TableHead className="hidden sm:table-cell">Tipo</TableHead>
                <TableHead className="pr-4 text-right">Precio</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rates.map(([name, description, price, type]) => (
                <TableRow key={name}>
                  <TableCell className="max-w-64 py-6 pl-4 whitespace-normal">
                    <p className="font-medium">{name}</p>
                    <p className="mt-1.5 text-xs leading-5 text-muted-foreground">
                      {description}
                    </p>
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">
                    <Badge variant="secondary">{type}</Badge>
                  </TableCell>
                  <TableCell className="pr-4 text-right text-base font-semibold">
                    {formatEuro(data[price])}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  )
}
