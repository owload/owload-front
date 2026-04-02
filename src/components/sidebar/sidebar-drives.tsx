import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader
} from "@/components/ui/sidebar"
import { Button } from "../ui/button"
import { Progress } from "../ui/progress"
import { DriveSwitcher } from "./drive-switcher"

export function SidebarDrives() {
  return (
    <Sidebar className="z-20">
      <SidebarContent>
        <SidebarHeader className="bg-white border-b-1 p-0 h-14">
        </SidebarHeader>

        <SidebarGroup className="gap-2">
          <DriveSwitcher />
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupContent className="flex flex-col gap-2 p-2 bg-white pb-4">
            <div className="pl-3 text-xs">Last seen 19:32 Feb, 02</div>
            <Progress value={50} />
            <div className="text-sm self-center">1.5GB of 3GB used</div>
            <Button size={'default'}>Upgrade</Button>
          </SidebarGroupContent>
        </SidebarGroup>

      </SidebarContent>

    </Sidebar>
  )
}
