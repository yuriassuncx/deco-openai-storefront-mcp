# ─── Stage 1: build widget ────────────────────────────────────────────────────
FROM node:22-alpine AS builder

# Enable pnpm via corepack
RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

# Install dependencies first (layer cache)
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

# Copy source and build the widget HTML
COPY . .

# Build-time env vars needed by Vite (baked into the widget HTML)
ARG VITE_WIDGET_ACCENT_COLOR=#000000
ARG VITE_WIDGET_LOGO_URL=

ENV VITE_WIDGET_ACCENT_COLOR=$VITE_WIDGET_ACCENT_COLOR
ENV VITE_WIDGET_LOGO_URL=$VITE_WIDGET_LOGO_URL

RUN pnpm build

# ─── Stage 2: production image ────────────────────────────────────────────────
FROM node:22-alpine AS runner

RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

# Only production runtime deps
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile --prod

# Copy server source and pre-built widget
COPY server ./server
COPY assets ./assets
COPY tsconfig.json ./

# tsx is a dev dep but needed at runtime (no compile step); install it explicitly
RUN pnpm add tsx

# Non-root user for security
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
USER appuser

EXPOSE 7860

# MCP_ENDPOINT defaults to the public deco.cx storefront (fallback)
ENV MCP_ENDPOINT=https://storefront.deco.site/mcp
ENV PORT=7860

CMD ["node", "--import", "tsx/esm", "server/server.ts"]
