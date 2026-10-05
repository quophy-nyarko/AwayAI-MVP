FROM node:22-alpine AS build
WORKDIR /app
COPY package*.json ./
COPY apps/server/package*.json ./apps/server/
RUN npm install --workspace apps/server --include-workspace-root
COPY apps/server ./apps/server
RUN npm --workspace apps/server run build

FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY package*.json ./
COPY apps/server/package*.json ./apps/server/
RUN npm install --workspace apps/server --include-workspace-root --omit=dev
COPY --from=build /app/apps/server/dist ./apps/server/dist
RUN mkdir -p /app/apps/server/data
WORKDIR /app/apps/server
EXPOSE 8787
CMD ["node", "dist/index.js"]
