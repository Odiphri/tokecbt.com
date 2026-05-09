# Railway Deployment - Quick Start (Manual Steps)

## ✅ Completed
- Railway CLI installed (v4.57.1)
- Configuration files created:
  - `railway.json` (reference configuration)
  - `RAILWAY_ENV_VARS.md` (environment variables guide)
  - `RAILWAY_DEPLOYMENT.md` (detailed deployment steps)
- Git commit created (commit: a50ff9e)

## 🚀 Next Steps (DO THIS IN RAILWAY DASHBOARD)

### 1. Create Railway Project
- Go to https://railway.app
- Click "New Project" 
- Click "Deploy from GitHub"
- Select this repository
- Railway will detect the Dockerfiles automatically

### 2. Configure api-server Service
- Click "api-server" service
- Go to "Variables" tab
- Add these variables:
  ```
  DATABASE_URL=postgresql://postgres:password@helium/heliumdb?sslmode=disable
  JWT_SECRET=[GENERATE: run `openssl rand -base64 32` and paste output]
  NODE_ENV=production
  PORT=8080
  ```
- Save variables

### 3. Deploy api-server
- Push this commit to GitHub (if using Git integration)
  - OR manually trigger deploy in Railway dashboard
- Wait for deployment to complete (watch the Deployments tab)
- Once deployed, note the public URL (e.g., `https://api-server-production.up.railway.app`)

### 4. Configure cbt-portal Service
- Click "cbt-portal" service
- Go to "Variables" tab
- Add:
  ```
  VITE_API_BASE_URL=[api-server-url from step 3]
  PUBLIC_API_URL=[api-server-url from step 3]
  ```
- Example:
  ```
  VITE_API_BASE_URL=https://api-server-production.up.railway.app
  PUBLIC_API_URL=https://api-server-production.up.railway.app
  ```

### 5. Deploy cbt-portal
- Push changes or trigger manual deploy
- Wait for deployment to complete

### 6. Run Database Migrations (if needed)
- In api-server service, open "Terminal"
- Run: `pnpm --filter @workspace/api-server run migrate`
- Or check if migrations run automatically on startup

### 7. Test Deployment
- Visit api-server URL: Check `/health` endpoint
- Visit cbt-portal URL: Verify login page loads
- Test authentication flow

## 📋 Generated Files
- [RAILWAY_DEPLOYMENT.md](./RAILWAY_DEPLOYMENT.md) — Full deployment guide
- [RAILWAY_ENV_VARS.md](./RAILWAY_ENV_VARS.md) — Environment variables reference
- [railway.json](./railway.json) — Configuration template

## ⚠️ Important Notes
- **Secrets**: JWT_SECRET and DATABASE_URL are sensitive—set them only in Railway dashboard, not in code
- **API URL**: After api-server deploys, you MUST get its URL and update cbt-portal env vars
- **Database**: Railway PostgreSQL auto-generates credentials—use the provided DATABASE_URL
- **Domains**: You can add custom domains later in Railway settings

## 🔗 Links
- Railway Dashboard: https://railway.app
- GitHub Integration Guide: https://docs.railway.app/guides/github
- Environment Variables: https://docs.railway.app/reference/variables
