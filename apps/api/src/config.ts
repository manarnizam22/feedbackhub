/* Environment-driven configuration with dev defaults matching the compose stack.
   Every value here is overridable via env — the k8s manifests set them. */
export const config = {
  port: Number(process.env.PORT ?? 3010),
  corsOrigin: process.env.CORS_ORIGIN ?? 'http://localhost:4200',
  keycloak: {
    issuer: process.env.KEYCLOAK_ISSUER ?? 'http://localhost:8080/realms/feedbackhub',
    /* in k8s the browser-facing issuer is not resolvable from inside the
       cluster; JWKS is fetched via this internal URL while token issuer
       validation stays on the public issuer string */
    internalUrl: process.env.KEYCLOAK_INTERNAL_URL ?? null,
    audience: process.env.API_AUDIENCE ?? 'feedbackhub-api',
  },
} as const;
