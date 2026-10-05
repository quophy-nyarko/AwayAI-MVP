FROM node:22-alpine
WORKDIR /app

COPY package.json package-lock.json ./
COPY apps/server/package.json ./apps/server/

RUN npm install
RUN cd apps/server && npm install

COPY . .

WORKDIR /app/apps/server
RUN npx tsc --version
RUN npm run build

RUN echo "=== CHECKING BUILD ===" && ls -la && echo "=== DIST FOLDER ===" && ls -la dist/ || echo "DIST NOT CREATED - BUILD FAILED"

RUN mkdir -p /app/apps/server/data
EXPOSE 8787
ENV PORT=8787
ENV NODE_ENV=production
CMD ["node", "dist/index.js"]
