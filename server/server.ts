/**
 * deco.cx Storefront MCP Server
 *
 * Template MCP server for any deco.cx-powered storefront.
 * Drop your MCP_ENDPOINT in .env and this server proxies all commerce
 * operations through the upstream deco.cx /mcp endpoint, rendering a
 * rich chat-embedded widget via OpenAI's storefront widget protocol.
 *
 * Endpoints:
 *   GET  /mcp          — SSE stream (MCP connection)
 *   POST /mcp/messages — MCP JSON-RPC messages
 *   GET  /healthz      — Service health check
 *
 * Tools:
 *   search_products   — Full-text product search
 *   get_product       — Product detail page
 *   view_cart         — View current shopping cart
 *   add_to_cart       — Add item to cart (sku, quantity, size)
 *   update_cart_item  — Update / remove cart item (quantity 0 = remove)
 *   view_wishlist     — View saved wishlist
 *   wishlist_toggle   — Add or remove product from wishlist
 *   view_user         — View current user profile
 */

import {
  createServer,
  type IncomingMessage,
  type ServerResponse,
} from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import {
  CallToolRequestSchema,
  ListResourceTemplatesRequestSchema,
  ListResourcesRequestSchema,
  ListToolsRequestSchema,
  ReadResourceRequestSchema,
  type CallToolRequest,
  type ListResourceTemplatesRequest,
  type ListResourcesRequest,
  type ListToolsRequest,
  type ReadResourceRequest,
  type Resource,
  type ResourceTemplate,
  type Tool,
} from "@modelcontextprotocol/sdk/types.js";

import { MCP_ENDPOINT } from "./lib/decoLive.js";
import { searchProductsInputSchema, handleSearchProducts } from "./tools/searchProducts.js";
import { getProductInputSchema, handleGetProduct } from "./tools/getProduct.js";
import {
  viewCartInputSchema,
  addToCartInputSchema,
  updateCartItemInputSchema,
  handleViewCart,
  handleAddToCart,
  handleUpdateCartItem,
} from "./tools/cart.js";
import {
  viewWishlistInputSchema,
  wishlistToggleInputSchema,
  handleViewWishlist,
  handleWishlistToggle,
} from "./tools/wishlist.js";
import { viewUserInputSchema, handleViewUser } from "./tools/user.js";

// ─── Constants ────────────────────────────────────────────────────────────────

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, "..");
const ASSETS_DIR = path.resolve(ROOT_DIR, "assets");

const WIDGET_NAME = "storefront-widget";
const WIDGET_URI = "ui://widget/storefront-widget.html";
const MIME_TYPE = "text/html+skybridge";
const SERVER_NAME = "deco-storefront";
const SERVER_VERSION = "0.1.0";
const STORE_NAME = process.env.STORE_NAME ?? "Storefront";
const STOREFRONT_URL = MCP_ENDPOINT.replace(/\/mcp\/?$/, "");

// Extra image/resource domains (comma-separated, set per-store in .env)
const WIDGET_IMAGE_DOMAINS = (process.env.WIDGET_IMAGE_DOMAINS ?? "")
  .split(",")
  .map((d) => d.trim())
  .filter(Boolean);

// Common CDN domains used by deco.cx storefronts across platforms.
// Add store-specific CDN origins via WIDGET_IMAGE_DOMAINS in .env.
const COMMON_RESOURCE_DOMAINS = [
  "https://cdn.shopify.com",          // Shopify CDN (all Shopify stores)
  "https://shopify.com",
  "https://lojafarm.vtexassets.com",  // VTEX assets
  "https://lojafarm.vteximg.com.br",  // VTEX images
];

// Derive allowed CSP domains from the upstream MCP endpoint + known CDNs
function getWidgetCspDomains() {
  try {
    const origin = new URL(MCP_ENDPOINT).origin;
    return {
      connectDomains: [origin],
      resourceDomains: [
        origin,
        ...COMMON_RESOURCE_DOMAINS,
        ...WIDGET_IMAGE_DOMAINS,
      ],
    };
  } catch {
    return {
      connectDomains: [] as string[],
      resourceDomains: [...COMMON_RESOURCE_DOMAINS, ...WIDGET_IMAGE_DOMAINS],
    };
  }
}

