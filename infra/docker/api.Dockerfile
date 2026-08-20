# Build stage — full workspace; also used as the tools image for the k8s
# migrate/seed Job (has pnpm + drizzle-kit + source).
FROM node:24-alpine AS build
WORKDIR /repo
RUN corepack enable
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY packages ./packages
COPY apps/api ./apps/api
RUN pnpm install --frozen-lockfile --filter '!web'
RUN pnpm --filter @feedbackhub/types --filter @feedbackhub/auth --filter @feedbackhub/db run build \
  && pnpm --filter @feedbackhub/api run build
RUN pnpm --filter @feedbackhub/api deploy --prod --legacy /out

# Runtime — the deployed prod bundle only.
FROM node:24-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /out ./
EXPOSE 3010
USER node
CMD ["node", "dist/main.js"]
