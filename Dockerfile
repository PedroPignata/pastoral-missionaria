# Build stage
FROM node:22-alpine AS builder

WORKDIR /app

# Copy dependency manifests
COPY package*.json ./

# Install all dependencies
RUN npm ci

# Copy source code
COPY . .

# Build frontend and compile backend
RUN npm run build

# Production stage
FROM node:22-alpine AS runner

WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3001

# Install runtime tools for sqlite
RUN apk add --no-cache curl

# Copy package files and install only production dependencies
COPY package*.json ./
RUN npm ci --omit=dev

# Copy built frontend from builder
COPY --from=builder /app/dist ./dist

# Copy server source code and assets
COPY --from=builder /app/server ./server
COPY --from=builder /app/public ./public

# Create data directory for persistent SQLite database
RUN mkdir -p /app/data && chown -R node:node /app

VOLUME ["/app/data"]

USER node

EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:3001/api/health || exit 1

CMD ["npm", "start"]

