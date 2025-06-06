FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY source/package*.json ./source/
COPY source/tsconfig.json ./source/
COPY source/jest.config.js ./source/

# Install dependencies
RUN cd source && npm ci

# Copy source code
COPY source/ ./source/

# Build the application (if needed)
# RUN cd source && npm run build

# Expose port
EXPOSE 3000

# Set working directory to source
WORKDIR /app/source

# Default command - can be overridden
CMD ["npm", "test"]