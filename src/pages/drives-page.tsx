import { DriveCard } from "@/components/drives/drive-card";
import { DrivesFilter, DrivesHero, EmptyDrivesHero } from "@/components/drives/drives-hero";
import { getDriveKind } from "@/components/drives/drive-kind";
import { NoDrives } from "@/components/drives/no-drives";
import { DebouncedSkeleton } from "@/components/ui/debounced-skeleton";
import { Skeleton } from "@/components/ui/skeleton";
import { useCloseAllDrives } from "@/hooks/use-close-drives";
import { useCurrentUserId } from "@/hooks/use-current-user-id";
import { useFilesStore } from "@/stores/files-store";
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

    const listed = [...openDrives, ...closedDrives];

    return (
        <div className="drives-theme absolute inset-0 overflow-y-auto bg-white">
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
            <main className="relative -mt-10 flex select-none flex-col gap-3 px-4 pb-10 md:px-10">
                {noDrives && <NoDrives />}
                {!noDrives && (
                    <DebouncedSkeleton
                        contentInitialized={drivesInitialized}
                        initializedComponent={<>
                            {listed.map(({ driveInfo, kind }) => <DriveCard key={driveInfo.id} driveInfo={driveInfo} kind={kind} />)}
                            {listed.length === 0 && <p className="m-0 rounded-2xl bg-white p-4 text-sunny-muted shadow-[0_6px_18px_rgba(0,0,0,0.06)]">No drives in this group.</p>}
                        </>}
                        skeletonComponent={<>
                            <Skeleton className="h-[84px] w-full rounded-2xl" />
                            <Skeleton className="h-[84px] w-full rounded-2xl" />
                        </>}
                    />
                )}
            </main>
        </div>
    );
}
