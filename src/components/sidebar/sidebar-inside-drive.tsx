import { History, CloudUpload, FileText, ImagePlay, Settings, Trash, FolderPlus } from "lucide-react"

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
import { useUploadFile } from "@/hooks/use-upload-file"
import { useCreateFolderDialog } from "@/hooks/use-dialogs"
import { Link, useParams } from "react-router-dom"
import { useFilesStore } from "@/stores/files-store"

export function SidebarInsideDrive() {
  const uploadFile = useUploadFile();
  const openCreateFolderDialog = useCreateFolderDialog();
  const { driveId } = useParams<{ driveId: string }>();
  const filesInitialized = useFilesStore((state) => state.filesInitialized);

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
      url: driveId ? `/drive/${driveId}/settings` : "#",
      icon: Settings,
    },
  ]


  return (
    <Sidebar className="z-20">
      <SidebarContent className="gap-5 px-5 pb-5 pt-6">
        <SidebarLogo />
        <DriveSwitcher />
        {filesInitialized && <div className="flex flex-col gap-2">
          <Button variant="outline" className="h-[52px] w-full gap-2.5 border-sunny-ink-line bg-transparent text-white hover:bg-sidebar-accent" onClick={openCreateFolderDialog}>
            <FolderPlus />
            Create
          </Button>
          <Button className="h-[52px] w-full gap-2.5 font-bold" onClick={uploadFile}>
            <CloudUpload />
            <span>Upload</span>
          </Button>
        </div>}

        <SidebarMenu aria-label="Sections" className="gap-1">
          {menuItems.map((item) => (
            <SidebarMenuItem key={item.title}>
              <SidebarMenuButton size={'lg'} asChild isActive={item.active}>
                <Link to={item.url}>
                  <item.icon />
                  <span>{item.title}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>

        <SidebarStorage className="mt-auto" />
      </SidebarContent>
    </Sidebar>
  )
}
