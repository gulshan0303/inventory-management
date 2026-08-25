# ---- Build stage -------------------------------------------------
FROM node:20-alpine AS builder
WORKDIR /app

COPY frontend/package*.json ./
RUN npm ci

COPY frontend/ ./
RUN npm run build   # Next.js production build (creates .next)

# ---- Runtime stage -----------------------------------------------
FROM node:20-alpine
WORKDIR /app

# Only keep prod deps (Next.js needs them at runtime)
COPY --from=builder /app/package*.json ./
RUN npm ci --production

# Copy the build output
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/next.config.js ./
COPY --from=builder /app/tsconfig.json ./
COPY --from=builder /app/next-env.d.ts ./
COPY --from=builder /app/next.config.mjs ./

# Expose the web port (default 3000)
EXPOSE 3000

# Next.js‑style entrypoint
CMD ["node", "node_modules/next/dist/bin/next","start"]
