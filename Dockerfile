# Multi-stage build for production optimization
FROM node:22-alpine AS base
RUN npm install -g pnpm
WORKDIR /app

# Dependencies stage
FROM base AS deps
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile --production=false

# Build stage
FROM base AS builder
COPY package.json pnpm-lock.yaml ./
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Build the application
RUN pnpm build

# Prune dev dependencies
RUN pnpm install --frozen-lockfile --production=true && pnpm store prune

# Production stage
FROM node:22-alpine AS prod
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nestjs

WORKDIR /app

# Copy built application and production dependencies
COPY --from=builder --chown=nestjs:nodejs /app/dist ./dist
COPY --from=builder --chown=nestjs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nestjs:nodejs /app/package.json ./package.json

# Create directories
RUN mkdir -p logs uploads && chown -R nestjs:nodejs logs uploads

USER nestjs

# Cloud Run will set PORT, but default to 8080
ENV PORT=8080
EXPOSE 8080

# Health check - ADD .js EXTENSION
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:' + (process.env.PORT || 8080) + '/api/v1/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })"

# FIX: Correct path to compiled main file
CMD ["node", "src/main.js"]