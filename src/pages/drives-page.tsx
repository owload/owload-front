
import { DriveBlock } from "@/components/drives/drive-block";
import { EmptyDrivesArea } from "@/components/drives/empty-drives-area";
import { DrivesToolboxBottom } from "@/components/toolbox-bottom/drives-toolbox-bottom";
import { DebouncedSkeleton } from "@/components/ui/debounced-skeleton";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useCloseAllDrives } from "@/hooks/use-close-drives";
import { useFilesStore } from "@/stores/files-store";
import { useEffect } from "react";
import { useSearchParams } from "react-router-dom";

export function DrivesPage() {
    const drives = useFilesStore((state) => state.drives);
    const drivesInitialized = useFilesStore((state) => state.drivesInitialized);
    const closeAllDrives = useCloseAllDrives();

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

    return (
        <div className='absolute top-10 bottom-0 inset-x-0'>
            <div className="absolute top-41 z-40 right-3 lg:right-29 left-3 lg:left-16 h-1 border-b-1 border-gray-100"></div>
            <main className='absolute inset-0 select-none'>
                <div className="top-12 bg-white z-10 flex items-center px-10 py-14 h-15">
                    <div className='flex-1 flex items-center gap-2 h-full'>
                        <h1 className="font-montserrat text-3xl font-bold">My drives</h1>
                    </div>
                </div>

                <div className="pt-2 pb-12 px-3 lg:px-15 w-full">
                    <Tabs defaultValue="all" className="w-full">
                        <TabsList className="grid lg:w-[650px] grid-cols-5">
                            <TabsTrigger value="all">All</TabsTrigger>
                            <TabsTrigger value="private">Private</TabsTrigger>
                            <TabsTrigger value="shared">Shared</TabsTrigger>
                            <TabsTrigger value="external">External</TabsTrigger>

                        </TabsList>
                        <TabsContent value="all" className=" w-full">
                            <div className="relative flex flex-wrap flex-col md:flex-row gap-4  w-full">
                                {drivesInitialized && drives.length === 0 && <EmptyDrivesArea />}
                                <DebouncedSkeleton
                                    contentInitialized={drivesInitialized}
                                    initializedComponent={
                                        <>
                                            {(drives).map((c) => (
                                                <div key={c.id}>
                                                    <DriveBlock driveInfo={c}></DriveBlock>
                                                </div>
                                            ))}
                                        </>
                                    }
                                    skeletonComponent={(
                                        [...Array(3)]).map((_, i) => (
                                            <Skeleton key={i} className="w-full md:w-100 h-60"></Skeleton>
                                        )
                                        )}
                                ></DebouncedSkeleton>
                            </div>


                        </TabsContent>
                        <TabsContent value="private">
                            lalala
                        </TabsContent>
                    </Tabs>
                </div>
                <DrivesToolboxBottom className="fixed bottom-4 right-4" />
            </main>
        </div>
    );
}
