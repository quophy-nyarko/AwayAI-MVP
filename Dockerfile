FROM node:22-alpine
WORKDIR /app
COPY . .
RUN npm install
WORKDIR /app/apps/server
RUN npm install
RUN npm run build
RUN ls -la
RUN mkdir -p /app/apps/server/data
EXPOSE 8787
ENV PORT=8787
ENV NODE_ENV=production
CMD ["node", "dist/index.js"]
