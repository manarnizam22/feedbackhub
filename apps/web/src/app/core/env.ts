interface RuntimeEnv {
  apiUrl?: string;
  keycloakUrl?: string;
}

declare global {
  interface Window {
    __env?: RuntimeEnv;
  }
}

/* Dev defaults match the compose stack; deployments override via an env.js
   script written by the container entrypoint — no rebuild per environment. */
export const env = {
  apiUrl: window.__env?.apiUrl ?? 'http://localhost:3000',
  keycloakUrl: window.__env?.keycloakUrl ?? 'http://localhost:8080',
} as const;
