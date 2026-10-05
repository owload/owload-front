import { ClosedDriveRow } from "@/components/drives/closed-drive-row";
import { DrivesFilter, DrivesHero, EmptyDrivesHero } from "@/components/drives/drives-hero";
import { getDriveKind } from "@/components/drives/drive-kind";
import { NoDrives } from "@/components/drives/no-drives";
import { OpenDriveCard } from "@/components/drives/open-drive-card";
import { DebouncedSkeleton } from "@/components/ui/debounced-skeleton";
import { Skeleton } from "@/components/ui/skeleton";
import { useCloseAllDrives } from "@/hooks/use-close-drives";
import { useCurrentUserId } from "@/hooks/use-current-user-id";
import { useFilesStore } from "@/stores/files-store";
import { Lock } from "lucide-react";
import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";

export function DrivesPage() {
    const drives = useFilesStore((state) => state.drives);
    const drivesInitialized = useFilesStore((state) => state.drivesInitialized);
    const driveKeys = useFilesStore((state) => state.driveKeys);
    const closeAllDrives = useCloseAllDrives();
    const currentUserId = useCurrentUserId();
    const [filter, setFilter] = useState<DrivesFilter>("all");

    const [searchParams, setSearchParams] = useSearchParams();
    const closeAllDrivesParam = searchParams.get("closeAllDrives");

    useEffect(() => {
        if (closeAllDrivesParam) {
            setTimeout(() => {
                closeAllDrives();
                setSearchParams({}); // Clear the search param after closing drives
            }, 0);
        }
    }, []);

    const entries = drives.map((driveInfo) => ({ driveInfo, kind: getDriveKind(driveInfo, currentUserId), open: driveKeys[driveInfo.id] != null }));
    const counts: Record<DrivesFilter, number> = {
        all: entries.length,
        private: entries.filter((e) => e.kind === "private").length,
        shared: entries.filter((e) => e.kind === "shared").length,
    };
    const shown = entries.filter((e) => filter === "all" || e.kind === filter);
    const openDrives = shown.filter((e) => e.open);
    const closedDrives = shown.filter((e) => !e.open);
    const noDrives = drivesInitialized && drives.length === 0;

    return (
        <div className="absolute inset-0 overflow-y-auto">
            {noDrives
                ? <EmptyDrivesHero />
                : <DrivesHero
                    total={drives.length}
                    openCount={entries.filter((e) => e.open).length}
                    filter={filter}
                    counts={counts}
                    onFilter={setFilter}
                    onCloseAll={closeAllDrives}
                />}
            <main className="relative -mt-14 flex select-none flex-col gap-4 px-5 pb-8 md:-mt-16 md:px-10 md:pb-10">
                {noDrives && <NoDrives />}
                {!noDrives && (
                    <DebouncedSkeleton
                        contentInitialized={drivesInitialized}
                        initializedComponent={<>
                            {openDrives.map(({ driveInfo, kind }) => <OpenDriveCard key={driveInfo.id} driveInfo={driveInfo} kind={kind} />)}
                            {openDrives.length === 0 && (
                                <div className="flex items-center gap-3 rounded-[20px] bg-sunny-ink p-5 font-semibold text-white shadow-[0_24px_40px_-24px_rgba(26,26,25,0.55)] md:p-6 md:shadow-[0_28px_48px_-28px_rgba(26,26,25,0.55)]">
                                    <Lock aria-hidden="true" className="size-[18px] text-sunny-yellow" strokeWidth={1.8} />
                                    No drive is open.
                                </div>
                            )}
                            {closedDrives.length > 0 && <>
                                <h2 className="m-0 mt-5 self-start rounded-lg bg-sunny-yellow px-3 py-1 text-[13px] font-extrabold uppercase tracking-widest">Closed · {closedDrives.length}</h2>
                                <div className="flex flex-col gap-2">
                                    {closedDrives.map(({ driveInfo }) => <ClosedDriveRow key={driveInfo.id} driveInfo={driveInfo} />)}
                                </div>
                            </>}
                        </>}
                        skeletonComponent={<>
                            <Skeleton className="h-40 w-full rounded-[20px]" />
                            <Skeleton className="h-16 w-full rounded-[14px]" />
                            <Skeleton className="h-16 w-full rounded-[14px]" />
                        </>}
                    />
                )}
            </main>
        </div>
    );
}
