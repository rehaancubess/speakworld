FROM node:22-alpine AS build

WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

COPY index.html vite.config.js ./
COPY src ./src
COPY server ./server
COPY public ./public
RUN npm run build

FROM node:22-alpine AS runtime

ENV NODE_ENV=production \
    PORT=8080 \
    HOST=0.0.0.0

WORKDIR /app
COPY --from=build --chown=node:node /app/dist ./dist
COPY --from=build --chown=node:node /app/server ./server

USER node
EXPOSE 8080

CMD ["node", "server/cloud-run-server.mjs"]
