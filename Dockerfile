# GTA 5 alt:V MP server - based on official alt:V image
# linux/amd64 required: image has no Mac (arm64) build; runs via emulation on Docker Desktop
FROM --platform=linux/amd64 altmp/altv-server:release

# Optional: set defaults via env (override in docker-compose or at run)
ENV ALTV_NAME="My alt:V Server" \
    ALTV_HOST="0.0.0.0" \
    ALTV_PORT=7788 \
    ALTV_PLAYERS=64 \
    ALTV_DEBUG=false \
    ALTV_ANNOUNCE=true

# Copy custom server config (optional; set ALTV_USE_ENV_CONFIG=false to use file)
COPY server.toml /altv/server.toml

# Copy your resources into the container
COPY resources /altv/resources
# Install JS dependencies for resources that have package.json (e.g. database/mysql2)
RUN for dir in /altv/resources/*/; do [ -f "${dir}package.json" ] && (cd "$dir" && npm install --omit=dev); done || true

# Game server port (TCP + UDP)
EXPOSE 7788/tcp 7788/udp

# Default: use file config; override with env if you prefer
ENV ALTV_USE_ENV_CONFIG=false
