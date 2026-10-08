import { LogOut, UserRound } from "lucide-react";
import { useUserInfo } from "@/auth-context-provider";
import { useSignOut } from "@/hooks/use-sign-out";
import { PersonalInfoCard } from "@/components/profile/personal-info-card";
import { ActivityCard } from "@/components/profile/activity-card";
import { PlanCard } from "@/components/profile/plan-card";
import { ProfileButton } from "@/components/profile/profile-parts";
import { ProfileTop } from "@/components/profile/profile-top";
import { SecurityCard } from "@/components/profile/security-card";
import { useUserProfile } from "@/hooks/use-user-profile";
import { useFilesStore } from "@/stores/files-store";

/** The profile of the signed-in user: personal info, sign-in and security, the plan. */
export function ProfilePage() {
    const userInfo = useUserInfo();
    const doSignOut = useSignOut();
    const drivesCount = useFilesStore((state) => state.drives.length);
    const { profile, saveName } = useUserProfile();
    // The backend keeps the name and the email; until they arrive, the sign-in token's values are shown.
    const name = (profile ? profile.name : userInfo.fullName) || undefined;
    const email = profile?.email || userInfo.email;
    const signOut = (
        <ProfileButton size={44} className="px-4" onClick={() => void doSignOut()}>
            <LogOut aria-hidden="true" className="size-4" strokeWidth={2.2} />
            Sign out
        </ProfileButton>
    );

    return (
        <div className="absolute inset-0 overflow-y-auto bg-white">
            <ProfileTop />
            <main className="relative flex flex-col gap-[22px] px-4 pb-10 pt-4 md:px-10 md:pt-1">
                <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-3">
                    <div className="flex min-w-0 flex-col items-start gap-2">
                        <div className="flex max-w-full items-center gap-1.5 text-[13px] font-semibold text-sunny-text-on-white">
                            <UserRound aria-hidden="true" className="size-3.5 flex-none" strokeWidth={2.2} />
                            <span className="truncate">Signed in as {email ?? userInfo.name}</span>
                        </div>
                        <h1 className="m-0 text-[32px] font-semibold leading-[1.2] tracking-[-0.01em] max-md:text-[26px]">Profile</h1>
                    </div>
                    <div className="max-md:hidden">{signOut}</div>
                </div>

                <div className="grid grid-cols-[repeat(auto-fit,minmax(min(380px,100%),1fr))] items-start gap-5">
                    <PersonalInfoCard
                        name={name}
                        email={email}
                        emailVerified={userInfo.emailVerified}
                        memberSince={profile?.memberSince}
                        onSaveName={saveName}
                    />
                    <SecurityCard />
                    <div className="flex min-w-0 flex-col gap-5">
                        <PlanCard drivesCount={drivesCount} />
                        <ActivityCard />
                    </div>
                </div>

                <div className="self-start md:hidden">{signOut}</div>
            </main>
        </div>
    );
}
