# Boltbot — Moltbot on EigenCompute TEE
# Base: Node 22 + Chromium for headless browser automation
# Must run as root (EigenCompute TEE constraint)
# Platform: linux/amd64 only

FROM node:22-bookworm

# Install Chromium + Xvfb + fonts for headless browser
RUN apt-get update && apt-get install -y --no-install-recommends \
    chromium \
    xvfb \
    fonts-liberation \
    fonts-noto-color-emoji \
    dbus \
    && rm -rf /var/lib/apt/lists/*

# Supervisor script to start Xvfb + Chromium + Node gateway
COPY deploy/start.sh /usr/local/bin/start.sh
RUN chmod +x /usr/local/bin/start.sh

WORKDIR /app

# Copy package files and install
COPY package.json pnpm-lock.yaml ./
RUN corepack enable && pnpm install --frozen-lockfile --prod

# Copy application code
COPY . .

# Build TypeScript
RUN pnpm build

# Expose gateway port
EXPOSE 18789

# EigenCompute TEE: must run as root
USER root

# Environment defaults
ENV DISPLAY=:99
ENV CHROMIUM_PATH=/usr/bin/chromium
ENV NODE_ENV=production

CMD ["/usr/local/bin/start.sh"]
