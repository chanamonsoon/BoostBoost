FROM node:22-slim AS build
WORKDIR /app
COPY package.json ./
RUN npm install
COPY tsconfig.json ./
COPY src ./src
RUN npm run build

FROM node:22-slim
WORKDIR /app
ENV NODE_ENV=production
COPY package.json ./
RUN npm install --omit=dev
COPY --from=build /app/dist ./dist

# Mount a persistent volume here in production so check-ins survive restarts/redeploys.
ENV BOOSTBOOST_DATA_FILE=/app/data/emotion-checkins.json
RUN mkdir -p /app/data

EXPOSE 3000
CMD ["node", "dist/api/server.js"]
