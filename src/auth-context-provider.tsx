import { createContext, ReactNode, useContext, useEffect, useRef, useState } from "react";
import axios from "axios";
import { globalOptions } from "@/global-options";
import { generateRsaKeys, importPrivateKey, PkiService, RestPkiBackend, RestUserBackend } from "@/engine";
import { UserInfo } from "./types/types";
import Keycloak from "keycloak-js";

export const IS_TAURI = '__TAURI_INTERNALS__' in window;

// --- Shared context ---

type AuthStatus = "PENDING" | "AUTHENTICATED" | "ANONYMOUS";

interface AuthActions {
  login: (username?: string, password?: string) => Promise<void>;
  logout: () => void;
  register: () => void;
}

const emptyUserInfo: UserInfo = { id: "", name: "", privateKey: undefined };
const UserInfoContext = createContext<UserInfo>(emptyUserInfo);
const AuthActionsContext = createContext<AuthActions>({ login: async () => {}, logout: () => {}, register: () => {} });

// --- Shared utilities ---

let axiosInterceptorId: number | null = null;

function setAxiosInterceptor(getToken: () => string) {
  axios.defaults.baseURL = globalOptions.APP_MAIN_BACKEND_URL;
  if (axiosInterceptorId !== null) {
    axios.interceptors.request.eject(axiosInterceptorId);
  }
  axiosInterceptorId = axios.interceptors.request.use(config => {
    config.headers["x-access-token"] = getToken();
    return config;
  });
}

async function getPrivateKeys() {
  const pkiBackend = new RestPkiBackend();
  const userBackend = new RestUserBackend();
  const pkiService = new PkiService(pkiBackend);
  let userKeys = await pkiService.getUserRsaKeys();
  if (userKeys.length === 0) {
    const { privateKeyBase64, publicKeyBase64 } = await generateRsaKeys();
    await pkiService.registerUserRsaKeys(publicKeyBase64, privateKeyBase64);
    await userBackend.saveUserBasicInfo({ name: "" });
    userKeys = await pkiService.getUserRsaKeys();
  }
  return importPrivateKey(userKeys[0].privateKeyBase64);
}

// --- Tauri: ROPC auth provider ---

function parseJwt(token: string): { sub: string; preferred_username: string } {
  const base64 = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
  return JSON.parse(atob(base64));
}

async function keycloakTokenRequest(params: Record<string, string>): Promise<{ access_token: string; refresh_token: string }> {
  const url = `${globalOptions.APP_KEYCLOAK_URL}/realms/${globalOptions.APP_KEYCLOAK_REALM}/protocol/openid-connect/token`;
  const body = new URLSearchParams({ client_id: globalOptions.APP_KEYCLOAK_CLIENT_ID, ...params });
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error_description ?? "Authentication failed");
  }
  return res.json();
}

const TOKEN_REFRESH_INTERVAL_MS = 55_000;
const REFRESH_TOKEN_STORAGE_KEY = "owload_refresh_token";

interface ProviderProps {
  authenticatedChild?: ReactNode;
  anonymousChild?: ReactNode;
}

