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

### 2. Add PostgreSQL Database
- **SKIP THIS STEP** - Using existing Replit database instead
- DATABASE_URL is already configured in the code

### 3. Configure api-server Service
- Click "api-server" service
- Go to "Variables" tab
- Add these variables:
  ```
  DATABASE_URL=postgresql://postgres:password@helium/heliumdb?sslmode=disable
  JWT_SECRET=[GENERATE: run `openssl rand -base64 32` and paste output]
  NODE_ENV=production
  PORT=8080
  ```
- **Note**: DATABASE_URL is pre-set to use your existing Replit database with all your data

### 4. Deploy api-server
- Push this commit to GitHub (if using Git integration)
  - OR manually trigger deploy in Railway dashboard
- Wait for deployment to complete (watch the Deployments tab)
- Once deployed, note the public URL (e.g., `https://api-server-production.up.railway.app`)

### 5. Configure cbt-portal Service
- Click "cbt-portal" service
- Go to "Variables" tab
- Add:
  ```
  VITE_API_BASE_URL=[api-server-url from step 4]
  PUBLIC_API_URL=[api-server-url from step 4]
  ```
- Example:
  ```
  VITE_API_BASE_URL=https://api-server-production.up.railway.app
  PUBLIC_API_URL=https://api-server-production.up.railway.app
  ```

### 6. Deploy cbt-portal
- Push changes or trigger manual deploy
- Wait for deployment to complete

### 7. Run Database Migrations (if needed)
- In api-server service, open "Terminal"
- Run: `pnpm --filter @workspace/api-server run migrate` (safe - creates tables if missing, preserves existing data)
- Run: `pnpm --filter @workspace/api-server run seed-admin` (creates default admin: admin/Admin@1234)
- **✅ Your existing Replit data is completely safe**

### 8. Test Deployment
- Visit api-server URL: Check `/health` endpoint
- Visit cbt-portal URL: Verify login page loads
- Test authentication flow

## 📋 Generated Files
- [RAILWAY_DEPLOYMENT.md](./RAILWAY_DEPLOYMENT.md) — Full deployment guide
- [RAILWAY_ENV_VARS.md](./RAILWAY_ENV_VARS.md) — Environment variables reference
- [railway.json](./railway.json) — Configuration template

## ⚠️ Important Notes
- **Database**: Using your existing Replit database - all your data will be preserved
- **Network Access**: Ensure Railway can connect to "helium" host (Replit database)
- **Secrets**: JWT_SECRET is sensitive—generate securely
- **API URL**: After api-server deploys, you MUST get its URL and update cbt-portal env vars
- **SSL**: Database connection has sslmode=disable (may need adjustment for production)

## 🔗 Links
- Railway Dashboard: https://railway.app
- GitHub Integration Guide: https://docs.railway.app/guides/github
- Environment Variables: https://docs.railway.app/reference/variables
