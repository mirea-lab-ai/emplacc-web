// Next.js inlines NEXT_PUBLIC_* at build time only via direct property access —
// dynamic access (process.env[name]) stays undefined in the browser.

function trim(value: string | undefined, varName: string): string {
    if (!value) throw new Error(`Missing required public environment variable: ${varName}`);
    return value.replace(/\/+$/, '');
}

export function getApiBaseUrl(): string {
    return trim(process.env.NEXT_PUBLIC_API_BASE_URL, 'NEXT_PUBLIC_API_BASE_URL');
}

export function getKeycloakConfig(): { authUrl: string; realm: string; clientId: string } {
    return {
        authUrl: trim(process.env.NEXT_PUBLIC_KEYCLOAK_AUTH_URL, 'NEXT_PUBLIC_KEYCLOAK_AUTH_URL'),
        realm: trim(process.env.NEXT_PUBLIC_KEYCLOAK_REALM, 'NEXT_PUBLIC_KEYCLOAK_REALM'),
        clientId: trim(process.env.NEXT_PUBLIC_KEYCLOAK_CLIENT_ID, 'NEXT_PUBLIC_KEYCLOAK_CLIENT_ID'),
    };
}
