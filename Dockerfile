FROM node:22-alpine
WORKDIR /app
COPY package*.json ./
COPY . .
RUN npm install
RUN npm --workspace apps/server run build
WORKDIR /app/apps/server
RUN mkdir -p /app/apps/server/data
EXPOSE 8787
ENV PORT=8787
ENV NODE_ENV=production
CMD ["node", "dist/index.js"]
