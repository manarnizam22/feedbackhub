import { createRemoteJWKSet, jwtVerify, type JWTPayload } from 'jose';

import { config } from '../config.js';
import type { AuthenticatedUser } from './current-user.decorator.js';

type KeycloakPayload = JWTPayload & {
  email?: string;
  name?: string;
  preferred_username?: string;
  realm_access?: { roles?: string[] };
};

const jwks = createRemoteJWKSet(new URL(`${config.keycloak.issuer}/protocol/openid-connect/certs`));

/* The single JWT verification path — the HTTP guard and the SSE endpoint both
   call this, so there is exactly one place where a token becomes a user. */
export async function verifyAccessToken(token: string): Promise<AuthenticatedUser | null> {
  if (!token) {
    return null;
  }
  try {
    const { payload } = await jwtVerify(token, jwks, {
      issuer: config.keycloak.issuer,
      audience: config.keycloak.audience,
    });
    const claims = payload as KeycloakPayload;
    if (!claims.sub || !claims.email) {
      return null;
    }
    return {
      id: claims.sub,
      email: claims.email,
      displayName: claims.name ?? claims.preferred_username ?? claims.email,
      isAdmin: claims.realm_access?.roles?.includes('admin') ?? false,
    };
  } catch {
    return null;
  }
}