function TauriAuthProvider({ authenticatedChild, anonymousChild }: ProviderProps) {
  const [authStatus, setAuthStatus] = useState<AuthStatus>("PENDING");
  const [userInfo, setUserInfo] = useState<UserInfo>(emptyUserInfo);
  const accessTokenRef = useRef<string>("");
  const refreshTokenRef = useRef<string>("");

  async function applyTokens(accessToken: string, refreshToken: string) {
    accessTokenRef.current = accessToken;
    refreshTokenRef.current = refreshToken;
    localStorage.setItem(REFRESH_TOKEN_STORAGE_KEY, refreshToken);
    setAxiosInterceptor(() => accessTokenRef.current);
    const parsed = parseJwt(accessToken);
    const privateKey = await getPrivateKeys();
    setUserInfo({ id: parsed.sub, name: parsed.preferred_username, privateKey });
    setAuthStatus("AUTHENTICATED");
  }

  useEffect(() => {
    const storedRefreshToken = localStorage.getItem(REFRESH_TOKEN_STORAGE_KEY);
    if (!storedRefreshToken) {
      setAuthStatus("ANONYMOUS");
      return;
    }
    keycloakTokenRequest({ grant_type: "refresh_token", refresh_token: storedRefreshToken })
      .then(data => applyTokens(data.access_token, data.refresh_token))
      .catch(() => {
        localStorage.removeItem(REFRESH_TOKEN_STORAGE_KEY);
        setAuthStatus("ANONYMOUS");
      });
  }, []);

  useEffect(() => {
    if (authStatus !== "AUTHENTICATED") return;
    const id = setInterval(() => {
      keycloakTokenRequest({ grant_type: "refresh_token", refresh_token: refreshTokenRef.current })
        .then(data => {
          accessTokenRef.current = data.access_token;
          refreshTokenRef.current = data.refresh_token;
          localStorage.setItem(REFRESH_TOKEN_STORAGE_KEY, data.refresh_token);
        })
        .catch(() => logout());
    }, TOKEN_REFRESH_INTERVAL_MS);
    return () => clearInterval(id);
  }, [authStatus]);

  async function login(username?: string, password?: string) {
    const data = await keycloakTokenRequest({ grant_type: "password", username: username!, password: password! });
    await applyTokens(data.access_token, data.refresh_token);
  }

  function logout() {
    accessTokenRef.current = "";
    refreshTokenRef.current = "";
    localStorage.removeItem(REFRESH_TOKEN_STORAGE_KEY);
    setUserInfo(emptyUserInfo);
    setAuthStatus("ANONYMOUS");
  }

  return (
    <AuthActionsContext.Provider value={{ login, logout, register: () => {} }}>
      <UserInfoContext.Provider value={userInfo}>
        {authStatus === "AUTHENTICATED" && authenticatedChild}
        {authStatus === "ANONYMOUS" && anonymousChild}
        {authStatus === "PENDING" && null}
      </UserInfoContext.Provider>
    </AuthActionsContext.Provider>
  );
}

// --- Web: Keycloak redirect auth provider ---

const keycloak = new Keycloak({
  url: globalOptions.APP_KEYCLOAK_URL,
  realm: globalOptions.APP_KEYCLOAK_REALM,
  clientId: globalOptions.APP_KEYCLOAK_CLIENT_ID,
});

function WebAuthProvider({ authenticatedChild, anonymousChild }: ProviderProps) {
  const [authStatus, setAuthStatus] = useState<AuthStatus>("PENDING");
  const [userInfo, setUserInfo] = useState<UserInfo>(emptyUserInfo);

  useEffect(() => {
    keycloak
      .init({ checkLoginIframe: false })
      .then(async (authenticated) => {
        if (authenticated) {
          setAxiosInterceptor(() => keycloak.token ?? "");
          const parsed = keycloak.tokenParsed as { sub: string; preferred_username: string };
          const privateKey = await getPrivateKeys();
          setUserInfo({ id: parsed.sub, name: parsed.preferred_username, privateKey });
          setAuthStatus("AUTHENTICATED");
        } else {
          setAuthStatus("ANONYMOUS");
        }
      })
      .catch(() => setAuthStatus("ANONYMOUS"));

    keycloak.onTokenExpired = () => {
      keycloak.updateToken(60).catch(() => {
        setUserInfo(emptyUserInfo);
        setAuthStatus("ANONYMOUS");
      });
    };
  }, []);

  function logout() { keycloak.logout(); }
  function register() { keycloak.register(); }

  return (
    <AuthActionsContext.Provider value={{ login: async () => { keycloak.login(); }, logout, register }}>
      <UserInfoContext.Provider value={userInfo}>
        {authStatus === "AUTHENTICATED" && authenticatedChild}
        {authStatus === "ANONYMOUS" && anonymousChild}
        {authStatus === "PENDING" && null}
      </UserInfoContext.Provider>
    </AuthActionsContext.Provider>
  );
}

// --- Public API ---

interface AuthContextProviderProps {
  authenticatedChild?: ReactNode;
  anonymousChild?: ReactNode;
}

export function AuthContextProvider({ authenticatedChild, anonymousChild }: AuthContextProviderProps) {
  if (IS_TAURI) {
    return <TauriAuthProvider authenticatedChild={authenticatedChild} anonymousChild={anonymousChild} />;
  }
  return <WebAuthProvider authenticatedChild={authenticatedChild} anonymousChild={anonymousChild} />;
}

export function useLogin(): (username?: string, password?: string) => Promise<void> {
  return useContext(AuthActionsContext).login;
}

export function useLogout(): () => void {
  return useContext(AuthActionsContext).logout;
}

export function useRegister(): () => void {
  return useContext(AuthActionsContext).register;
}

export function useUserInfo(): UserInfo {
  return useContext(UserInfoContext);
}
