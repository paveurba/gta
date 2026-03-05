FROM node:20-bullseye AS builder
WORKDIR /app

COPY package*.json ./
RUN npm install

COPY tsconfig.json ./
COPY main ./main
COPY plugins ./plugins
COPY resources/rebar/package.json ./resources/rebar/package.json
RUN npm run build

FROM --platform=linux/amd64 altmp/altv-server:release
WORKDIR /altv

COPY server.toml /altv/server.toml
COPY --from=builder /app/dist /altv/resources/rebar
COPY --from=builder /app/resources/rebar/package.json /altv/resources/rebar/package.json

RUN cd /altv/resources/rebar && npm install --omit=dev

EXPOSE 7788/tcp 7788/udp
CMD ["./altv-server", "--config", "server.toml"]
