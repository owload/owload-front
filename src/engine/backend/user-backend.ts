import { deleteApiCall, getApiCall, postApiCall, putApiCall } from "../api/api";

export type UserId = string;

/** The picture of the profile: nothing chosen yet (the client shows a default preset), a preset, or the user's own image. */
export type UserAvatar =
    | { kind: "default" }
    | { kind: "preset", preset: string }
    | { kind: "upload", version: number };

export interface UserBasicInfo {
    userId: UserId,
    email: string,
    name: string,
    /** Left out by the search; the profile of the signed-in user always has them. */
    avatar?: UserAvatar,
    /** When the user started using Owload (an ISO date and time). */
    memberSince?: string
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
}
