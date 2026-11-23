FROM node:22-slim
WORKDIR /app
COPY apps/api/package.json ./
RUN npm install --omit=dev
COPY apps/api/src ./src
COPY apps/api/db ./db
ENV NODE_ENV=production
EXPOSE 3000
USER node
CMD ["node", "src/server.js"]
