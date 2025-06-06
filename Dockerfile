FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY source/package*.json ./source/
COPY source/tsconfig.json ./source/

# Install dependencies
RUN cd source && npm ci

# Copy source code
COPY source/ ./source/

# Expose port
EXPOSE 3000

# Set working directory to source
WORKDIR /app/source

# Health check (using wget instead of curl for smaller footprint)
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/health || exit 1

# Default command to start the server
CMD ["npm", "start"]