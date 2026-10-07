import { create } from "zustand";
import { RestUserBackend, type UserBasicInfo } from "@/engine/backend/user-backend";

interface UserProfileState {
    /** The profile kept by the backend; undefined until it arrives or if it cannot be fetched. */
    profile?: UserBasicInfo;
    /** An object URL of the picture the user uploaded, when there is one. */
    avatarUrl?: string;
    load: () => Promise<void>;
    saveName: (name: string) => Promise<void>;
    setAvatarPreset: (preset: string) => Promise<void>;
    uploadAvatar: (image: Blob) => Promise<void>;
    resetAvatar: () => Promise<void>;
}

const backend = new RestUserBackend();
let loading: Promise<void> | undefined;
let loadedVersion: number | undefined;

/**
 * The profile of the signed-in user (the name, the email and the picture), shared by the account menu and the profile
 * page so that a change shows in both at once.
 */
export const useUserProfileStore = create<UserProfileState>()((set, get) => {
    async function refresh() {
        const profile = await backend.getUserBasicInfo();
        const avatar = profile.avatar;
        let avatarUrl = get().avatarUrl;
        if (avatar?.kind === "upload") {
            if (avatar.version !== loadedVersion || !avatarUrl) {
                const image = await backend.getAvatarImage();
                if (avatarUrl) URL.revokeObjectURL(avatarUrl);
                avatarUrl = URL.createObjectURL(image);
                loadedVersion = avatar.version;
            }
        } else if (avatarUrl) {
            URL.revokeObjectURL(avatarUrl);
            avatarUrl = undefined;
            loadedVersion = undefined;
        }
        set({ profile, avatarUrl });
    }

    return {
        load() {
            loading ??= refresh().catch(() => undefined).finally(() => { loading = undefined; });
            return loading;
        },
        async saveName(name) {
            await backend.saveUserBasicInfo({ name });
            await refresh();
        },
        async setAvatarPreset(preset) {
            await backend.setAvatarPreset(preset);
            await refresh();
        },
        async uploadAvatar(image) {
            await backend.uploadAvatarImage(image);
            await refresh();
        },
        async resetAvatar() {
            await backend.resetAvatar();
            await refresh();
        },
    };
});
