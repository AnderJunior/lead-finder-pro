# ===== BUILD =====
FROM node:20-alpine AS builder
RUN apk add --no-cache openssl libc6-compat
WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci

COPY . .
RUN npx prisma generate
RUN npm run build

# ===== RUNTIME =====
FROM node:20-alpine
RUN apk add --no-cache openssl libc6-compat
WORKDIR /app
ENV NODE_ENV=production

COPY package.json package-lock.json* ./
RUN npm ci --omit=dev

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma

EXPOSE 3001

# Roda migrations e seed na inicialização (idempotente)
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/scripts/seed.js && node dist/index.js"]
