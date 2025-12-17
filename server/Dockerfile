FROM node:18-alpine

# Set working directory
WORKDIR /usr/src/app

# Install Python and build dependencies for transformers
RUN apk add --no-cache python3 py3-pip

# Copy package files
COPY package*.json ./

# Install production dependencies only
RUN npm ci --only=production

# Copy application code
COPY . .

# Pre-download the ML model during build to avoid runtime downloads
# This significantly speeds up container startup
RUN node precache-model.js || echo "Model pre-download failed, will download at runtime"

# Expose port (Cloud Run uses PORT env variable)
EXPOSE 8080

# Health check - more lenient for Cloud Run
HEALTHCHECK --interval=30s --timeout=10s --start-period=120s --retries=3 \
  CMD node -e "require('http').get('http://localhost:8080/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start the application
CMD ["node", "server.js"]

