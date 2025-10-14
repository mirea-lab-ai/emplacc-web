FROM node:trixie-slim AS base

# Install dependencies only when needed
FROM base AS deps
WORKDIR /app

# Install dependencies based on the preferred package manager
COPY package.json package-lock.json* ./
RUN npm ci

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Next.js collects completely anonymous telemetry data about general usage.
# Learn more here: https://nextjs.org/telemetry
# Uncomment the following line in case you want to disable telemetry during the build.
ENV NEXT_PUBLIC_API_BASE_URL="https://api.emplacc.g-309.ru"
ENV NEXT_PUBLIC_KEYCLOAK_AUTH_URL="https://sso.g-309.ru"
ENV NEXT_PUBLIC_KEYCLOAK_REALM="master-users"
ENV NEXT_PUBLIC_KEYCLOAK_CLIENT_ID="emplacc-web"


RUN npm run build

# Production image, copy all the files and run next
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public

# Set the correct permission for prerender cache
RUN mkdir .next
RUN chown nextjs:nodejs .next

# Automatically leverage output traces to reduce image size
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

ENV NEXT_PUBLIC_API_BASE_URL="https://api.emplacc.g-309.ru"
ENV NEXT_PUBLIC_KEYCLOAK_AUTH_URL="https://sso.g-309.ru"
ENV NEXT_PUBLIC_KEYCLOAK_REALM="master-users"
ENV NEXT_PUBLIC_KEYCLOAK_CLIENT_ID="emplacc-web"

CMD ["node", "server.js"]