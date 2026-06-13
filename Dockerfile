FROM node:22-bookworm-slim AS base

WORKDIR /app

ENV NEXT_TELEMETRY_DISABLED=1

RUN apt-get update -y \
  && apt-get install -y --no-install-recommends openssl fonts-ipafont-gothic fonts-noto-cjk \
  && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
COPY prisma ./prisma

RUN npm ci
RUN npm run prisma:generate

COPY . .

EXPOSE 3048

CMD ["npx", "next", "dev", "-H", "0.0.0.0", "-p", "3048"]
