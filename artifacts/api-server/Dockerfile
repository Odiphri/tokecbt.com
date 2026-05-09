# syntax=docker/dockerfile:1

FROM node:20-alpine AS builder
WORKDIR /workspace
RUN corepack enable
COPY . .
RUN pnpm install --frozen-lockfile
RUN pnpm --filter @workspace/api-server run build

FROM node:20-alpine AS runner
WORKDIR /app
COPY --from=builder /workspace/artifacts/api-server/dist ./dist
COPY --from=builder /workspace/artifacts/api-server/package.json ./package.json
ENV NODE_ENV=production
EXPOSE 8080
CMD ["node", "--enable-source-maps", "./dist/index.mjs"]