const widgetCspDomains = getWidgetCspDomains();

// ─── Widget HTML ──────────────────────────────────────────────────────────────

function readWidgetHtml(): string {
  if (!fs.existsSync(ASSETS_DIR)) {
    throw new Error(
      `Widget assets not found. Expected: ${ASSETS_DIR}. Run "pnpm run build" first.`
    );
  }

  const directPath = path.join(ASSETS_DIR, `${WIDGET_NAME}.html`);
  if (fs.existsSync(directPath)) {
    return fs.readFileSync(directPath, "utf8");
  }

  // fallback to hash-named file (e.g. storefront-widget-2d2b.html)
  const candidates = fs
    .readdirSync(ASSETS_DIR)
    .filter((f) => f.startsWith(`${WIDGET_NAME}-`) && f.endsWith(".html"))
    .sort();

  const fallback = candidates[candidates.length - 1];
  if (fallback) {
    return fs.readFileSync(path.join(ASSETS_DIR, fallback), "utf8");
  }

  throw new Error(
    `Widget HTML for "${WIDGET_NAME}" not found in ${ASSETS_DIR}. Run "pnpm run build".`
  );
}

const widgetHtml = readWidgetHtml();

// ─── Descriptor meta ──────────────────────────────────────────────────────────

// Capabilities map: fixed tool names used by this server.
// Injected into every tool result _meta so the widget can call tools by name.
const TOOL_CAPABILITIES = {
  search: "search_products",
  productDetail: "get_product",
  cartAdd: "add_to_cart",
  cartUpdate: "update_cart_item",
  wishlistToggle: "wishlist_toggle",
} as const;

function descriptorMeta() {
  return {
    // Standard MCP Apps field (preferred by current SDK)
    ui: { resourceUri: WIDGET_URI, visibility: ["model", "app"] },
    // OpenAI compatibility alias
    "openai/outputTemplate": WIDGET_URI,
    "openai/toolInvocation/invoking": `Abrindo ${STORE_NAME}…`,
    "openai/toolInvocation/invoked": `Widget ${STORE_NAME} pronto`,
    "openai/widgetAccessible": true,
  };
}

// ─── Tool registry ────────────────────────────────────────────────────────────

