import { AlertCircle, LoaderCircle } from "lucide-react"
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"

export function RequestError({ message, retry }) {
  return (
    <Alert variant="destructive">
      <AlertCircle />
      <AlertTitle>No se ha podido completar la solicitud</AlertTitle>
      <AlertDescription className="flex flex-col gap-3">
        <p>{message}</p>
        {retry && (
          <Button
            type="button"
            variant="outline"
            className="w-fit"
            onClick={retry}
          >
            Reintentar consulta
          </Button>
        )}
      </AlertDescription>
    </Alert>
  )
}

export function RequestLoading({ children = "Cargando..." }) {
  return (
    <p
      role="status"
      className="flex items-center gap-2 py-4 text-sm text-muted-foreground"
    >
      <LoaderCircle className="size-4 animate-spin" />
      {children}
    </p>
  )
}
