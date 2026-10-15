# Imagen para cualquier hosting con Docker (VPS, Railway, Fly.io, etc.)
FROM node:20-alpine

ENV NODE_ENV=production \
    TRUST_PROXY=1 \
    PORT=3000 \
    DATA_DIR=/data

WORKDIR /app
COPY package.json ./
COPY server.js config.json ./
COPY lib ./lib
COPY public ./public

RUN mkdir -p /data && chown -R node:node /data
USER node

VOLUME ["/data"]
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s CMD wget -qO- http://127.0.0.1:3000/api/health || exit 1

CMD ["node", "server.js"]
