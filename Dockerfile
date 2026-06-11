# Прокидывается при docker build --build-arg BACKEND_PORT=...
ARG BACKEND_PORT=8000

FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY tsconfig.json ./
COPY prisma ./prisma
COPY src ./src

RUN npx prisma generate && npm run build

ENV BACKEND_PORT=${BACKEND_PORT}

EXPOSE ${BACKEND_PORT}

CMD sh -c "node_modules/.bin/prisma migrate deploy && node dist/server.js"
