#!/bin/sh
# Runtime config: the SPA reads window.__env (core/env.ts). One built image,
# any environment.
cat > /usr/share/nginx/html/env.js <<EOF
window.__env = {
  apiUrl: '${WEB_API_URL:-http://localhost:3010}',
  keycloakUrl: '${WEB_KEYCLOAK_URL:-http://localhost:8080}',
};
EOF
