# ── Build stage ──────────────────────────────────────────────────────────────
FROM node:22-bookworm AS builder

# Install Bun (required for build scripts)
RUN curl -fsSL https://bun.sh/install | bash
ENV PATH="/root/.bun/bin:${PATH}"

RUN corepack enable

WORKDIR /app

# Install dependencies first (layer cache)
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
COPY ui/package.json ./ui/package.json
COPY patches ./patches
COPY scripts ./scripts

RUN pnpm install --frozen-lockfile

# Copy source and build
COPY . .
RUN pnpm build
# Force pnpm for UI build (Bun may fail on ARM/Synology architectures)
ENV YOYOCLAW_PREFER_PNPM=1
RUN pnpm ui:build

# Remove dev dependencies and test files
RUN pnpm prune --prod && \
    rm -rf test/ src/ vitest*.ts tsconfig*.json tsdown.config.ts \
           .git git-hooks scripts/ patches/

# ── Runtime stage ───────────────────────────────────────────────────────────
FROM node:22-bookworm-slim AS runtime

# Install dumb-init for proper signal handling
RUN apt-get update && \
    apt-get install -y --no-install-recommends dumb-init && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# Create non-root user
RUN groupadd -r yoyoclaw && \
    useradd -r -g yoyoclaw -m -d /home/yoyoclaw -s /bin/bash yoyoclaw

WORKDIR /app

# Copy built artifacts from builder
COPY --from=builder --chown=yoyoclaw:yoyoclaw /app/dist ./dist
COPY --from=builder --chown=yoyoclaw:yoyoclaw /app/node_modules ./node_modules
COPY --from=builder --chown=yoyoclaw:yoyoclaw /app/package.json ./package.json
COPY --from=builder --chown=yoyoclaw:yoyoclaw /app/yoyoclaw.mjs ./yoyoclaw.mjs
COPY --from=builder --chown=yoyoclaw:yoyoclaw /app/docs ./docs
COPY --from=builder --chown=yoyoclaw:yoyoclaw /app/extensions ./extensions
COPY --from=builder --chown=yoyoclaw:yoyoclaw /app/skills ./skills
COPY --from=builder --chown=yoyoclaw:yoyoclaw /app/assets ./assets

ENV NODE_ENV=production

# Create writable data directory
RUN mkdir -p /home/yoyoclaw/.yoyoclaw && \
    chown -R yoyoclaw:yoyoclaw /home/yoyoclaw/.yoyoclaw && \
    ln -sf /home/yoyoclaw/.yoyoclaw /home/yoyoclaw/.openclaw

# Security: run as non-root
USER yoyoclaw

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD node -e "const http=require('http');const r=http.get('http://127.0.0.1:18789/health',s=>{process.exit(s.statusCode===200?0:1)});r.on('error',()=>process.exit(1));r.end()"

EXPOSE 18789

# Use dumb-init for proper PID 1 behavior
ENTRYPOINT ["dumb-init", "--"]

# Bind to loopback by default for security.
# Override with: --bind lan --allow-public (requires explicit opt-in)
CMD ["node", "yoyoclaw.mjs", "gateway", "--allow-unconfigured"]
