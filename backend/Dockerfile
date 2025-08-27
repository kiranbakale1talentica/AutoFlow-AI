# Multi-stage Dockerfile for Node.js Backend using Distroless
# Stage 1: Build stage
FROM node:18-alpine AS builder

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install all dependencies (including dev dependencies for potential build steps)
RUN npm ci

# Copy source code
COPY . .

# Create necessary directories in the builder stage
RUN mkdir -p /app/uploads /app/logs && \
    chmod 755 /app/uploads /app/logs

# Remove dev dependencies and reinstall only production dependencies
RUN npm prune --production

# Stage 2: Production stage with Node.js slim
FROM node:18-slim

# Install required system dependencies for SQLite3 and native compilation
RUN apt-get update && apt-get install -y \
    ca-certificates \
    python3 \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*

# Create a non-root user
RUN groupadd -r appuser && useradd -r -g appuser appuser

# Set working directory
WORKDIR /app

# Copy package files and source code (without node_modules)
COPY --from=builder --chown=appuser:appuser /app/package*.json ./
COPY --from=builder --chown=appuser:appuser /app/*.js ./
COPY --from=builder --chown=appuser:appuser /app/uploads ./uploads
COPY --from=builder --chown=appuser:appuser /app/logs ./logs
COPY --from=builder --chown=appuser:appuser /app/config ./config
COPY --from=builder --chown=appuser:appuser /app/middleware ./middleware
COPY --from=builder --chown=appuser:appuser /app/models ./models
COPY --from=builder --chown=appuser:appuser /app/routes ./routes
COPY --from=builder --chown=appuser:appuser /app/services ./services

# Install production dependencies in the production environment to compile native modules correctly
RUN npm ci --only=production

# Create data directory for SQLite database with proper permissions
RUN mkdir -p /app/data && chown -R appuser:appuser /app/data

# Set the non-root user
USER appuser

# Expose port
EXPOSE 5000

# Add health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:5000/api/health', (res) => process.exit(res.statusCode === 200 ? 0 : 1)).on('error', () => process.exit(1))"

# Environment variables
ENV NODE_ENV=production
ENV PORT=5000

# Start the application
CMD ["server.js"]
