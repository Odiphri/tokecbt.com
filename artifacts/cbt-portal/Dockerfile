# syntax=docker/dockerfile:1

FROM node:20-alpine AS builder
WORKDIR /workspace
RUN corepack enable
COPY . .
RUN pnpm install --frozen-lockfile
RUN pnpm --filter @workspace/cbt-portal run build

FROM nginx:alpine AS runner
COPY --from=builder /workspace/artifacts/cbt-portal/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
