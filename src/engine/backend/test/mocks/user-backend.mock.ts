import { UserBackend, UserId, UserBasicInfo, SaveUserBasicInfoRequest } from "../../user-backend";
import { getTestUserId, getTestUserEmail } from "./test-user-info";

export class MockUserBackend implements UserBackend {
    private readonly usersMap = new Map<UserId, UserBasicInfo>();

    constructor() {
        this.usersMap.set("1", {
            userId: "1",
            email: "alice@example.com",
            name: "Alice Doe"
        });
        this.usersMap.set("2", {
            userId: "2",
            email: "bob@example.com",
            name: "Bob Doe"
        });
    }

    async findUsers(search: string): Promise<UserBasicInfo[]> {
        const res = [];
        for (let userBasicInfo of this.usersMap.values()) {
            if (userBasicInfo.email === search) {
                res.push(userBasicInfo);
            }
        }
        return res;
    }

    async getUserBasicInfo(): Promise<UserBasicInfo> {
        const userId = getTestUserId();
        const userInfo = this.usersMap.get(userId);
        if (!userInfo) {
            throw new Error("User not found");
        }
        return userInfo;
    }

    async saveUserBasicInfo(userInfo: SaveUserBasicInfoRequest): Promise<void> {
        const userId = getTestUserId();
        const email = getTestUserEmail();
        const userBasicInfo: UserBasicInfo = Object.assign(userInfo, { userId, email });
        this.usersMap.set(userId, userBasicInfo);
    }
}
