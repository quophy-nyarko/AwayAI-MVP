FROM node:22-alpine
WORKDIR /app
COPY . .
WORKDIR /app/apps/server
RUN npm install
RUN npm run build
RUN ls -la dist/ && echo "BUILD OK - DIST/index.js exists"
RUN mkdir -p data
EXPOSE 8787
ENV PORT=8787
ENV NODE_ENV=production
CMD ["node", "dist/index.js"]
