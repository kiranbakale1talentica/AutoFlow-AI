# Simple Dockerfile for React Frontend
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Expose port
EXPOSE 3000

# Start the application using npx serve (no user switching for simplicity)
CMD ["npx", "serve", "-s", "build", "-l", "3000"]
