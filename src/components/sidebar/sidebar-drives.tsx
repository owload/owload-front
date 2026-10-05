import { LayoutGrid, Plus } from "lucide-react"
import { Link } from "react-router-dom"
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
  return (
    <Sidebar className="z-20">
      <SidebarContent className="gap-5 px-5 pb-5 pt-6">
        <SidebarLogo />
        <DriveSwitcher />
        <Button asChild className="h-[52px] w-full gap-2.5 font-bold">
          <Link to="/create">
            <Plus />
            <span>New drive</span>
          </Link>
        </Button>

        <SidebarMenu aria-label="Sections" className="gap-1">
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild isActive>
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
