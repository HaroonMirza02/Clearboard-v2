# GCP Cloud Run Deployment Guide

## Issues Fixed

### 1. **Server Startup Timeout**
- **Problem**: The container was failing to start and listen on PORT=8080 within the allocated timeout
- **Root Cause**: Semantic search initialization was blocking the server startup
- **Solution**: 
  - Moved semantic search initialization to run in background using `setImmediate()`
  - Server now listens immediately on port 8080
  - Added explicit binding to `0.0.0.0` for Cloud Run compatibility

### 2. **Health Check Endpoint**
- **Added**: `/health` endpoint for GCP health checks
- **Returns**: `{ status: 'healthy', timestamp: '...' }`

### 3. **Dockerfile Optimization**
- Uses production dependencies only (`npm ci --only=production`)
- Runs as non-root user for security
- Includes health check configuration
- Optimized layer caching

## Prerequisites

1. **GCP Project Setup**
   - Project ID: `fifth-flame-472409-q0`
   - Region: `asia-south1`
   - Cloud Run API enabled
   - Cloud Build API enabled

2. **GCS Bucket**
   - Bucket name should be set in environment variable `GCS_BUCKET_NAME`
   - Service account needs Storage Admin permissions

3. **Environment Variables Required**
   ```
   GCS_BUCKET_NAME=your-bucket-name
   JWT_SECRET=your-secret-key
   FRONTEND_URL=https://your-frontend-url.web.app
   SMTP_HOST=smtp.gmail.com (optional, for emails)
   SMTP_PORT=587 (optional)
   SMTP_USER=your-email@gmail.com (optional)
   SMTP_PASS=your-app-password (optional)
   EMAIL_FROM=noreply@yourdomain.com (optional)
   ```

## Deployment Steps

### Option 1: Use the Deployment Script (Easiest)

```powershell
# Navigate to server directory
cd d:\ClearBoard\server

# Run the deployment script
.\deploy-gcp.ps1
```

This script will:
- Deploy with all required environment variables
- Enable CPU boost for faster startup
- Test the health endpoint after deployment
- Provide next steps

### Option 2: Deploy from Source (Manual)

```bash
# Navigate to server directory
cd d:\ClearBoard\server

# Deploy to Cloud Run with all required environment variables
gcloud run deploy backend-app \
  --source . \
  --platform managed \
  --region asia-south1 \
  --allow-unauthenticated \
  --memory 2Gi \
  --cpu 2 \
  --timeout 300 \
  --max-instances 10 \
  --cpu-boost \
  --set-env-vars "NODE_ENV=production,GCS_BUCKET_NAME=clearboard,JWT_SECRET=your-secret-here,FRONTEND_URL=https://fifth-flame-472409-q0.web.app"
```

### Option 2: Build and Deploy with Docker

```bash
# Build the Docker image
docker build -t backend-app .

# Tag for GCP Container Registry
docker tag backend-app gcr.io/fifth-flame-472409-q0/backend-app

# Push to GCR
docker push gcr.io/fifth-flame-472409-q0/backend-app

# Deploy to Cloud Run
gcloud run deploy backend-app \
  --image gcr.io/fifth-flame-472409-q0/backend-app \
  --platform managed \
  --region asia-south1 \
  --allow-unauthenticated \
  --memory 1Gi \
  --cpu 1 \
  --timeout 300 \
  --max-instances 10 \
  --set-env-vars "GCS_BUCKET_NAME=clearboard,FRONTEND_URL=https://fifth-flame-472409-q0.web.app,JWT_SECRET=your-secret-here"
```

## Setting Environment Variables

### Via gcloud command:
```bash
gcloud run services update backend-app \
  --region asia-south1 \
  --set-env-vars "GCS_BUCKET_NAME=clearboard,JWT_SECRET=your-secret,FRONTEND_URL=https://your-frontend.web.app"
```

### Via Cloud Console:
1. Go to Cloud Run console
2. Select your service `backend-app`
3. Click "Edit & Deploy New Revision"
4. Go to "Variables & Secrets" tab
5. Add environment variables
6. Click "Deploy"

## Service Account Permissions

Your Cloud Run service needs the following IAM permissions:

```bash
# Grant Storage Admin role to Cloud Run service account
gcloud projects add-iam-policy-binding fifth-flame-472409-q0 \
  --member="serviceAccount:602854698306-compute@developer.gserviceaccount.com" \
  --role="roles/storage.admin"
```

## Verify Deployment

### 1. Check Health Endpoint
```bash
curl https://backend-app-[hash]-uc.a.run.app/health
```

Expected response:
```json
{
  "status": "healthy",
  "timestamp": "2025-12-11T05:23:43.000Z"
}
```

### 2. Check Logs
```bash
gcloud run services logs read backend-app --region asia-south1 --limit 50
```

Look for:
- "Server running on port 8080"
- "System is fully cloud-based"
- "Initializing semantic search service..." (should happen after server starts)

### 3. Test API Endpoint
```bash
curl https://backend-app-[hash]-uc.a.run.app/api/health
```

## Troubleshooting

### Issue: Container still fails to start
**Check:**
1. Logs for any errors during initialization
2. Ensure GCS_BUCKET_NAME is set correctly
3. Verify service account has Storage permissions
4. Check if bucket exists and is accessible

### Issue: Semantic search not working
**This is expected initially** - semantic search initializes in the background. Check logs:
```bash
gcloud run services logs read backend-app --region asia-south1 | grep "semantic"
```

### Issue: CORS errors from frontend
**Solution:** Update ALLOWED_ORIGINS in server.js to include your production frontend URL

### Issue: File uploads failing
**Check:**
1. GCS bucket permissions
2. Service account has write access
3. Memory limits (increase if needed: `--memory 2Gi`)

## Performance Tuning

### Increase Resources
```bash
gcloud run services update backend-app \
  --region asia-south1 \
  --memory 2Gi \
  --cpu 2 \
  --concurrency 80
```

### Set Min Instances (reduce cold starts)
```bash
gcloud run services update backend-app \
  --region asia-south1 \
  --min-instances 1
```

## Cost Optimization

- Use `--min-instances 0` for development (default)
- Set `--max-instances` to limit scaling
- Monitor usage in Cloud Console

## Next Steps

1. Update frontend to use the Cloud Run URL
2. Set up custom domain (optional)
3. Configure Cloud CDN for better performance (optional)
4. Set up monitoring and alerts
5. Configure backup strategy for GCS bucket

## Important Notes

- The server now starts immediately and initializes heavy services in the background
- Health checks will pass even if semantic search is still initializing
- First request might be slower due to cold start
- Semantic search will be available within 30-60 seconds after deployment
