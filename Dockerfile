FROM node:20-bullseye AS builder
WORKDIR /app

RUN corepack enable

COPY package.json pnpm-lock.yaml tsconfig.json ./
COPY scripts ./scripts
COPY src ./src
COPY webview ./webview
COPY resources ./resources
COPY server.toml ./server.toml
COPY .env.example ./.env

RUN mkdir -p modules/js-module
RUN pnpm install --frozen-lockfile --ignore-scripts
RUN pnpm build:docker

FROM --platform=linux/amd64 altmp/altv-server:release
WORKDIR /altv

COPY --from=builder /app/resources ./resources
COPY --from=builder /app/server.toml ./server.toml
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json

EXPOSE 7788/tcp 7788/udp
CMD ["./altv-server", "--config", "server.toml"]
