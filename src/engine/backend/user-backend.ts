import { getApiCall, postApiCall } from "../api/api";

export type UserId = string;

export interface UserBasicInfo {
    userId: UserId,
    email: string,
    name: string
};

export type SaveUserBasicInfoRequest = Omit<UserBasicInfo, "userId" | "email">;

export abstract class UserBackend {
    public abstract saveUserBasicInfo(userInfo: SaveUserBasicInfoRequest): Promise<void>;
    public abstract getUserBasicInfo(): Promise<UserBasicInfo>;
    public abstract findUsers(search: string): Promise<UserBasicInfo[]>;
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
}