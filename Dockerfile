# Dockerfile for OpenClaw Agent (Node.js)
FROM node:20-alpine AS builder

WORKDIR /app

# Install pnpm
RUN npm install -g pnpm

# Copy workspace config
COPY pnpm-workspace.yaml package.json ./

# Copy packages config (assuming monorepo structure, but we copy root for now)
# If there are local packages, we need to copy them too. 
# Based on file list, we have 'packages/' and 'extensions/'.
COPY packages/ packages/
COPY extensions/ extensions/
COPY apps/ apps/
COPY scripts/ scripts/
COPY patches/ patches/
COPY tsconfig.json .
COPY tsconfig.*.json .
COPY .npmrc .

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source
COPY src/ src/
COPY openclaw.mjs .
COPY .swc* .

# Build (if necessary, or just run tsx/node)
# The project seems to use 'tsdown' or just run via 'scripts/run-node.mjs'.
# We will use the 'build' script if it produces 'dist/', otherwise we run from source with tsx/loader.
# package.json says "main": "dist/index.js".
RUN pnpm build

FROM node:20-alpine AS runner

WORKDIR /app

COPY --from=builder /app/package.json .
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
# We might need other assets or local packages if they are referenced at runtime
COPY --from=builder /app/assets ./assets
COPY --from=builder /app/docs ./docs

# Env vars
ENV NODE_ENV=production
# STUDIO_URL will be injected by the Studio

# Entry point
CMD ["node", "dist/index.js"]