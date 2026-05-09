---
name: publish-railway
description: "Publish this monorepo to Railway with a step-by-step deployment workflow for api-server and cbt-portal."
argument-hint: "Railway project name and optional deployment target (backend/frontend/both)."
disable-model-invocation: true
---

This skill describes how to publish this workspace to Railway.
It is optimized for the current monorepo structure, where:
- `artifacts/api-server` is the production API backend
- `artifacts/cbt-portal` is the Vite React frontend

## When to use

Use this skill when you want to deploy the app to Railway as a Railway project, including backend and/or frontend hosting.

## Deployment model

1. Choose a deployment strategy:
   - **Backend only:** Deploy `artifacts/api-server` to Railway and host the frontend separately.
   - **Full app on Railway:** Deploy two Railway services: one for `api-server` and one for `cbt-portal`.
   - **Static frontend elsewhere:** Build `artifacts/cbt-portal` and host the static output on a CDN or static hosting provider.

## Step 1: Prepare the app locally

1. Install dependencies at the repo root with pnpm:
   - `pnpm install`

2. Verify each package builds:
   - `pnpm --filter @workspace/api-server run typecheck`
   - `pnpm --filter @workspace/api-server run build`
   - `pnpm --filter @workspace/cbt-portal run typecheck`
   - `pnpm --filter @workspace/cbt-portal run build`

3. Verify the backend start command works:
   - `cd artifacts/api-server`
   - `pnpm run build`
   - `pnpm run start`

4. Verify the frontend build locally:
   - `cd artifacts/cbt-portal`
   - `pnpm run build`
   - `pnpm run serve`

## Step 2: Create Railway services

### API service

1. Navigate to the backend folder:
   - `cd artifacts/api-server`

2. Initialize Railway for the backend:
   - `railway init --name <railway-api-service-name>`

3. Choose `Node.js` if Railway prompts for a template.

4. Deploy the backend:
   - `railway up`

Railway should detect the backend as a Node service.
If it does not, use a Dockerfile or a `Procfile` that starts the backend with:
- `pnpm run build && pnpm run start`

### Frontend service

1. Navigate to the frontend folder:
   - `cd artifacts/cbt-portal`

2. Initialize Railway for the frontend:
   - `railway init --name <railway-frontend-service-name>`

3. Deploy the frontend. Railway can host a static site if the service is configured to:
   - build with `pnpm run build`
   - serve the static output with `pnpm run serve`

If Railway does not auto-detect the Vite frontend, use a simple `start` script or a Dockerfile.

## Recommended sample files

This repo now includes example deployment files to make Railway deployment more reliable:
- `artifacts/api-server/Dockerfile` — builds the backend from the monorepo and runs `dist/index.mjs`
- `artifacts/cbt-portal/Dockerfile` — builds the Vite app and serves it with `nginx`
- `railway.example.json` — a sample Railway service configuration template with placeholder service and environment entries
- `.dockerignore` — keeps Docker build context small for both service images

Use these files as templates for Railway service setup or local Docker deployment.

## Step 3: Configure environment variables

Set these values in Railway settings for the backend service:
- `NODE_ENV=production`
- `PORT=8080`
- `DATABASE_URL` (or your database connection string)
- `JWT_SECRET`
- any other required secrets used by `artifacts/api-server`

For the frontend service, set the API endpoint used by the app:
- `VITE_API_BASE_URL` or `PUBLIC_API_URL`

## Step 4: Validate the deployment

1. Confirm the backend health endpoint works.
2. Confirm the frontend loads in the browser.
3. Confirm the frontend can call the backend API.
4. Check Railway logs for build or startup errors.

## Helpful notes

- Railway deploys from the current service folder by default.
- In a pnpm monorepo, Railway may need a Dockerfile for reliable builds.
- The backend already has a production `build` and `start` workflow in `artifacts/api-server/package.json`.
- The frontend has a Vite `build` and a preview `serve` command in `artifacts/cbt-portal/package.json`.

## Next steps

If this deployment succeeds, the next useful skills are:
- `deploy-railway-backend` for backend-specific Railway deployment best practices
- `deploy-static-frontend` for hosting the built frontend from `artifacts/cbt-portal`
- `railway-env-sync` for managing Railway environment variables and secrets
