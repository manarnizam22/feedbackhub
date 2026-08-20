# Build stage — Angular production bundle.
FROM node:24-alpine AS build
WORKDIR /repo
RUN corepack enable
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY packages/types ./packages/types
COPY packages/auth ./packages/auth
COPY apps/web ./apps/web
RUN pnpm install --frozen-lockfile --filter web --filter @feedbackhub/types --filter @feedbackhub/auth
RUN pnpm --filter @feedbackhub/types --filter @feedbackhub/auth run build \
  && pnpm --filter web run build

# Runtime — nginx serving the SPA; entrypoint writes env.js from environment so
# one image serves every environment (no rebuild per env).
FROM nginx:1.27-alpine
COPY infra/docker/web-nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /repo/apps/web/dist/web/browser /usr/share/nginx/html
COPY infra/docker/web-entrypoint.sh /docker-entrypoint.d/40-env.sh
RUN chmod +x /docker-entrypoint.d/40-env.sh
EXPOSE 80
