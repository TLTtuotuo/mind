# ===== Stage 1: Build =====
FROM node:20-alpine AS builder
WORKDIR /app

# Install ALL dependencies (including devDependencies for TypeScript compile)
COPY package*.json ./
RUN npm ci

# Generate Prisma client (needs schema.prisma, uses PostgreSQL provider)
COPY prisma ./prisma
RUN npx prisma generate

# Compile TypeScript to JavaScript
COPY tsconfig.json ./
COPY src ./src
RUN npm run build

# ===== Stage 2: Production Runtime =====
FROM node:20-alpine AS production
WORKDIR /app

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Install ONLY production dependencies at exact locked versions
COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

# Overwrite @prisma/client with the generated client from Stage 1
# (npm ci --omit=dev installs the default @prisma/client; the generated one
#  contains the actual query engine binary and TypeScript types)
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma

# Copy compiled output
COPY --from=builder /app/dist ./dist

# Copy prisma directory (schema + migrations needed for runtime `prisma migrate deploy`)
COPY --from=builder /app/prisma ./prisma

# Copy and set up entrypoint
COPY docker-entrypoint.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

USER nodejs
EXPOSE 3001

ENTRYPOINT ["docker-entrypoint.sh"]
CMD ["node", "dist/index.js"]
