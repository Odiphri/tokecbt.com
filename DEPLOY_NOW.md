# 🚀 Railway Deployment - Web Interface Method

Since CLI login is having issues, let's deploy via Railway's web interface:

## Step 1: Create GitHub Repository First
1. Go to https://github.com and sign in
2. Click "New repository"
3. Name it: `tokecbt` (or whatever you prefer)
4. Make it **Public** or **Private** (your choice)
5. **DO NOT** initialize with README, .gitignore, or license
6. Click "Create repository"
7. Copy the repository URL (e.g., `https://github.com/yourusername/tokecbt.git`)

## Step 2: Push Code to GitHub
```bash
# Replace YOUR_USERNAME with your actual GitHub username
git remote add origin https://github.com/YOUR_USERNAME/tokecbt.git
git branch -M main
git push -u origin main
```

## Step 3: Deploy on Railway (Web Interface)
1. Go to https://railway.app/new
2. Sign in with your Railway account
3. Click "Deploy from GitHub"
4. Search for and select your `tokecbt` repository
5. Click "Deploy"

## Step 4: Railway Auto-Detection
Railway will automatically:
- ✅ Detect the `railway.json` configuration
- ✅ Find the Dockerfiles in `artifacts/api-server/` and `artifacts/cbt-portal/`
- ✅ Set up two services: api-server and cbt-portal
- ✅ Use your Replit database (DATABASE_URL is pre-configured)

## Step 5: Configure Environment Variables
After deployment starts:

### For api-server service:
1. Click on "api-server" in Railway dashboard
2. Go to "Variables" tab
3. Add these variables:
   ```
   DATABASE_URL=postgresql://postgres:password@helium/heliumdb?sslmode=disable
   JWT_SECRET=[generate: run `openssl rand -base64 32` in terminal and paste result]
   NODE_ENV=production
   PORT=8080
   ```

### For cbt-portal service:
1. Click on "cbt-portal" in Railway dashboard
2. Go to "Variables" tab
3. Add:
   ```
   VITE_API_BASE_URL=https://[api-server-url].up.railway.app
   PUBLIC_API_URL=https://[api-server-url].up.railway.app
   ```
   (Replace [api-server-url] with the actual URL from api-server deployment)

## Step 6: Redeploy After Variables
- After setting variables, Railway will auto-redeploy
- Or click "Deploy" button on each service

## Step 7: Run Database Setup (Optional)
Once api-server is deployed:
1. Go to api-server service → "Terminal" tab
2. Run: `pnpm --filter @workspace/api-server run migrate`
3. Run: `pnpm --filter @workspace/api-server run seed-admin`

## Step 8: Test
- Visit api-server URL + `/health` (should return OK)
- Visit cbt-portal URL (should load login page)
- Login with: `admin` / `Admin@1234`

## Troubleshooting
- **Build fails**: Check Railway deployment logs
- **Can't connect to DB**: Verify DATABASE_URL and network access to "helium"
- **Portal can't connect**: Ensure VITE_API_BASE_URL is correct

## Alternative: Direct Upload
If GitHub is too much hassle:
1. Zip your entire `tokecbt/` folder
2. Go to https://railway.app/new
3. Choose "Deploy from Archive" instead of GitHub
4. Upload the zip file
5. Continue with steps 4-8 above

---
**Your database data is safe!** The migrations won't overwrite existing tables.