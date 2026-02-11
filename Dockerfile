FROM node:22-bookworm

# Install Bun for dependency install/build workflow.
RUN curl -fsSL https://bun.sh/install | bash
ENV PATH="/root/.bun/bin:${PATH}"

WORKDIR /app

# Install dependencies first for better layer caching.
COPY package.json ./
RUN bun install

# Copy application source and build artifacts.
COPY . .
RUN bun run build

ENV NODE_ENV=production
ENV OPENCLAW_GATEWAY_PORT=18789

# Run as non-root for runtime hardening.
RUN chown -R node:node /app
USER node

EXPOSE 18789
EXPOSE 18790

# Use the proven OpenClaw gateway invocation pattern.
CMD ["node", "openclaw.mjs", "gateway", "--allow-unconfigured", "--bind", "lan", "--port", "18789"]
