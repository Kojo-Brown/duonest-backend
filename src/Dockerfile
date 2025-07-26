# Use official Node.js runtime as base image
FROM node:18-alpine

# Install FFmpeg
RUN apk add --no-cache ffmpeg

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy source code
COPY . .

# Build TypeScript
RUN npm run build

# Create uploads directory
RUN mkdir -p uploads/videos uploads/images uploads/audio

# Expose port
EXPOSE 8080

# Start the application
CMD ["npm", "start"]