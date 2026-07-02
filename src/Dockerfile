# ═══════════════════════════════════════════════════════════════
# Stage 1 – Dependencies
# Bun: установка зависимостей быстрее npm в 10-25x
# ═══════════════════════════════════════════════════════════════
FROM oven/bun:1-alpine AS deps

RUN apk upgrade --no-cache

WORKDIR /app

COPY package.json package-lock.json* bun.lockb* ./

# bun install читает package-lock.json если нет bun.lockb
RUN bun install --frozen-lockfile 2>/dev/null || bun install

# ═══════════════════════════════════════════════════════════════
# Stage 2 – Build
# ═══════════════════════════════════════════════════════════════
FROM oven/bun:1-alpine AS builder

RUN apk upgrade --no-cache

WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

ARG NEXT_PUBLIC_API_BASE_URL=https://api.emplacc.g-309.ru
ARG NEXT_PUBLIC_KEYCLOAK_AUTH_URL=https://sso.g-309.ru
ARG NEXT_PUBLIC_KEYCLOAK_REALM=master-users
ARG NEXT_PUBLIC_KEYCLOAK_CLIENT_ID=emplacc-web
ARG NEXT_PUBLIC_APP_VERSION=dev
ARG NEXT_PUBLIC_BRAND=emplacc

ENV NEXT_PUBLIC_API_BASE_URL=$NEXT_PUBLIC_API_BASE_URL \
    NEXT_PUBLIC_KEYCLOAK_AUTH_URL=$NEXT_PUBLIC_KEYCLOAK_AUTH_URL \
    NEXT_PUBLIC_KEYCLOAK_REALM=$NEXT_PUBLIC_KEYCLOAK_REALM \
    NEXT_PUBLIC_KEYCLOAK_CLIENT_ID=$NEXT_PUBLIC_KEYCLOAK_CLIENT_ID \
    NEXT_PUBLIC_APP_VERSION=$NEXT_PUBLIC_APP_VERSION \
    NEXT_PUBLIC_BRAND=$NEXT_PUBLIC_BRAND \
    NEXT_TELEMETRY_DISABLED=1 \
    NODE_ENV=production

# bun run build — Bun запускает скрипт через Node-совместимый процесс
RUN bun run build

# ═══════════════════════════════════════════════════════════════
# Stage 3 – Runtime
# Bun standalone: запускаем server.js через Bun (~2x быстрее Node)
# ═══════════════════════════════════════════════════════════════
FROM oven/bun:1-alpine AS runner

RUN apk upgrade --no-cache && \
    addgroup -g 1001 -S nodejs && \
    adduser  -u 1001 -S nextjs -G nodejs

WORKDIR /app

ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0

COPY --from=builder --chown=nextjs:nodejs /app/public           ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static     ./.next/static

USER nextjs

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
    CMD wget -qO- http://127.0.0.1:3000/ > /dev/null 2>&1 || exit 1

# Next.js standalone server.js совместим с Bun
CMD ["bun", "server.js"]
