import { useLocation } from "react-router-dom";
import { SidebarDrives } from "./sidebar-drives";
import { SidebarInsideDrive } from "./sidebar-inside-drive";

export function AppSidebar() {
  const location = useLocation();
  const mode = location.pathname.startsWith("/drive") ? "drive-inside" : "drives";
  if(mode === "drive-inside") {
    return <SidebarInsideDrive></SidebarInsideDrive>;
  } else {
    return <SidebarDrives></SidebarDrives>
  }
}