const tools: Tool[] = [
  {
    name: "search_products",
    title: `Buscar Produtos — ${STORE_NAME}`,
    description:
      "Busca produtos por texto livre, intenção ou categoria. Suporta linguagem natural como " +
      "'vestido floral para festa', 'look casual de verão', 'algo mais barato', " +
      "'você tem vestidos longos?'. Se o usuário pedir recomendações sem query específica, passe string vazia.",
    inputSchema: searchProductsInputSchema,
    _meta: descriptorMeta(),
    annotations: { destructiveHint: false, openWorldHint: false, readOnlyHint: true },
  },
  {
    name: "get_product",
    title: "Ver Detalhe do Produto",
    description:
      "Exibe detalhes completos de um produto: descrição, medidas, fotos, variantes, preço e parcelamento.",
    inputSchema: getProductInputSchema,
    _meta: descriptorMeta(),
    annotations: { destructiveHint: false, openWorldHint: false, readOnlyHint: true },
  },
  {
    name: "view_cart",
    title: "Ver Carrinho",
    description: "Exibe o carrinho de compras atual com itens, totais e descontos.",
    inputSchema: viewCartInputSchema,
    _meta: descriptorMeta(),
    annotations: { destructiveHint: false, openWorldHint: false, readOnlyHint: true },
  },
  {
    name: "add_to_cart",
    title: "Adicionar ao Carrinho",
    description: "Adiciona um produto ao carrinho com SKU, tamanho e quantidade.",
    inputSchema: addToCartInputSchema,
    _meta: descriptorMeta(),
    annotations: { destructiveHint: false, openWorldHint: false, readOnlyHint: false },
  },
  {
    name: "update_cart_item",
    title: "Atualizar Item do Carrinho",
    description:
      "Altera a quantidade de um item no carrinho. Passe quantity=0 para remover o item.",
    inputSchema: updateCartItemInputSchema,
    _meta: descriptorMeta(),
    annotations: { destructiveHint: false, openWorldHint: false, readOnlyHint: false },
  },
  {
    name: "view_wishlist",
    title: "Ver Lista de Desejos",
    description: "Exibe os produtos salvos na lista de desejos.",
    inputSchema: viewWishlistInputSchema,
    _meta: descriptorMeta(),
    annotations: { destructiveHint: false, openWorldHint: false, readOnlyHint: true },
  },
  {
    name: "wishlist_toggle",
    title: "Favoritar / Desfavoritar Produto",
    description:
      "Adiciona ou remove um produto da lista de desejos. Use action='add' ou action='remove'.",
    inputSchema: wishlistToggleInputSchema,
    _meta: descriptorMeta(),
    annotations: { destructiveHint: false, openWorldHint: false, readOnlyHint: false },
  },
  {
    name: "view_user",
    title: "Ver Perfil do Usuário",
    description: "Exibe os dados do usuário logado (nome, e-mail, endereços).",
    inputSchema: viewUserInputSchema,
    _meta: descriptorMeta(),
    annotations: { destructiveHint: false, openWorldHint: false, readOnlyHint: true },
  },
];

// ─── Resource registry ────────────────────────────────────────────────────────

const resources: Resource[] = [
  {
    uri: WIDGET_URI,
    name: `${STORE_NAME} Storefront Widget`,
    description: `Widget interativo para navegação e compra na loja ${STORE_NAME}.`,
    mimeType: MIME_TYPE,
    _meta: descriptorMeta(),
  },
];

const resourceTemplates: ResourceTemplate[] = [
  {
    uriTemplate: WIDGET_URI,
    name: `${STORE_NAME} Storefront Widget`,
    description: `Widget interativo ${STORE_NAME}.`,
    mimeType: MIME_TYPE,
    _meta: descriptorMeta(),
  },
];

// ─── Tool execution ───────────────────────────────────────────────────────────

export async function executeToolCall(
  toolName: string,
  args: Record<string, unknown>
) {
  switch (toolName) {
    case "search_products":
      return handleSearchProducts(args);
    case "get_product":
      return handleGetProduct(args);
    case "view_cart":
      return handleViewCart(args);
    case "add_to_cart":
      return handleAddToCart(args);
    case "update_cart_item":
      return handleUpdateCartItem(args);
    case "view_wishlist":
      return handleViewWishlist(args);
    case "wishlist_toggle":
      return handleWishlistToggle(args);
    case "view_user":
      return handleViewUser(args);
    default:
      throw new Error(`Ferramenta desconhecida: ${toolName}`);
  }
}

// ─── MCP Server factory ───────────────────────────────────────────────────────

