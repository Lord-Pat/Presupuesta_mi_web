import { SidebarTrigger } from "@/components/ui/sidebar"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"

export function PageHeader({ title }) {
  return (
    <header className="flex h-16 items-center justify-between border-b px-5 sm:px-8">
      <div className="flex items-center gap-3">
        <SidebarTrigger aria-label="Abrir o cerrar menú lateral" />
        <span className="h-4 border-l" />
        <span className="text-xs text-muted-foreground">
          <span className="hidden sm:inline">
            Espacio de trabajo <span className="mx-2 text-border">/</span>
          </span>
          <span className="text-foreground">{title}</span>
        </span>
      </div>
      <Avatar aria-label="Avatar decorativo de usuario">
        <AvatarFallback className="bg-secondary text-xs font-semibold">
          U
        </AvatarFallback>
      </Avatar>
    </header>
  )
}

export function PageShell({ title, description, children }) {
  return (
    <>
      <PageHeader title={title} />
      <main id="contenido" className="page-content" tabIndex={-1}>
        <div className="mb-7">
          <h1 className="text-3xl font-semibold tracking-tight">{title}</h1>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            {description}
          </p>
        </div>
        {children}
      </main>
    </>
  )
}
