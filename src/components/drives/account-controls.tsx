import { Grip, LogOut } from "lucide-react";
import { useLogout } from "@/auth-context-provider";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

/** The apps button and the account menu, at the right end of the header of every screen. */
export function AccountControls({ onDark = false }: { onDark?: boolean }) {
    const logout = useLogout();
    return (
        <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" aria-label="Apps" className={onDark ? "size-12 text-white hover:bg-white/10 hover:text-white" : "2xs:hidden xs:inline-flex"}>
                <Grip aria-hidden="true" className="size-5" />
            </Button>
            <DropdownMenu>
                <DropdownMenuTrigger aria-label="Account" className="flex size-12 cursor-pointer items-center justify-center rounded-full focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">
                    <Avatar className="size-11">
                        <AvatarImage src="/ava.jpg" />
                        <AvatarFallback>CN</AvatarFallback>
                    </Avatar>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                    <DropdownMenuLabel>My Account</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem className="w-50" onClick={() => logout()}>
                        <LogOut className="h-4 w-4" />
                        Logout
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
        </div>
    );
}
