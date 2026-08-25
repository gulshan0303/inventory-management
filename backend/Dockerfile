# ---- Build stage -------------------------------------------------
FROM node:20-alpine AS builder

WORKDIR /app

# Install dependencies including dev dependencies
COPY package*.json ./
RUN npm ci

# Copy backend source
COPY . .

# Compile TypeScript
RUN npm run build


# ---- Runtime stage -----------------------------------------------
FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY --from=builder /app/package*.json ./

# Install production dependencies only
RUN npm ci --omit=dev

# Copy compiled application
COPY --from=builder /app/dist ./dist

# Railway will provide PORT at runtime
EXPOSE 3001

# Start backend
CMD ["node", "dist/server.js"]