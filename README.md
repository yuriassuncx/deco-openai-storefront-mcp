---
title: Deco OpenAI Storefront MCP
emoji: 🛍️
colorFrom: blue
colorTo: indigo
sdk: docker
app_port: 7860
pinned: false
---

# deco-openai-storefront-mcp

An [OpenAI Storefront SDK](https://platform.openai.com/docs) MCP server that
connects ChatGPT to any [deco.cx](https://deco.cx)-powered storefront (Shopify,
VTEX, Wake and others). It proxies commerce operations through the upstream
deco.cx `/mcp` endpoint and renders a rich chat-embedded widget.

If no storefront endpoint is configured, the server falls back to the public
`storefront.deco.site` demo store automatically.

---

## Features

- Full-text product search with images and prices
- Product detail pages
- Shopping cart — add, update quantity, remove, checkout
- Wishlist — add / remove products
- User profile view
- Dark / light mode widget that adapts to the host chat theme
- Single self-contained HTML widget (no CDN dependency)

---

## Quick start (local)

### Prerequisites

| Tool    | Version |
| ------- | ------- |
| Node.js | ≥ 22    |
| pnpm    | ≥ 10    |

### 1. Clone

```bash
git clone https://github.com/your-org/deco-openai-storefront-mcp.git
cd deco-openai-storefront-mcp
```

### 2. Install dependencies

```bash
pnpm install
```

### 3. Configure environment

Copy the example env file and fill in your values:

```bash
cp .env.example .env
```

| Variable                   | Required | Description                                                                            |
| -------------------------- | -------- | -------------------------------------------------------------------------------------- |
| `MCP_ENDPOINT`             | No       | Upstream deco.cx MCP URL. Defaults to `https://storefront.deco.site/mcp` (demo store). |
| `STORE_NAME`               | No       | Display name shown in the widget header.                                               |
| `VITE_WIDGET_ACCENT_COLOR` | No       | Hex accent color for buttons/highlights. Default `#000000`.                            |
| `VITE_WIDGET_LOGO_URL`     | No       | URL to the store logo shown in the widget.                                             |
| `PORT`                     | No       | HTTP port. Default `3000`.                                                             |
| `WIDGET_IMAGE_DOMAINS`     | No       | Comma-separated extra CDN domains for product images.                                  |

### 4. Build the widget

```bash
pnpm build
```

This compiles the React widget into a single HTML file at
`assets/storefront-widget.html`.

### 5. Start the server

```bash
pnpm start
```

The server starts on `http://localhost:3000`.

| Endpoint             | Description                 |
| -------------------- | --------------------------- |
| `GET  /mcp`          | SSE stream (MCP connection) |
| `POST /mcp/messages` | MCP JSON-RPC messages       |
| `GET  /healthz`      | Health check                |

### Development (hot-reload)

```bash
pnpm dev
```

---

## Deploy to Render

The project ships with a `render.yaml` and a `Dockerfile` — deploy is a few
clicks.

### 1. Push to GitHub

```bash
git add .
git commit -m "chore: initial commit"
git push -u origin main
```

### 2. Create a new Render service

1. Go to [render.com](https://render.com) → **New → Web Service**
2. Connect your GitHub repository
3. Render will detect `render.yaml` automatically. Click **Apply**.

### 3. Set environment variables

In **Render dashboard → Service → Environment**, set at minimum:

| Variable       | Value                                                         |
| -------------- | ------------------------------------------------------------- |
| `MCP_ENDPOINT` | Your storefront MCP URL, e.g. `https://mystore.deco.site/mcp` |
| `STORE_NAME`   | Your store display name                                       |

For widget appearance (accent color, logo), set them as **Docker Build Args** in
**Settings → Build & Deploy → Docker Build Args**:

```
VITE_WIDGET_ACCENT_COLOR=#e11d48
VITE_WIDGET_LOGO_URL=https://mystore.com/logo.png
```

> **Note:** These are baked into the widget HTML at build time by Vite. Changing
> them requires a new deploy.

### 4. Connect to ChatGPT

Once deployed, copy your Render public URL (e.g.
`https://deco-storefront-mcp.onrender.com`) and add it as an MCP connector in
ChatGPT:

- **MCP endpoint (SSE):** `https://deco-storefront-mcp.onrender.com/mcp`

---

## Deploy with Docker (self-hosted)

### Build

```bash
docker build \
  --build-arg VITE_WIDGET_ACCENT_COLOR=#e11d48 \
  --build-arg VITE_WIDGET_LOGO_URL=https://mystore.com/logo.png \
  -t deco-storefront-mcp .
```

### Run

```bash
docker run -p 3000:3000 \
  -e MCP_ENDPOINT=https://mystore.deco.site/mcp \
  -e STORE_NAME="My Store" \
  deco-storefront-mcp
```

---

## Project structure

```
├── server/          # Node.js MCP server (TypeScript)
│   ├── server.ts    # HTTP server, SSE transport, resource serving
│   ├── lib/
│   │   └── decoLive.ts  # deco.cx upstream proxy and response normalizer
│   └── tools/       # MCP tool handlers (search, cart, wishlist, …)
├── src/             # React widget (built by Vite → assets/storefront-widget.html)
│   ├── App.tsx      # Root component and state management
│   ├── components/  # CartView, ProductGrid, WishlistView, …
│   └── hooks/       # useOpenAI — sendMessage, callTool, openExternal
├── assets/          # Build output (git-ignored, generated by pnpm build)
├── build.mts        # Vite build script
├── Dockerfile
├── render.yaml
└── .env.example
```

---

## Customising for your store

1. Set `MCP_ENDPOINT` to your deco.cx storefront MCP URL.
2. Set `VITE_WIDGET_ACCENT_COLOR` to your brand primary color.
3. Set `VITE_WIDGET_LOGO_URL` to your logo.
4. If product images don't load, add your CDN domains to `WIDGET_IMAGE_DOMAINS`
   (comma-separated).

That's it — no code changes required for a different deco.cx storefront.
