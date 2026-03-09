# Cloud Deployment Guide

## Course: Cloud Computing

This guide covers deploying the NMU AI Advisor platform on free cloud platforms.

---

## Option 1: Vercel (Recommended — Easiest)

### Prerequisites
- GitHub account
- Project pushed to a GitHub repository

### Steps

1. Go to [vercel.com](https://vercel.com) and sign in with GitHub
2. Click **"New Project"** → Import your repository
3. Configure:
   - **Framework Preset**: Vite
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
4. Add Environment Variable:
   - Key: `GEMINI_API_KEY`
   - Value: Your Gemini API key
5. Click **Deploy**

Your app will be live at `https://your-project.vercel.app`

---

## Option 2: Netlify

### Steps

1. Go to [netlify.com](https://netlify.com) and sign in
2. Click **"Add new site"** → **"Import an existing project"**
3. Connect your GitHub repository
4. Configure:
   - **Build Command**: `npm run build`
   - **Publish Directory**: `dist`
5. Go to **Site settings** → **Environment variables**
   - Add `GEMINI_API_KEY` with your API key
6. Trigger a new deploy

---

## Option 3: Docker Deployment

### Local Testing

```bash
# Build and run with Docker Compose
docker-compose up --build

# Or build manually
docker build --build-arg GEMINI_API_KEY=your_key_here -t nmu-ai-advisor .
docker run -p 3000:80 nmu-ai-advisor
```

### Deploy to Google Cloud Run

```bash
# Build the Docker image
gcloud builds submit --tag gcr.io/PROJECT_ID/nmu-ai-advisor

# Deploy to Cloud Run
gcloud run deploy nmu-ai-advisor \
  --image gcr.io/PROJECT_ID/nmu-ai-advisor \
  --platform managed \
  --allow-unauthenticated \
  --set-env-vars GEMINI_API_KEY=your_key_here
```

---

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `GEMINI_API_KEY` | Yes | Google Gemini API key for AI features |
| `APP_URL` | No | Public URL of the deployed app |

---

## Architecture in Cloud

```
┌─────────────────────────────────────────┐
│            Cloud Platform               │
│  ┌────────────────────────────────────┐ │
│  │         Static File Hosting        │ │
│  │  (Vercel / Netlify / Nginx)        │ │
│  │                                    │ │
│  │   ┌─────────────────────────────┐  │ │
│  │   │   React SPA (Vite Build)   │  │ │
│  │   │   - index.html + JS/CSS    │  │ │
│  │   │   - API key baked in build │  │ │
│  │   └───────────┬─────────────────┘  │ │
│  │               │                    │ │
│  └───────────────│────────────────────┘ │
│                  │ HTTPS                │
│                  ▼                      │
│   ┌──────────────────────────┐         │
│   │   Google Gemini API      │         │
│   │   (External Service)     │         │
│   └──────────────────────────┘         │
└─────────────────────────────────────────┘
```
