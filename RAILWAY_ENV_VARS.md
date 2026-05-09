# Railway Environment Variables Reference
# Set these in Railway dashboard for each service

# API Server (.env)
DATABASE_URL=postgresql://[user]:[password]@[host]:[port]/[database]
JWT_SECRET=[generate-with: openssl rand -base64 32]
NODE_ENV=production
PORT=8080

# CBT Portal (.env)
VITE_API_BASE_URL=https://[api-server-url].up.railway.app
PUBLIC_API_URL=https://[api-server-url].up.railway.app

# Notes:
# - DATABASE_URL: Get from Railway PostgreSQL service variables after creation
# - JWT_SECRET: Generate a secure random string
# - API Server URL: Available after api-server deploys (format: https://[service-name]-[environment].up.railway.app)
