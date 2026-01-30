# ---- deps ----
FROM node:20-alpine AS deps
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

# ---- build ----
FROM node:20-alpine AS build
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Generate Prisma client
ENV DATABASE_URL="postgresql://user:pass@localhost:5432/db?schema=public"
RUN npx prisma generate
RUN npm run build

# ---- runtime ----
FROM node:20-alpine AS runtime
WORKDIR /app

ENV NODE_ENV=production

# Только runtime-зависимости
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

# ВАЖНО: prisma client artifacts
COPY --from=build /app/node_modules/.prisma ./node_modules/.prisma

# Собранный код
COPY --from=build /app/dist ./dist

# Prisma schema + migrations for deploys/runtime
COPY --from=build /app/prisma ./prisma
COPY --from=build /app/prisma.config.ts ./prisma.config.ts

EXPOSE 3000
CMD ["node", "dist/src/main.js"]
