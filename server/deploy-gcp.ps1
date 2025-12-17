# Deploy Backend to GCP Cloud Run
# This script ensures a fresh deployment without cache

Write-Host "Starting fresh deployment to GCP Cloud Run..." -ForegroundColor Green

# Set variables
$PROJECT_ID = "fifth-flame-472409-q0"
$REGION = "asia-south1"
$SERVICE_NAME = "backend-app"
$GCS_BUCKET = "clearboard"
$FRONTEND_URL = "https://fifth-flame-472409-q0.web.app"
$JWT_SECRET = "clearboard-super-secret-jwt-key-2024-production"

# Deploy with all required environment variables
Write-Host "`nDeploying to Cloud Run (this may take a few minutes)..." -ForegroundColor Yellow
Write-Host "Configuration:" -ForegroundColor Cyan
Write-Host "  - Memory: 2Gi" -ForegroundColor Gray
Write-Host "  - CPU: 2" -ForegroundColor Gray
Write-Host "  - Timeout: 300s" -ForegroundColor Gray
Write-Host "  - Startup CPU Boost: Enabled" -ForegroundColor Gray
Write-Host "  - GCS Bucket: $GCS_BUCKET" -ForegroundColor Gray
Write-Host "  - Frontend URL: $FRONTEND_URL" -ForegroundColor Gray

gcloud run deploy $SERVICE_NAME `
  --source . `
  --platform managed `
  --region $REGION `
  --allow-unauthenticated `
  --memory 2Gi `
  --cpu 2 `
  --timeout 300 `
  --max-instances 10 `
  --min-instances 0 `
  --cpu-boost `
  --no-cache `
  --set-env-vars "NODE_ENV=production,GCS_BUCKET_NAME=$GCS_BUCKET,JWT_SECRET=$JWT_SECRET,FRONTEND_URL=$FRONTEND_URL"

if ($LASTEXITCODE -eq 0) {
    Write-Host "`n[SUCCESS] Deployment successful!" -ForegroundColor Green
    Write-Host "`nTesting health endpoint..." -ForegroundColor Yellow
    
    # Get the service URL
    $SERVICE_URL = gcloud run services describe $SERVICE_NAME --region $REGION --format="value(status.url)"
    
    Write-Host "Service URL: $SERVICE_URL" -ForegroundColor Cyan
    Write-Host "`nHealth check: $SERVICE_URL/health" -ForegroundColor Cyan
    
    # Wait a bit for the service to fully start
    Write-Host "`nWaiting 10 seconds for service to fully initialize..." -ForegroundColor Yellow
    Start-Sleep -Seconds 10
    
    # Test the health endpoint
    try {
        $response = Invoke-RestMethod -Uri "$SERVICE_URL/health" -Method Get -TimeoutSec 30
        Write-Host "`n[SUCCESS] Health check passed!" -ForegroundColor Green
        Write-Host "Response: $($response | ConvertTo-Json)" -ForegroundColor Cyan
        
        Write-Host "`n[NEXT STEPS]" -ForegroundColor Yellow
        Write-Host "1. Update your frontend to use: $SERVICE_URL" -ForegroundColor Gray
        Write-Host "2. Test the API endpoints" -ForegroundColor Gray
        Write-Host "3. Monitor logs: gcloud run services logs read $SERVICE_NAME --region $REGION --limit 50" -ForegroundColor Gray
    } catch {
        Write-Host "`n[WARNING] Health check failed: $_" -ForegroundColor Yellow
        Write-Host "The service may still be initializing. Check logs for details." -ForegroundColor Gray
    }
} else {
    Write-Host "`n[ERROR] Deployment failed!" -ForegroundColor Red
    Write-Host "Check the logs at:" -ForegroundColor Yellow
    Write-Host "https://console.cloud.google.com/run/detail/$REGION/$SERVICE_NAME/logs?project=$PROJECT_ID" -ForegroundColor Cyan
}

