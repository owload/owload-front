import { deleteApiCall, getApiCall, patchApiCall, postApiCall, putApiCall } from "../api/api";
import type { DriveId, DriveRole, DriveVisibility, MyDriveRole } from "./drive-backend";

/** Someone a drive is shared with. `invited` is a person who has no verified account with that email yet: the drive reaches them when they sign in with it. */
export interface DrivePerson {
    /** The user id of a member, or the id of the invitation. */
    id: string;
    status: "member" | "invited";
    email: string;
    name: string | null;
    role: DriveRole;
    since: string | null;
}

export interface DriveAccess {
    visibility: DriveVisibility;
    myRole: MyDriveRole;
    /** The link of a public drive; only the owner and the admins get it. */
    publicLink: string | null;
    /** Only the owner and the admins get the list. */
    people: DrivePerson[];
    /** Whether the backend can send the invitations by mail itself. */
    mailEnabled: boolean;
}

export interface AddPersonResult {
    person: DrivePerson;
    emailSent: boolean;
    /** The address of the app, for the person to be sent to when no mail went out. */
    appUrl: string;
}

export abstract class AccessBackend {
    abstract getAccess(driveId: DriveId): Promise<DriveAccess>;
    abstract setVisibility(driveId: DriveId, visibility: DriveVisibility): Promise<DriveAccess>;
    abstract resetPublicLink(driveId: DriveId): Promise<DriveAccess>;
    abstract addPerson(driveId: DriveId, email: string, role: DriveRole): Promise<AddPersonResult>;
    abstract changeRole(driveId: DriveId, personId: string, role: DriveRole): Promise<DrivePerson>;
    abstract removePerson(driveId: DriveId, personId: string): Promise<void>;
    abstract leaveDrive(driveId: DriveId): Promise<void>;
}

export class RestAccessBackend implements AccessBackend {
    getAccess(driveId: DriveId): Promise<DriveAccess> {
        return getApiCall(`/drives/${driveId}/access`);
    }

    setVisibility(driveId: DriveId, visibility: DriveVisibility): Promise<DriveAccess> {
        return putApiCall(`/drives/${driveId}/access/visibility`, { visibility });
    }

    resetPublicLink(driveId: DriveId): Promise<DriveAccess> {
        return postApiCall(`/drives/${driveId}/access/link/reset`);
    }

    addPerson(driveId: DriveId, email: string, role: DriveRole): Promise<AddPersonResult> {
        return postApiCall(`/drives/${driveId}/access/people`, { email, role });
    }

    changeRole(driveId: DriveId, personId: string, role: DriveRole): Promise<DrivePerson> {
        return patchApiCall(`/drives/${driveId}/access/people/${encodeURIComponent(personId)}`, { role });
    }

    removePerson(driveId: DriveId, personId: string): Promise<void> {
        return deleteApiCall(`/drives/${driveId}/access/people/${encodeURIComponent(personId)}`);
    }

    leaveDrive(driveId: DriveId): Promise<void> {
        return deleteApiCall(`/drives/${driveId}/access/me`);
    }
}

/** What a viewer needs to set a public drive up (GET /public/{token}); the owner is shown by name, nobody else is. */
export interface PublicDriveInfo {
    id: DriveId;
    title: string;
    keyNonce: string;
    counterNonce: string;
    createdTimestamp: number;
    dataLength: number;
    ownerName: string | null;
}

/** Reads the description of a public drive; rejects with a 404 for a link that does not work (wrong, old or turned off). */
export function getPublicDriveInfo(token: string): Promise<PublicDriveInfo> {
    return getApiCall(`/public/${encodeURIComponent(token)}`);
}
