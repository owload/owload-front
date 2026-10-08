import { LayoutGrid, Plus } from "lucide-react"
import { Link, useLocation } from "react-router-dom"
import {
  Sidebar,
  SidebarContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import { Button } from "../ui/button"
import { DriveSwitcher } from "./drive-switcher"
import { SidebarLogo, SidebarStorage } from "./sidebar-parts"

export function SidebarDrives() {
  const isProfilePage = useLocation().pathname.startsWith("/profile")
  return (
    <Sidebar className="z-20">
      <SidebarContent className="gap-3.5 px-4 py-[18px]">
        <SidebarLogo />
        <DriveSwitcher />
        <Button asChild className="h-11 w-full justify-start gap-2.5 px-3 text-sm font-semibold">
          <Link to="/create">
            <Plus />
            <span>New drive</span>
          </Link>
        </Button>

        <SidebarMenu aria-label="Sections" className="gap-0.5">
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild isActive={!isProfilePage}>
              <Link to="/">
                <LayoutGrid />
                <span>My drives</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>

        <SidebarStorage className="mt-auto" />
      </SidebarContent>
    </Sidebar>
  )
}