function createStorefrontServer(): Server {
  const server = new Server(
    { name: SERVER_NAME, version: SERVER_VERSION },
    { capabilities: { resources: {}, tools: {} } }
  );

  server.setRequestHandler(
    ListResourcesRequestSchema,
    async (_req: ListResourcesRequest) => ({ resources })
  );

  server.setRequestHandler(
    ReadResourceRequestSchema,
    async (_req: ReadResourceRequest) => ({
      contents: [
        {
          uri: WIDGET_URI,
          mimeType: MIME_TYPE,
          text: widgetHtml,
          _meta: {
            ...descriptorMeta(),
            // Standard CSP object (preferred by current SDK)
            ui: {
              resourceUri: WIDGET_URI,
              csp: {
                connectDomains: widgetCspDomains.connectDomains,
                resourceDomains: widgetCspDomains.resourceDomains,
              },
            },
            // Human-readable summary surfaced to the model when the widget loads
            "openai/widgetDescription":
              `Widget de e-commerce interativo para ${STORE_NAME}. ` +
              `Permite buscar produtos, ver detalhes, gerenciar carrinho e lista de desejos.`,
            // Legacy CSP key for older ChatGPT clients
            "openai/widgetCSP": {
              connect_domains: widgetCspDomains.connectDomains,
              resource_domains: widgetCspDomains.resourceDomains,
            },
          },
        },
      ],
    })
  );

  server.setRequestHandler(
    ListResourceTemplatesRequestSchema,
    async (_req: ListResourceTemplatesRequest) => ({ resourceTemplates })
  );

  server.setRequestHandler(
    ListToolsRequestSchema,
    async (_req: ListToolsRequest) => ({ tools })
  );

  server.setRequestHandler(
    CallToolRequestSchema,
    async (request: CallToolRequest) => {
      const meta = descriptorMeta();
      const result = await executeToolCall(
        request.params.name,
        request.params.arguments ?? {}
      );

      return {
        ...result,
        _meta: {
          // OpenAI invocation status labels
          "openai/toolInvocation/invoking": meta["openai/toolInvocation/invoking"],
          "openai/toolInvocation/invoked": meta["openai/toolInvocation/invoked"],
          // Private widget-only metadata (hidden from model)
          storeName: STORE_NAME,
          capabilities: TOOL_CAPABILITIES,
          storefrontUrl: STOREFRONT_URL,
        },
      };
    }
  );

  return server;
}

// ─── HTTP / SSE server ────────────────────────────────────────────────────────

type SessionRecord = { server: Server; transport: SSEServerTransport };
const sessions = new Map<string, SessionRecord>();

const ssePath = "/mcp";
const postPath = "/mcp/messages";

function writeJsonResponse(
  res: ServerResponse,
  statusCode: number,
  payload: Record<string, unknown>
) {
  res.writeHead(statusCode, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
  });
  res.end(JSON.stringify(payload, null, 2));
}

function serviceStatusPayload() {
  return {
    ok: true,
    service: SERVER_NAME,
    store: STORE_NAME,
    version: SERVER_VERSION,
    uptimeSeconds: Math.round(process.uptime()),
    widget: {
      name: WIDGET_NAME,
      uri: WIDGET_URI,
      loaded: widgetHtml.length > 0,
      sizeBytes: widgetHtml.length,
    },
    upstream: {
      endpoint: MCP_ENDPOINT,
    },
    mcp: {
      ssePath,
      postPath,
      activeSessions: sessions.size,
    },
    timestamp: new Date().toISOString(),
  };
}

async function handleSseRequest(res: ServerResponse) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  const server = createStorefrontServer();
  const transport = new SSEServerTransport(postPath, res);
  const sessionId = transport.sessionId;

  sessions.set(sessionId, { server, transport });

  transport.onclose = async () => {
    sessions.delete(sessionId);
    await server.close();
  };

  transport.onerror = (err) => {
    console.error("[SSE error]", err);
  };

  try {
    await server.connect(transport);
  } catch (err) {
    sessions.delete(sessionId);
    console.error("[SSE connect error]", err);
    if (!res.headersSent) {
      res.writeHead(500).end("Failed to establish SSE connection");
    }
  }
}

async function handlePostMessage(req: IncomingMessage, res: ServerResponse, url: URL) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "content-type");

  const sessionId = url.searchParams.get("sessionId");
  if (!sessionId) {
    res.writeHead(400).end("Missing sessionId");
    return;
  }

  const session = sessions.get(sessionId);
  if (!session) {
    res.writeHead(404).end("Unknown session");
    return;
  }

  try {
    await session.transport.handlePostMessage(req, res);
  } catch (err) {
    console.error("[POST message error]", err);
    if (!res.headersSent) {
      res.writeHead(500).end("Failed to process message");
    }
  }
}

