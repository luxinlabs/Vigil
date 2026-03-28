#!/bin/bash

echo "🚀 Deploying Vigil to Vercel..."
echo ""

# Check if Vercel CLI is installed
if ! command -v vercel &> /dev/null; then
    echo "❌ Vercel CLI not found. Installing..."
    npm install -g vercel
fi

# Check if we're in the right directory
if [ ! -f "vercel.json" ]; then
    echo "❌ vercel.json not found. Please run this script from the Vigil root directory."
    exit 1
fi

echo "📦 Building frontend..."
cd frontend
npm install
npm run build
cd ..

echo ""
echo "🔑 Setting up environment variables..."
echo "You'll need to configure these in Vercel dashboard after deployment:"
echo "  - OPENAI_API_KEY: Your OpenAI API key"
echo "  - VITE_API_URL: Your backend API URL (or use mock data)"
echo ""

echo "🌐 Deploying to Vercel..."
echo ""
echo "Run one of the following commands:"
echo ""
echo "  For production deployment:"
echo "    vercel --prod"
echo ""
echo "  For preview deployment:"
echo "    vercel"
echo ""
echo "After deployment, configure environment variables in Vercel dashboard:"
echo "  1. Go to your project settings"
echo "  2. Navigate to Environment Variables"
echo "  3. Add: VITE_API_URL (e.g., https://your-backend.vercel.app)"
echo "  4. Add: OPENAI_API_KEY (your OpenAI API key)"
echo ""
echo "Note: For a full deployment with backend, you'll need to:"
echo "  1. Deploy backend separately (Python/FastAPI on Vercel or other platform)"
echo "  2. Update VITE_API_URL to point to your backend"
echo ""
echo "For demo purposes, the frontend can run with mock data."
