function getRequiredPublicEnv(name: 'NEXT_PUBLIC_API_BASE_URL' | 'NEXT_PUBLIC_KEYCLOAK_AUTH_URL' | 'NEXT_PUBLIC_KEYCLOAK_REALM' | 'NEXT_PUBLIC_KEYCLOAK_CLIENT_ID'): string {
    const value = process.env[name];
    if (!value) {
        throw new Error(`Missing required public environment variable: ${name}`);
    }

    return value;
}

function trimTrailingSlashes(value: string): string {
    return value.replace(/\/+$/, '');
}

export function getApiBaseUrl(): string {
    return trimTrailingSlashes(getRequiredPublicEnv('NEXT_PUBLIC_API_BASE_URL'));
}

export function getKeycloakConfig(): {
    authUrl: string;
    realm: string;
    clientId: string;
} {
    return {
        authUrl: trimTrailingSlashes(getRequiredPublicEnv('NEXT_PUBLIC_KEYCLOAK_AUTH_URL')),
        realm: getRequiredPublicEnv('NEXT_PUBLIC_KEYCLOAK_REALM'),
        clientId: getRequiredPublicEnv('NEXT_PUBLIC_KEYCLOAK_CLIENT_ID'),
    };
}