// ─── HTTP server wiring ───────────────────────────────────────────────────────

const port = Number(process.env.PORT ?? 3000);
let shutdownInProgress = false;

const httpServer = createServer(async (req: IncomingMessage, res: ServerResponse) => {
  if (!req.url) {
    res.writeHead(400).end("Missing URL");
    return;
  }

  const url = new URL(req.url, `http://${req.headers.host ?? "localhost"}`);

  // CORS pre-flight
  if (req.method === "OPTIONS" && (url.pathname === ssePath || url.pathname === postPath)) {
    res.writeHead(204, {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "content-type",
    });
    res.end();
    return;
  }

  // Health check
  if ((req.method === "GET" || req.method === "HEAD") && url.pathname === "/healthz") {
    if (req.method === "HEAD") {
      res.writeHead(200, { "cache-control": "no-store" });
      res.end();
      return;
    }
    writeJsonResponse(res, 200, serviceStatusPayload());
    return;
  }

  // Root
  if (req.method === "GET" && url.pathname === "/") {
    writeJsonResponse(res, 200, {
      ...serviceStatusPayload(),
      documentation: { healthcheck: "/healthz", mcpSse: ssePath, mcpPost: postPath },
    });
    return;
  }

  // MCP SSE stream
  if (req.method === "GET" && url.pathname === ssePath) {
    await handleSseRequest(res);
    return;
  }

  // MCP JSON-RPC messages
  if (req.method === "POST" && url.pathname === postPath) {
    await handlePostMessage(req, res, url);
    return;
  }

  res.writeHead(404).end("Not Found");
});

httpServer.on("clientError", (err: Error, socket) => {
  console.error("[HTTP clientError]", err);
  socket.destroy();
});

export function startHttpServer(listenPort = port) {
  httpServer.listen(listenPort, () => {
    console.log(`🛍️  ${STORE_NAME} — deco.cx Storefront MCP Server`);
    console.log(`   SSE endpoint  : http://localhost:${listenPort}${ssePath}`);
    console.log(`   POST endpoint : http://localhost:${listenPort}${postPath}`);
    console.log(`   Healthcheck   : http://localhost:${listenPort}/healthz`);
    console.log(`   Upstream MCP  : ${MCP_ENDPOINT}`);
    console.log(`   Widget        : ${WIDGET_URI} (${(widgetHtml.length / 1024).toFixed(0)} KB)`);
  });

  return httpServer;
}

export async function stopHttpServer() {
  if (!httpServer.listening) return;

  await Promise.all(
    Array.from(sessions.values()).map(async ({ server }) => {
      try {
        await server.close();
      } catch (error) {
        console.error("[shutdown] failed to close MCP session", error);
      }
    })
  );
  sessions.clear();

  await new Promise<void>((resolve, reject) => {
    httpServer.close((error) => {
      if (error) { reject(error); return; }
      resolve();
    });
  });
}

async function shutdown(signal: NodeJS.Signals) {
  if (shutdownInProgress) return;
  shutdownInProgress = true;
  console.log(`[shutdown] received ${signal}; closing MCP server`);

  try {
    await stopHttpServer();
    process.exit(0);
  } catch (error) {
    console.error("[shutdown] failed to close cleanly", error);
    process.exit(1);
  }
}

// ─── Entrypoint ───────────────────────────────────────────────────────────────

const isMainModule = process.argv[1]
  ? pathToFileURL(process.argv[1]).href === import.meta.url
  : false;

if (isMainModule) {
  process.on("SIGINT", () => { void shutdown("SIGINT"); });
  process.on("SIGTERM", () => { void shutdown("SIGTERM"); });
  process.on("unhandledRejection", (reason) => {
    console.error("[unhandledRejection]", reason);
  });
  process.on("uncaughtException", (err) => {
    console.error("[uncaughtException]", err);
  });
  startHttpServer();
}
