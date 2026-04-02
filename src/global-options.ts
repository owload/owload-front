export interface WindowGlobalOptions {
    APP_MAIN_BACKEND_URL: string;
    APP_KEYCLOAK_URL: string;
    APP_KEYCLOAK_CLIENT_ID: string;
    APP_KEYCLOAK_REALM: string;
};

export const globalOptions = window as unknown as WindowGlobalOptions;
