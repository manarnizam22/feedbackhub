import Keycloak from 'keycloak-js';

import { env } from './env';

export const keycloak = new Keycloak({
  url: env.keycloakUrl,
  realm: 'feedbackhub',
  clientId: 'feedbackhub-web',
});

/* login-required: this is an internal tool — there is no anonymous state.
   Registration, password reset and Google sign-in all live on Keycloak's pages.
   The session iframe polls Keycloak's session state, so a session terminated
   in the admin console logs the SPA out within seconds; independent of that,
   access tokens die at their (short) expiry — stateless JWTs cannot be
   revoked mid-flight, only outlived. */
const SESSION_HEARTBEAT_MS = 10_000;

export async function initKeycloak(): Promise<void> {
  keycloak.onAuthLogout = () => {
    void keycloak.login();
  };
  keycloak.onTokenExpired = () => {
    void keycloak.updateToken(30).catch(() => keycloak.login());
  };
  await keycloak.init({
    onLoad: 'login-required',
    pkceMethod: 'S256',
    checkLoginIframe: true,
    checkLoginIframeInterval: 5,
  });
  startSessionHeartbeat();
}

/* The status iframe depends on third-party cookie policy; this does not: a
   forced token refresh round-trips to Keycloak, so a session terminated in the
   admin console fails the very next beat and the user lands back on login.
   Cost: one lightweight refresh call per 10s per tab — acceptable for an
   internal tool in exchange for deterministic session revocation. */
function startSessionHeartbeat(): void {
  setInterval(() => {
    void keycloak.updateToken(-1).catch(() => keycloak.login());
  }, SESSION_HEARTBEAT_MS);
}

export function logout(): void {
  void keycloak.logout({ redirectUri: window.location.origin });
}
