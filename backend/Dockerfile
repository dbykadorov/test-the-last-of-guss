# Build stage
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
# Install full deps (prod+dev) to build
RUN npm ci

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Production stage
FROM node:18-alpine AS production

WORKDIR /app

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nestjs -u 1001

# Copy package files and install only production deps
COPY --chown=nestjs:nodejs package*.json ./
RUN npm ci --omit=dev --ignore-scripts

# Copy built application
COPY --from=builder --chown=nestjs:nodejs /app/dist ./dist

USER nestjs

EXPOSE 3000

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]

# Run migrations (compiled JS) then start the app
CMD sh -c "node node_modules/typeorm/cli.js migration:run -d dist/src/infrastructure/database/cli-data-source.js && node dist/src/main.js"
