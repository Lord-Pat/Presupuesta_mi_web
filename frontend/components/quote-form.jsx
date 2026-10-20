"use client"

import {
  Calculator,
  MessageSquare,
  Languages,
  Info,
  LoaderCircle,
} from "lucide-react"
import { RequestError } from "@/components/request-feedback"
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card"
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectGroup,
  SelectItem,
} from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Button } from "@/components/ui/button"

const projects = [
  { value: "landing", label: "Landing Page" },
  { value: "corporativa", label: "Web corporativa" },
]

export function QuoteForm({ values, error, loading, change, submit }) {
  return (
    <Card className="shadow-none">
      <CardHeader>
        <div className="section-heading">
          <span className="icon-tile">
            <Calculator />
          </span>
          <div>
            <CardTitle className="text-base">Nuevo presupuesto</CardTitle>
            <CardDescription className="mt-1.5">
              Dale forma a tu próximo proyecto web.
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <form
          className="flex flex-col gap-6"
          onSubmit={submit}
          aria-busy={loading}
        >
          <div className="flex flex-col gap-2.5">
            <label htmlFor="project" className="field-label">
              Tipo de proyecto
            </label>
            <Select
              items={projects}
              value={values.tipo}
              onValueChange={(value) => change("tipo", value)}
              name="tipo"
            >
              <SelectTrigger id="project" className="h-11! w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {projects.map((item) => (
                    <SelectItem key={item.value} value={item.value}>
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-2.5">
            <label htmlFor="pages" className="field-label">
              Número de páginas
            </label>
            <Input
              id="pages"
              name="paginas"
              type="number"
              min={1}
              max={20}
              step={1}
              required
              value={values.paginas}
              onChange={(event) => change("paginas", event.target.value)}
              placeholder="Ej. 3"
              className="h-11"
              aria-describedby="pages-help"
            />
            <p id="pages-help" className="text-xs text-muted-foreground">
              Indica un número entero entre 1 y 20.
            </p>
          </div>
          <div className="border-t">
            <div className="option-row">
              <MessageSquare className="size-[18px] shrink-0 text-muted-foreground" />
              <label htmlFor="contact" className="flex-1 cursor-pointer">
                <span className="field-label">Formulario de contacto</span>
                <span className="mt-1 block text-xs text-muted-foreground">
                  Recibe mensajes desde tu web.
                </span>
              </label>
              <Switch
                id="contact"
                name="formulario"
                checked={values.formulario}
                onCheckedChange={(value) => change("formulario", value)}
              />
            </div>
            <div className="option-row border-t">
              <Languages className="size-[18px] shrink-0 text-muted-foreground" />
              <label htmlFor="language" className="flex-1 cursor-pointer">
                <span className="field-label">Segundo idioma</span>
                <span className="mt-1 block text-xs text-muted-foreground">
                  Tu sitio web en un idioma adicional.
                </span>
              </label>
              <Switch
                id="language"
                name="segundoIdioma"
                checked={values.segundoIdioma}
                onCheckedChange={(value) => change("segundoIdioma", value)}
              />
            </div>
          </div>
          <div className="flex flex-col gap-3">
            {error && <RequestError message={error} />}
            <Button
              type="submit"
              disabled={loading}
              className="h-11 w-full gap-2"
              aria-describedby="calculate-help"
            >
              {loading ? (
                <LoaderCircle
                  data-icon="inline-start"
                  className="animate-spin"
                />
              ) : (
                <Calculator data-icon="inline-start" />
              )}
              {loading ? "Calculando presupuesto..." : "Calcular presupuesto"}
            </Button>
            <p
              id="calculate-help"
              className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground"
            >
              <Info className="size-3.5 shrink-0" />
              El presupuesto se calcula en el servidor.
            </p>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
