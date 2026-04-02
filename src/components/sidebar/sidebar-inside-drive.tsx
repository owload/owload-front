import { History, CloudUpload, FileText, ImagePlay, Settings, Trash, FolderPlus } from "lucide-react"

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import { Button } from "../ui/button"
import { Progress } from "../ui/progress"
import { DriveSwitcher } from "./drive-switcher"
import { useUploadFile } from "@/hooks/use-upload-file"
import { useCreateFolderDialog } from "@/hooks/use-dialogs"

export function SidebarInsideDrive() {
  const uploadFile = useUploadFile();
  const openCreateFolderDialog = useCreateFolderDialog();

  const menuItems = [
    {
      title: "All Files",
      url: "#",
      icon: FileText,
      active: true
    },
    {
      title: "Recent",
      url: "#",
      icon: History,
    },
    {
      title: "Media",
      url: "#",
      icon: ImagePlay,
    },
    {
      title: "Recycle Bin",
      url: "#",
      icon: Trash,
    },
    {
      title: "Settings",
      url: "#",
      icon: Settings,
    },
  ]


  return (
    <Sidebar className="z-20">
      <SidebarContent>
        
        <SidebarHeader className="bg-white border-b-1 p-0 h-14">
        </SidebarHeader>

        <SidebarGroup className="gap-2">
          <DriveSwitcher />
        </SidebarGroup>
        <SidebarGroup className="gap-2">
            <Button className="py-5 w-full" variant={'secondary'} onClick={openCreateFolderDialog}>
              <FolderPlus />
              Create
            </Button>

          <Button className="py-5" onClick={uploadFile}>
            <CloudUpload />
            <span>Upload</span>
          </Button>
        </SidebarGroup>

        <SidebarGroup />
        {/* <SidebarGroupLabel>Application</SidebarGroupLabel> */}
        <SidebarGroupContent>
          <SidebarMenu>
            {menuItems.map((item) => (
              <SidebarMenuItem key={item.title} className="pl-4">
                <SidebarMenuButton size={'lg'} asChild isActive={item.active}>
                  <a href={item.url}>
                    <item.icon />
                    <span>{item.title}</span>
                  </a>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarGroupContent>
        <SidebarGroup />

      </SidebarContent>
      <SidebarFooter className="bg-white pb-4">
        <div className="pl-3 text-xs">Last seen 19:32 Feb, 02</div>
        <Progress value={50} />
        <div className="text-sm self-center">1.5GB of 3GB used</div>
        <Button size={'default'}>Upgrade</Button>
      </SidebarFooter>
    </Sidebar>
  )
}
