import Keycloak, { KeycloakConfig, KeycloakInitOptions } from "keycloak-js"
import { createContext, ReactNode, useContext, useEffect, useState } from "react";
import { globalOptions } from "@/global-options";
import { generateRsaKeys, importPrivateKey, PkiService, RestPkiBackend, RestUserBackend } from "@/engine";
import axios from "axios";
import { UserInfo } from "./types/types";

const keycloakConfig: KeycloakConfig = {
    url: globalOptions.APP_KEYCLOAK_URL,
    clientId: globalOptions.APP_KEYCLOAK_CLIENT_ID,
    realm: globalOptions.APP_KEYCLOAK_REALM
}

const keycloakInitOptions: KeycloakInitOptions = {
    onLoad: "check-sso"
};

const TOKEN_REFRESH_INTERVAL_MS = 6000;


const keycloakInstance = new Keycloak(keycloakConfig);

interface AuthContextProviderProps {
    authenticatedChild?: ReactNode | undefined,
    anonymousChild?: ReactNode | undefined
}

type AuthStatus = "NOT_INITIALIZED" | "PENDING" | "AUTHENTICATED" | "ANONYMOUS";

const KeycloakContext = createContext<Keycloak>(keycloakInstance);
const emptyUserInfo: UserInfo = { id: "", name: "", privateKey: undefined };
const UserInfoContext = createContext<UserInfo>(emptyUserInfo);

async function getPrivateKeys() {
    const pkiBackend = new RestPkiBackend()
    const userBackend = new RestUserBackend()
    const pkiService = new PkiService(pkiBackend);
    let userKeys = await pkiService.getUserRsaKeys();
    if (userKeys.length == 0) {
        // user's first login

        const { privateKeyBase64, publicKeyBase64 } = await generateRsaKeys();
        await pkiService.registerUserRsaKeys(publicKeyBase64, privateKeyBase64);
        await userBackend.saveUserBasicInfo({ name: "" })
        userKeys = await pkiService.getUserRsaKeys();
    }
    return await importPrivateKey(userKeys[0].privateKeyBase64);
}

export function AuthContextProvider({ authenticatedChild, anonymousChild }: AuthContextProviderProps) {
    const [keycloak] = useState<Keycloak>(keycloakInstance);
    const [userInfo, setUserInfo] = useState<UserInfo>({ id: "", name: "", privateKey: undefined });
    const [authStatus, setAuthStatus] = useState<AuthStatus>("NOT_INITIALIZED");

    useEffect(() => {
        let intervalId: ReturnType<typeof setInterval>;
        setAuthStatus("PENDING");
        keycloak.init(keycloakInitOptions).then(() => {
            if (!keycloak.authenticated) {
                setAuthStatus("ANONYMOUS");
                return;
            }
            setFetchInterceptor(() => "" + keycloak.token);

            intervalId = setInterval(() => {
                if (!keycloakInstance.authenticated) {
                    return;
                }
                const tokenMinValiditySeconds = TOKEN_REFRESH_INTERVAL_MS / 1000 + 1;
                keycloak.updateToken(tokenMinValiditySeconds);
            }, TOKEN_REFRESH_INTERVAL_MS);

            getPrivateKeys().then(pk => {
                setUserInfo({
                    id: keycloak.tokenParsed?.sub!,
                    name: keycloak.tokenParsed?.preferred_username,
                    privateKey: pk
                });
                setAuthStatus("AUTHENTICATED");
            })
        });
        return () => {
            if (intervalId) {
                clearInterval(intervalId);
            }
        }
    }, []);

    return (
        <KeycloakContext.Provider value={keycloak}>
            <UserInfoContext.Provider value={userInfo}>
                {authStatus === "AUTHENTICATED" && authenticatedChild}
                {authStatus === "ANONYMOUS" && anonymousChild}
            </UserInfoContext.Provider>
        </KeycloakContext.Provider>
    );
}

type TokenGetter = () => string;
function setFetchInterceptor(token: TokenGetter) {
    axios.defaults.baseURL = globalOptions.APP_MAIN_BACKEND_URL;
    axios.interceptors.request.use(function (config) {
        config.headers['x-access-token'] = token();
        return config;
    });
}

export function useLogin(): () => Promise<void> {
    return useContext(KeycloakContext).login;
}

export function useRegister(): () => Promise<void> {
    return useContext(KeycloakContext).register;
}


export function useLogout(): () => Promise<void> {
    return useContext(KeycloakContext).logout;
}

export function useUserInfo(): UserInfo {
    return useContext(UserInfoContext);
}
