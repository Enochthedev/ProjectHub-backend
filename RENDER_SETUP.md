# 🚀 Quick Render Deployment Guide

## Step 1: Prepare Your Repository
Ensure your backend code is pushed to GitHub with all the configuration files.

## Step 2: Deploy to Render

### Option A: One-Click Blueprint Deployment (Recommended)
1. Go to [render.com](https://render.com) and sign up
2. Click "New" → "Blueprint"
3. Connect your GitHub repository
4. Select the repository containing your backend
5. Render will detect the `render.yaml` file and create all services automatically

### Option B: Manual Setup
1. Create PostgreSQL Database:
   - Name: `project-hub-db`
   - Plan: Starter (Free)

2. Create Redis Instance:
   - Name: `project-hub-redis`
   - Plan: Starter (Free)

3. Create Web Service:
   - Repository: Your GitHub repo
   - Build Command: `./scripts/build.sh`
   - Start Command: `npm run migration:run:prod && npm run start:prod`
   - Plan: Starter (Free)

## Step 3: Configure Environment Variables

### Required (Set in Render Dashboard)
```bash
NODE_ENV=production
PORT=10000
JWT_SECRET=<generate-secure-random-string>
JWT_REFRESH_SECRET=<generate-another-secure-string>
FRONTEND_URL=https://your-frontend-domain.onrender.com
```

### Optional (For Full Features)
```bash
HUGGING_FACE_API_KEY=<your-api-key>
EMAIL_USER=<your-gmail>
EMAIL_PASSWORD=<gmail-app-password>
```

## Step 4: Verify Deployment
1. Wait for deployment to complete (5-10 minutes)
2. Visit: `https://your-service-name.onrender.com/health`
3. Check API docs: `https://your-service-name.onrender.com/api`

## Step 5: Test Core Features
- User registration with @ui.edu.ng email
- Authentication endpoints
- Project browsing
- AI assistant (if configured)

## 🎯 Your Backend URL
After deployment, your backend will be available at:
`https://your-service-name.onrender.com`

## 🔧 Troubleshooting
- Check deployment logs in Render dashboard
- Verify environment variables are set
- Ensure database and Redis services are running

## 💡 Tips
- Free tier services sleep after 15 minutes of inactivity
- First request after sleep may take 30-60 seconds
- Consider upgrading to Starter plan ($7/month) for production use

## ⚡ Build Optimizations
This setup includes several optimizations to speed up builds:
- Optimized npm install with caching
- Silent build mode
- Migrations run on startup (not during build)
- Build filters to ignore unnecessary files

Expected build time: 3-5 minutes (vs 8-12 minutes without optimizations)