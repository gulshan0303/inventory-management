# ---- Build stage -------------------------------------------------
FROM node:20-alpine AS builder
WORKDIR /app

# Install deps (including dev deps for TypeScript build)
COPY backend/package*.json ./
RUN npm ci

# Copy source & compile
COPY backend/ ./
RUN npm run build   # runs `tsc` → creates ./dist

# ---- Runtime stage -----------------------------------------------
FROM node:20-alpine
WORKDIR /app

# Only keep runtime deps
COPY --from=builder /app/package*.json ./
RUN npm ci --production   # installs only prod deps

# Copy compiled output
COPY --from=builder /app/dist ./dist

# Expose the API port (default 3001)
EXPOSE 3001

# Start the server
CMD ["node", "dist/server.js"]
