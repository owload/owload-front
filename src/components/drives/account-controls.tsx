import { Grip, LogOut, UserRound } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { useLogout, useUserInfo } from "@/auth-context-provider";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { accountInitials, AVATAR_SRC } from "./account-avatar";

/**
 * The apps button and the account menu, at the right end of the header of every screen. On the profile page the photo
 * has a ring (dark, or yellow when the header is dark, as on a phone).
 */
export function AccountControls({ alwaysShowApps = false, onDark = false }: { alwaysShowApps?: boolean, onDark?: boolean }) {
    const logout = useLogout();
    const userInfo = useUserInfo();
    const onProfile = useLocation().pathname === "/profile";
    return (
        <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" aria-label="Apps" className={cn("rounded-xl", !alwaysShowApps && "2xs:hidden xs:inline-flex", onDark && "text-white hover:bg-white/10 hover:text-white")}>
                <Grip aria-hidden="true" className="size-[18px]" />
            </Button>
            <DropdownMenu>
                <DropdownMenuTrigger
                    aria-label="Account"
                    aria-current={onProfile ? "page" : undefined}
                    className={cn(
                        "flex size-11 cursor-pointer items-center justify-center rounded-full focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
                        onProfile && !onDark && "shadow-[0_0_0_2px_var(--sunny-ink)]",
                    )}
                >
                    <Avatar className={cn("size-9", onDark && "size-8", onProfile && onDark && "shadow-[0_0_0_2px_var(--sunny-yellow)]")}>
                        <AvatarImage src={AVATAR_SRC} />
                        <AvatarFallback>{accountInitials(userInfo.fullName ?? userInfo.name)}</AvatarFallback>
                    </Avatar>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                    <DropdownMenuLabel>My Account</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild className="w-50">
                        <Link to="/profile">
                            <UserRound className="h-4 w-4" />
                            Profile
                        </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem className="w-50" onClick={() => logout()}>
                        <LogOut className="h-4 w-4" />
                        Logout
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
        </div>
    );
}
