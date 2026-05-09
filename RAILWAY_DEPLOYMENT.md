# Railway Deployment Guide

## Overview
This project deploys two services to Railway:
- **api-server**: Node.js/Express backend (port 8080)
- **cbt-portal**: React frontend served by Nginx (port 80)

Both services are configured with Dockerfiles in their respective directories.

## Step 1: Railway Dashboard Setup

1. Go to [railway.app](https://railway.app) and log in
2. Create a new project or select an existing one
3. Add services:
   - **PostgreSQL**: Click "Add Service" → "PostgreSQL"
   - **API Server**: Click "Add Service" → "GitHub Repo" or "Raw Repository", point to this repo
   - **CBT Portal**: Repeat for frontend

## Step 2: Environment Variables

### For api-server service:
1. Go to api-server service → Variables
2. Set the following:
   ```
   DATABASE_URL=postgresql://postgres:[password]@[postgres-host]:5432/[database-name]
   JWT_SECRET=[generate with: openssl rand -base64 32]
   NODE_ENV=production
   PORT=8080
   ```
3. Get DATABASE_URL from PostgreSQL service → Variables (it will show the connection string)
4. For JWT_SECRET, generate: `openssl rand -base64 32` and paste the output

### For cbt-portal service:
1. Go to cbt-portal service → Variables
2. After api-server deploys, get its public URL from its Deployments page
3. Set:
   ```
   VITE_API_BASE_URL=https://[api-server-url].up.railway.app
   PUBLIC_API_URL=https://[api-server-url].up.railway.app
   ```

### For PostgreSQL:
- Railway auto-generates a secure DATABASE_URL
- Copy it to api-server variables
- Optionally create initial database and users if needed

## Step 3: Deploy

### Option A: Git Integration (Recommended)
1. Connect your GitHub repo in Railway dashboard
2. Select the main branch
3. Railway auto-detects Dockerfiles and deploys automatically on push

### Option B: Manual Deploy
1. Use Railway CLI: `railway deploy` from project root
2. Requires authentication and project linking

## Step 4: Database Migrations

After api-server deploys successfully:
1. Go to api-server service
2. Open "Terminal" tab (or use Railway CLI)
3. Run: `pnpm run migrate` (if migration script exists in package.json)
4. Or manually run database setup scripts

## Step 5: Verification

1. **api-server**: Visit the deployment URL and check `/health` endpoint
2. **cbt-portal**: Visit the portal URL and verify it loads
3. Test authentication and basic features

## Troubleshooting

- **Build fails**: Check build logs in Railway dashboard
- **Runtime errors**: Check service logs (click on deployment → logs)
- **Database connection**: Verify DATABASE_URL is correct and PostgreSQL service is running
- **API not connecting**: Ensure VITE_API_BASE_URL points to correct api-server URL

## Directory Structure for Railway
```
tokecbt/
├── artifacts/
│   ├── api-server/
│   │   ├── Dockerfile          ← Used for api-server build
│   │   ├── src/
│   │   └── package.json
│   ├── cbt-portal/
│   │   ├── Dockerfile          ← Used for frontend build
│   │   ├── src/
│   │   └── package.json
├── lib/                         ← Shared libraries
├── pnpm-workspace.yaml          ← Workspace configuration
├── railway.json                 ← Configuration reference
└── RAILWAY_ENV_VARS.md          ← This guide
```

## Notes
- Both services use pnpm workspaces; Railway will install and build accordingly
- Dockerfiles use multi-stage builds for optimized images
- Production node version: Node 20 (Alpine)
- Frontend served via Nginx, backend runs Express.js
