
FROM oven/bun:1.3 AS base
WORKDIR /app

COPY package.json bun.lock ./
COPY apps ./apps
COPY packages ./packages

RUN bun install --frozen-lockfile

FROM base AS build-frontend
ENV VITE_API_URL=https://baicao.nport.link/api
RUN bun run --cwd apps/frontend build

FROM base AS build-backend
RUN bun run --cwd apps/backend build

FROM oven/bun:1.3 AS backend
WORKDIR /app
COPY --from=build-backend /app/apps/backend/dist ./dist
COPY --from=build-backend /app/apps/backend/package.json ./package.json
COPY --from=build-backend /app/apps/backend/src/db/migrate.ts ./src/db/migrate.ts
COPY --from=build-backend /app/apps/backend/drizzle ./drizzle
EXPOSE 3001
CMD ["/bin/sh", "-c", "bun run --cwd /app db:migrate && bun dist/index.js"]

FROM nginx:1.27-alpine AS nginx
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build-frontend /app/apps/frontend/dist /usr/share/nginx/html
