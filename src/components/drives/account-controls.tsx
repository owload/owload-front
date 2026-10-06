import { Grip, LogOut } from "lucide-react";
import { useLogout } from "@/auth-context-provider";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

/** The apps button and the account menu, at the right end of the header of every screen. */
export function AccountControls({ alwaysShowApps = false }: { alwaysShowApps?: boolean }) {
    const logout = useLogout();
    return (
        <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" aria-label="Apps" className={cn("rounded-xl", !alwaysShowApps && "2xs:hidden xs:inline-flex")}>
                <Grip aria-hidden="true" className="size-[18px]" />
            </Button>
            <DropdownMenu>
                <DropdownMenuTrigger aria-label="Account" className="flex size-11 cursor-pointer items-center justify-center rounded-full focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">
                    <Avatar className="size-9">
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
