# Running ClearBoard Backend Locally

This guide will help you run the ClearBoard backend server on your local machine.

## Prerequisites

1. **Node.js** (version 14 or higher)
2. **Google Cloud Service Account** with the following permissions:
   - Cloud Storage Admin
   - Storage Object Admin

## Setup Instructions

### 1. Install Dependencies

```bash
cd server
npm install
```

### 2. Google Cloud Setup

1. Create a Google Cloud Project (if you don't have one)
2. Enable the Cloud Storage API
3. Create a Service Account with Storage permissions
4. Download the service account key JSON file
5. Place the key file locally as `server/clearboard-key.json` (this path is gitignored — never commit it)

### 3. Environment Variables

Create a `.env` file in the `server` directory:

```env
# JWT Secret (use a strong secret in production)
JWT_SECRET=your-super-secret-jwt-key-here

# Google Cloud Project ID
GOOGLE_CLOUD_PROJECT_ID=your-project-id

# Service Account Key File Path
GOOGLE_APPLICATION_CREDENTIALS=./clearboard-key.json
```

### 4. Start the Server

#### Option 1: Using the start script
```bash
node start-local.js
```

#### Option 2: Direct start
```bash
npm start
```

#### Option 3: Development mode with auto-restart
```bash
npx nodemon server.js
```

## Server Configuration

- **Port**: 8080 (configurable via PORT environment variable)
- **CORS**: Enabled for localhost (ports 3000, 5173, 4173)
- **Storage**: Google Cloud Storage
- **Authentication**: JWT-based

## API Endpoints

Once running, your server will be available at `http://localhost:8080`:

- `POST /api/login` - User login
- `POST /api/signup` - User registration
- `GET /api/files` - List files
- `POST /api/files/upload` - Upload file
- `GET /api/files/download/:fileId` - Download file

## Frontend Integration

The frontend will automatically detect if it's running on localhost and use `http://localhost:8080` as the API base URL. No additional configuration needed!

## Troubleshooting

### Common Issues

1. **CORS Errors**: Make sure your frontend is running on one of the allowed ports (3000, 5173, 4173)

2. **Google Cloud Authentication**: 
   - Verify your service account key file is in the correct location
   - Check that the service account has the required permissions
   - Ensure the project ID is correct

3. **Port Already in Use**: 
   - Change the PORT environment variable
   - Or kill the process using the port: `lsof -ti:8080 | xargs kill -9`

4. **File Upload Issues**:
   - Check that the `uploads` directory exists and is writable
   - Verify Google Cloud Storage permissions

### Logs

The server provides detailed logging for debugging:
- Request/response logs via Morgan
- File upload/download logs
- Error logs with stack traces

## Development Tips

1. **Hot Reload**: Use `nodemon` for automatic server restarts during development
2. **Environment**: Use different `.env` files for different environments
3. **Testing**: Test with both localhost and production URLs
4. **Debugging**: Check browser network tab for API call details

## Production Deployment

For production deployment, make sure to:
- Use a strong JWT secret
- Set up proper environment variables
- Configure CORS for your production domain
- Use a process manager like PM2
- Set up proper logging and monitoring
