FROM node:18-alpine

WORKDIR /usr/src/app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install all dependencies
RUN npm install

# Copy the rest of the app
COPY . .

# Expose Cloud Run port
EXPOSE 8080
ENV PORT=8080

# Start the server
CMD ["node", "server.js"]
