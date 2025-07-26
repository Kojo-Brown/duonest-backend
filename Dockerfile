# Use Node.js 18 Alpine as base image for smaller size
FROM node:18-alpine

# Install FFmpeg and build dependencies
RUN apk add --no-cache \
    ffmpeg \
    ffmpeg-dev \
    python3 \
    make \
    g++ \
    && rm -rf /var/cache/apk/* \
    && ffmpeg -version \
    && ffprobe -version

# Set working directory
WORKDIR /app

# Copy package files first for better caching
COPY package*.json ./

# Install ALL dependencies (including dev for build)
RUN npm ci && npm cache clean --force

# Copy source code
COPY . .

# Build TypeScript (with error handling)
RUN npm run build && ls -la dist/ || (echo "Build failed!" && exit 1)

# Remove dev dependencies after build to reduce image size
RUN npm prune --production

# Create uploads directories with proper permissions
RUN mkdir -p uploads/voice uploads/images uploads/videos uploads/videos/thumbnails \
    && chmod 755 uploads \
    && chmod 755 uploads/voice uploads/images uploads/videos uploads/videos/thumbnails

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs \
    && adduser -S duonest -u 1001 -G nodejs \
    && chown -R duonest:nodejs /app

# Switch to non-root user
USER duonest

# Expose port (Railway will override this)
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD node -e "require('http').get('http://localhost:' + (process.env.PORT || 8080) + '/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })"

# Start the application
CMD ["npm", "start"]