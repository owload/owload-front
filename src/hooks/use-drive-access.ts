import { useCallback, useEffect, useState } from "react";
import { RestAccessBackend, type AddPersonResult, type DriveAccess } from "@/engine/backend/access-backend";
import type { DriveId, DriveRole, DriveVisibility } from "@/engine/backend/drive-backend";

const backend = new RestAccessBackend();

/** Who can open a drive, and changing that. `access` is undefined until it arrives. Each change rejects when the backend refuses it. */
export function useDriveAccess(driveId: DriveId | undefined) {
    const [access, setAccess] = useState<DriveAccess | undefined>();
    const [failed, setFailed] = useState(false);

    const reload = useCallback(async () => {
        if (!driveId) return;
        try {
            setAccess(await backend.getAccess(driveId));
            setFailed(false);
        } catch {
            setFailed(true);
        }
    }, [driveId]);

    useEffect(() => { setAccess(undefined); void reload(); }, [reload]);

    const setVisibility = useCallback(async (visibility: DriveVisibility) => {
        setAccess(await backend.setVisibility(driveId!, visibility));
    }, [driveId]);

    const resetLink = useCallback(async () => {
        setAccess(await backend.resetPublicLink(driveId!));
    }, [driveId]);

    const addPerson = useCallback(async (email: string, role: DriveRole): Promise<AddPersonResult> => {
        const result = await backend.addPerson(driveId!, email, role);
        await reload();
        return result;
    }, [driveId, reload]);

    const changeRole = useCallback(async (personId: string, role: DriveRole) => {
        await backend.changeRole(driveId!, personId, role);
        await reload();
    }, [driveId, reload]);

    const removePerson = useCallback(async (personId: string) => {
        await backend.removePerson(driveId!, personId);
        await reload();
    }, [driveId, reload]);

    const leave = useCallback(() => backend.leaveDrive(driveId!), [driveId]);

    return { access, failed, reload, setVisibility, resetLink, addPerson, changeRole, removePerson, leave };
}
