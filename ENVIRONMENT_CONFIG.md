# Environment Configuration for Download Links

## How It Works

The server automatically detects the environment and uses the appropriate frontend URL for download links:

### Local Development
- **Automatic**: Uses `http://localhost:5173`
- Download links in emails will point to your local development server

### Production Deployment
- **Automatic**: Uses `https://fifth-flame-472409-q0.web.app`
- Download links in emails will point to your production site

## Manual Override (Optional)

You can manually set the frontend URL in your `.env` file:

```bash
# In server/.env
FRONTEND_URL=http://localhost:5173  # For local testing
# OR
FRONTEND_URL=https://fifth-flame-472409-q0.web.app  # For production
```

## How to Deploy

### Option 1: Deploy Backend to Google Cloud Run (Recommended)

1. **Set Environment Variable in Cloud Run**:
   ```bash
   gcloud run deploy clearboard-backend \
     --set-env-vars NODE_ENV=production
   ```

2. The server will automatically use the production URL

### Option 2: Deploy Backend Elsewhere

Just set these environment variables:
```bash
NODE_ENV=production
FRONTEND_URL=https://fifth-flame-472409-q0.web.app
```

## Testing

### Local Testing
1. Make sure `NODE_ENV` is NOT set to 'production'
2. Start server: `npm start`
3. Check console output: Should show `Frontend URL for download links: http://localhost:5173`
4. Send download link from dashboard
5. Click link in email - should open localhost

### Production Testing
1. Set `NODE_ENV=production` in your deployment
2. Check console/logs: Should show `Frontend URL for download links: https://fifth-flame-472409-q0.web.app`
3. Send download link
4. Click link in email - should open production site

## Current Behavior

- **Development** (default): Links point to `http://localhost:5173`
- **Production** (`NODE_ENV=production`): Links point to `https://fifth-flame-472409-q0.web.app`
- **Custom**: Set `FRONTEND_URL` in `.env` to override

## Verification

When the server starts, you'll see:
```
Server running on port 8080
Temp uploads directory: D:\ClearBoard\server\uploads
Metadata stored in GCS: metadata/filemeta.json
Users stored in GCS: metadata/users.json
Frontend URL for download links: http://localhost:5173  ← Check this line
System is fully cloud-based
```

This confirms which URL is being used for download links!
