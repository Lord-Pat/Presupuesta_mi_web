"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  LayoutDashboard,
  FileText,
  Tags,
  Server,
  PanelsTopLeft,
} from "lucide-react"
import {
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  useSidebar,
} from "@/components/ui/sidebar"

const links = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/presupuestos", label: "Presupuestos", icon: FileText },
  { href: "/tarifas", label: "Tarifas", icon: Tags },
  { href: "/estado-api", label: "Estado API", icon: Server },
]

export function AppSidebar() {
  const pathname = usePathname()
  const { setOpenMobile } = useSidebar()
  return (
    <Sidebar>
      <SidebarHeader className="px-6 py-7">
        <Link
          href="/"
          onClick={() => setOpenMobile(false)}
          className="flex items-center gap-2.5 text-xl font-bold tracking-tight"
        >
          <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-white">
            <PanelsTopLeft className="size-5" />
          </span>
          WebQuote<span className="text-primary">.</span>
        </Link>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup className="px-3 pt-5">
          <nav aria-label="Navegación principal">
            <SidebarMenu className="gap-2">
              {links.map(({ href, label, icon: Icon }) => (
                <SidebarMenuItem key={href}>
                  <SidebarMenuButton
                    className="h-11 gap-3 px-3 text-sm text-muted-foreground data-active:font-semibold"
                    isActive={pathname === href}
                    render={
                      <Link
                        href={href}
                        aria-current={pathname === href ? "page" : undefined}
                        onClick={() => setOpenMobile(false)}
                      />
                    }
                  >
                    <Icon className="size-[18px]" />
                    <span>{label}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </nav>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="border-t px-6 py-5">
        <p className="text-xs font-medium">Tu próximo proyecto empieza aquí.</p>
        <p className="mt-1.5 text-xs text-muted-foreground">
          WebQuote · Espacio de trabajo
        </p>
      </SidebarFooter>
    </Sidebar>
  )
}
