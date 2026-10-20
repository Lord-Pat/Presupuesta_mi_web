import "./globals.css"
import { AppSidebar } from "@/components/app-sidebar"
import { SidebarProvider } from "@/components/ui/sidebar"
import { TooltipProvider } from "@/components/ui/tooltip"

export const metadata = {
  title: { default: "WebQuote · Dashboard", template: "%s · WebQuote" },
  description: "Tu espacio de presupuestos de desarrollo web.",
}

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <body>
        <TooltipProvider>
          <SidebarProvider style={{ "--sidebar-width": "15rem" }}>
            <a className="skip-link" href="#contenido">
              Saltar al contenido
            </a>
            <AppSidebar />
            <div className="min-w-0 flex-1">{children}</div>
          </SidebarProvider>
        </TooltipProvider>
      </body>
    </html>
  )
}
