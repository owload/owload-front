import { deleteApiCall, getApiCall, postApiCall, putApiCall } from "../api/api";

export type UserId = string;

/** The picture of the profile: nothing chosen yet (the client shows a default preset), a preset, or the user's own image. */
export type UserAvatar =
    | { kind: "default" }
    | { kind: "preset", preset: string }
    | { kind: "upload", version: number };

/** A sign-in of the user, as the backend saw it. `current` is the session of this request. */
export interface UserSession {
    id: string,
    device: string,
    mobile: boolean,
    ip: string | null,
    /** ISO date and time. */
    startedAt: string,
    lastSeenAt: string,
    current: boolean
}

/** Something that happened to the account. `details` depends on the kind (a drive's title, how many sessions were signed out). */
export interface UserEvent {
    id: number,
    kind: string,
    /** ISO date and time. */
    at: string,
    ip: string | null,
    device: string | null,
    details: Record<string, unknown>,
    sessionId: string | null,
    currentSession: boolean
}

export interface UserActivityPage {
    items: UserEvent[],
    /** The cursor for the page after this one; null at the end. */
    next: number | null
}

export interface UserBasicInfo {
    userId: UserId,
    email: string,
    name: string,
    /** Left out by the search; the profile of the signed-in user always has them. */
    avatar?: UserAvatar,
    /** When the user started using Owload (an ISO date and time). */
    memberSince?: string,
    /** When the user was last seen before this visit (an ISO date and time); null the first time. */
    lastSeen?: string | null
};

export type SaveUserBasicInfoRequest = Pick<UserBasicInfo, "name">;

export abstract class UserBackend {
    public abstract saveUserBasicInfo(userInfo: SaveUserBasicInfoRequest): Promise<void>;
    public abstract getUserBasicInfo(): Promise<UserBasicInfo>;
    public abstract findUsers(search: string): Promise<UserBasicInfo[]>;
    public abstract setAvatarPreset(preset: string): Promise<void>;
    public abstract uploadAvatarImage(image: Blob): Promise<void>;
    public abstract getAvatarImage(): Promise<Blob>;
    public abstract resetAvatar(): Promise<void>;
    public abstract getSessions(): Promise<UserSession[]>;
    public abstract revokeSession(sessionId: string): Promise<void>;
    public abstract revokeOtherSessions(): Promise<void>;
    public abstract endCurrentSession(): Promise<void>;
    public abstract getActivity(limit: number, before?: number, kinds?: string[]): Promise<UserActivityPage>;
}

export class RestUserBackend implements UserBackend {
    async findUsers(search: string): Promise<UserBasicInfo[]> {
        return getApiCall(`/userinfo/search/${search}`)
    }

    async getUserBasicInfo(): Promise<UserBasicInfo> {
        return getApiCall(`/userinfo`);
    }

    async saveUserBasicInfo(userInfo: SaveUserBasicInfoRequest): Promise<void> {
        return postApiCall(`/userinfo`, userInfo);
    }

    async setAvatarPreset(preset: string): Promise<void> {
        return putApiCall(`/userinfo/avatar/preset`, { preset });
    }

    async uploadAvatarImage(image: Blob): Promise<void> {
        return putApiCall(`/userinfo/avatar/image`, image);
    }

    async getAvatarImage(): Promise<Blob> {
        const bytes = await getApiCall<ArrayBuffer>(`/userinfo/avatar`, "arraybuffer");
        return new Blob([bytes]);
    }

    async resetAvatar(): Promise<void> {
        return deleteApiCall(`/userinfo/avatar`);
    }

    async getSessions(): Promise<UserSession[]> {
        return getApiCall(`/userinfo/sessions`);
    }

    async revokeSession(sessionId: string): Promise<void> {
        return deleteApiCall(`/userinfo/sessions/${encodeURIComponent(sessionId)}`);
    }

    async revokeOtherSessions(): Promise<void> {
        return deleteApiCall(`/userinfo/sessions/others`);
    }

    async endCurrentSession(): Promise<void> {
        return deleteApiCall(`/userinfo/sessions/current`);
    }

    async getActivity(limit: number, before?: number, kinds?: string[]): Promise<UserActivityPage> {
        const query = new URLSearchParams({ limit: String(limit) });
        if (before !== undefined) query.set("before", String(before));
        for (const kind of kinds ?? []) query.append("kind", kind);
        return getApiCall(`/userinfo/activity?${query}`);
    }
}
