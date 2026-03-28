# Vigil - Vercel Deployment Guide

## Quick Deploy to Vercel

### Option 1: Using Vercel CLI (Recommended)

1. **Install Vercel CLI** (if not already installed):
```bash
npm install -g vercel
```

2. **Login to Vercel**:
```bash
vercel login
```

3. **Deploy from project root**:
```bash
# For preview deployment
vercel

# For production deployment
vercel --prod
```

### Option 2: Using Vercel Dashboard

1. Go to [vercel.com](https://vercel.com)
2. Click "Add New Project"
3. Import your Git repository
4. Vercel will auto-detect the configuration from `vercel.json`
5. Click "Deploy"

## Configuration

The project is configured with:
- **Build Command**: `cd frontend && npm install && npm run build`
- **Output Directory**: `frontend/dist`
- **Framework**: Vite

## Environment Variables

After deployment, configure these in Vercel Dashboard:

1. Go to Project Settings → Environment Variables
2. Add the following:

```
VITE_API_URL=http://localhost:8000
```

For production with a backend, update to your backend URL:
```
VITE_API_URL=https://your-backend-url.com
```

## Post-Deployment

After deployment, Vercel will provide you with:
- **Preview URL**: `https://vigil-xxx.vercel.app`
- **Production URL**: `https://vigil.vercel.app` (if you have a custom domain)

## Notes

- The frontend is deployed as a static site
- Backend (FastAPI) needs to be deployed separately on a Python-compatible platform
- For demo purposes, the frontend can work with mock data or local backend
- WebSocket connections may need additional configuration for production

## Troubleshooting

**Build fails?**
- Ensure all dependencies are in `frontend/package.json`
- Check build logs in Vercel dashboard

**API not connecting?**
- Verify `VITE_API_URL` environment variable is set
- Check CORS settings on your backend
- Ensure backend is deployed and accessible

**WebSocket issues?**
- Vercel supports WebSockets on Pro plan
- Consider using polling as fallback for free tier
