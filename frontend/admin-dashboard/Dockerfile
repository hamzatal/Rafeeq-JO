# Production image for the Rafeeq admin dashboard (Next.js standalone).
# Build from the monorepo `frontend/` folder:
#   docker build -f admin-dashboard/Dockerfile -t rafeeq-admin .
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
COPY packages ./packages
COPY admin-dashboard/package.json ./admin-dashboard/package.json
RUN npm install --no-audit --no-fund

FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY package.json package-lock.json ./
COPY packages ./packages
COPY admin-dashboard ./admin-dashboard
WORKDIR /app/admin-dashboard
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production PORT=3000
RUN addgroup -g 1001 -S nodejs && adduser -S nextjs -u 1001
COPY --from=builder /app/admin-dashboard/.next/standalone ./
COPY --from=builder /app/admin-dashboard/.next/static ./admin-dashboard/.next/static
COPY --from=builder /app/admin-dashboard/public ./admin-dashboard/public
USER nextjs
EXPOSE 3000
CMD ["node", "admin-dashboard/server.js"]
