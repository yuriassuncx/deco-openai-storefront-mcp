/**
 * decoLive.ts — deco.cx storefront MCP proxy.
 *
 * This module is the equivalent of farmRioLive.ts in the Farm Rio example,
 * but instead of calling a proprietary VTEX API directly, it proxies all
 * commerce operations through the upstream deco.cx /mcp endpoint.
 *
 * Architecture:
 *   ChatGPT → this MCP server → deco.cx /mcp (upstream)
 *
 * The upstream deco.cx MCP exposes tools whose names vary by integration
 * (VTEX, Shopify, Wake, etc.). We discover them once at startup by calling
 * tools/list and matching against known resolveTypes.
 */

// ─── Config ───────────────────────────────────────────────────────────────────

export const MCP_ENDPOINT =
  process.env.MCP_ENDPOINT ?? "https://storefront.deco.site/mcp";

// ─── Transport helpers ────────────────────────────────────────────────────────

let _rpcId = 1;

function extractSseJson(body: string): string | null {
  for (const event of body.split(/\r?\n\r?\n/g)) {
    const lines = event.split(/\r?\n/g).filter((l) => l.startsWith("data:"));
    if (!lines.length) continue;
    const payload = lines
      .map((l) => l.slice(5).trimStart())
      .join("\n")
      .trim();
    if (payload && payload !== "[DONE]") return payload;
  }
  return null;
}

/** Send a JSON-RPC 2.0 request to an MCP HTTP endpoint. */
async function rpc<T>(
  endpoint: string,
  method: string,
  params?: Record<string, unknown>,
): Promise<T> {
  const body = { jsonrpc: "2.0", id: _rpcId++, method, params };

  const res = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json, text/event-stream",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    throw new Error(`Upstream MCP HTTP ${res.status} for "${method}": ${await res.text().catch(() => "")}`);
  }

  const raw = await res.text();
  if (!raw.trim()) throw new Error(`Upstream MCP returned empty response for "${method}"`);

  let json: { result?: T; error?: { code: number; message: string } };
  try {
    json = JSON.parse(raw);
  } catch {
    const sse = extractSseJson(raw);
    if (!sse) throw new Error(`Upstream MCP returned non-JSON, non-SSE for "${method}"`);
    json = JSON.parse(sse);
  }

  if (json.error) {
    throw new Error(`Upstream MCP error [${json.error.code}]: ${json.error.message}`);
  }
  return json.result as T;
}

/** Returns the legacy /mcp/messages fallback for a /mcp URL, or null. */
function legacyEndpoint(endpoint: string): string | null {
  return endpoint.endsWith("/mcp") ? `${endpoint}/messages` : null;
}

/** rpc with automatic fallback to legacy /mcp/messages endpoint. */
async function rpcWithFallback<T>(
  method: string,
  params?: Record<string, unknown>,
): Promise<T> {
  const legacy = legacyEndpoint(MCP_ENDPOINT);
  try {
    return await rpc<T>(MCP_ENDPOINT, method, params);
  } catch (err) {
    if (!legacy) throw err;
    return await rpc<T>(legacy, method, params);
  }
}

// ─── Capability discovery ─────────────────────────────────────────────────────

/** resolveType arrays that identify each commerce capability. */
const CAPABILITY_RESOLVE_TYPES: Record<string, string[]> = {
  productSearch: [
    "shopify/loaders/ProductList.ts",
    "shopify/loaders/ProductListingPage.ts",
    "vtex/loaders/intelligentSearch/productListingPage.ts",
    "vtex/loaders/intelligentSearch/productList.ts",
    "vtex/loaders/legacy/productListingPage.ts",
    "vtex/loaders/legacy/productList.ts",
    "wake/loaders/productListingPage.ts",
    "wake/loaders/productList.ts",
    "nuvemshop/loaders/productListingPage.ts",
    "nuvemshop/loaders/productList.ts",
    "vnda/loaders/productListingPage.ts",
    "vnda/loaders/productList.ts",
    "linx/loaders/product/listingPage.ts",
    "linx/loaders/product/list.ts",
    "commerce/loaders/extensions/products.ts",
    "commerce/loaders/product/products.ts",
  ],
  productDetail: [
    "shopify/loaders/ProductDetailsPage.ts",
    "vtex/loaders/intelligentSearch/productDetailsPage.ts",
    "vtex/loaders/legacy/productDetailsPage.ts",
    "vtex/loaders/product/extensions/detailsPage.ts",
    "wake/loaders/productDetailsPage.ts",
    "nuvemshop/loaders/productDetailsPage.ts",
    "vnda/loaders/productDetailsPage.ts",
    "linx/loaders/product/detailsPage.ts",
    "commerce/loaders/extensions/productDetailsPage.ts",
    "commerce/loaders/product/extensions/detailsPage.ts",
  ],
  cartView: [
    "shopify/loaders/cart.ts",
    "vtex/loaders/cart.ts",
    "wake/loaders/cart.ts",
    "nuvemshop/loaders/cart.ts",
    "vnda/loaders/cart.ts",
    "linx/loaders/cart.ts",
    "site/loaders/minicart.ts",
  ],
  cartAdd: [
    "shopify/actions/cart/addItems.ts",
    "vtex/actions/cart/addItems.ts",
    "wake/actions/cart/addItems.ts",
    "wake/actions/cart/addItem.ts",
    "nuvemshop/actions/cart/addItems.ts",
    "vnda/actions/cart/addItems.ts",
    "linx/actions/cart/addItem.ts",
  ],
  cartUpdate: [
    "shopify/actions/cart/updateItems.ts",
    "vtex/actions/cart/updateItems.ts",
    "wake/actions/cart/updateItemQuantity.ts",
    "nuvemshop/actions/cart/updateItems.ts",
    "vnda/actions/cart/updateItem.ts",
    "linx/actions/cart/updateItem.ts",
  ],
  wishlistView: [
    "vtex/loaders/wishlist.ts",
    "vtex/loaders/product/wishlist.ts",
    "wake/loaders/wishlist.ts",
    "linx/loaders/wishlist/search.ts",
    "site/loaders/wishlist.ts",
  ],
  wishlistToggle: [
    "vtex/actions/wishlist/addItem.ts",
    "wake/actions/wishlist/addProduct.ts",
    "linx/actions/wishlist/addItem.ts",
    "site/actions/wishlist/submit.ts",
  ],
  userView: [
    "shopify/loaders/user.ts",
    "vtex/loaders/user.ts",
    "wake/loaders/user.ts",
    "linx/loaders/user.ts",
    "site/loaders/user.ts",
  ],
};

export type UpstreamTool = {
  name: string;
  resolveType?: string;
  description?: string;
  inputSchema: Record<string, unknown>;
};

type ToolRegistry = {
  /** capability name → upstream tool (best match found) */
  capabilityMap: Map<string, UpstreamTool>;
  /** all tools from upstream, de-duped */
  allTools: UpstreamTool[];
};

let _registry: ToolRegistry | null = null;

/** Fetch and cache the upstream tool registry. One call per process. */
export async function getToolRegistry(): Promise<ToolRegistry> {
  if (_registry) return _registry;

  let tools: UpstreamTool[] = [];
  try {
    const result = await rpcWithFallback<{ tools?: UpstreamTool[] }>("tools/list");
    tools = result?.tools ?? [];
  } catch (err) {
    console.error("[decoLive] tools/list failed:", err);
  }

  // Filter out internal openai-storefront tools
  const publicTools = tools.filter(
    (t) =>
      !t.name.startsWith("openai-storefront/") &&
      !t.name.startsWith("ListStoreTools") &&
      !t.name.startsWith("ExecuteStoreTool"),
  );

  // Build capability map
  const capabilityMap = new Map<string, UpstreamTool>();
  for (const [cap, resolveTypes] of Object.entries(CAPABILITY_RESOLVE_TYPES)) {
    for (const tool of publicTools) {
      if (tool.resolveType && resolveTypes.includes(tool.resolveType)) {
        capabilityMap.set(cap, tool);
        break;
      }
    }
  }

  _registry = { capabilityMap, allTools: publicTools };

  const caps = [...capabilityMap.keys()];
  console.log(`[decoLive] Discovered ${publicTools.length} tools. Capabilities: ${caps.join(", ") || "none"}`);

  return _registry;
}



// ─── Arg translation ──────────────────────────────────────────────────────────

function isShopify(toolName: string) {
  return toolName.toLowerCase().includes("shopify");
}
function isVtex(toolName: string) {
  return toolName.toLowerCase().includes("vtex");
}

function translateArgs(
  capability: string,
  args: Record<string, unknown>,
  toolName: string,
): Record<string, unknown> {
  const asStr = (v: unknown) => (typeof v === "string" ? v : undefined);
  const asNum = (v: unknown) => (typeof v === "number" ? v : undefined);

  switch (capability) {
    case "productSearch": {
      const query = asStr(args.query) ?? "";
      const count = asNum(args.count) ?? 10;
      return { props: { query, count, sort: "" } };
    }

    case "productDetail": {
      const slug = asStr(args.slug) ?? asStr(args.url) ?? asStr(args.productId) ?? "";
      return { slug };
    }

    case "cartView":
      return {};

    case "cartAdd": {
      const sku = asStr(args.sku) ?? asStr(args.productId) ?? "";
      const quantity = asNum(args.quantity) ?? 1;
      if (isShopify(toolName)) return { lines: [{ merchandiseId: sku, quantity }] };
      if (isVtex(toolName)) return { orderItems: [{ id: sku, quantity }] };
      return args;
    }

    case "cartUpdate": {
      const lineId = asStr(args.lineId) ?? "";
      const quantity = asNum(args.quantity) ?? 0;
      const productId = asStr(args.productId) ?? asStr(args.sku) ?? "";
      if (isShopify(toolName)) return { lines: [{ id: lineId, quantity }] };
      if (isVtex(toolName)) return { orderItems: [{ uniqueId: lineId, quantity }] };
      return { lineId, quantity, productId };
    }

    case "wishlistView":
      return {};

    case "wishlistToggle": {
      const productID = asStr(args.productID) ?? "";
      const productGroupID = asStr(args.productGroupID) ?? productID;
      const action = asStr(args.action) ?? "add";
      if (toolName.toLowerCase().includes("site")) {
        return { productID, productGroupID };
      }
      return { productID, productGroupID, action };
    }

    case "userView":
      return {};

    default:
      return args;
  }
}

// ─── Public API ───────────────────────────────────────────────────────────────

export type McpToolResult = {
  content?: Array<{ type: string; text?: string }>;
  structuredContent?: Record<string, unknown>;
  isError?: boolean;
  _meta?: Record<string, unknown>;
};

type JsonRecord = Record<string, unknown>;

function isRecord(value: unknown): value is JsonRecord {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function asString(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : undefined;
}

function asNumber(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return undefined;
}

function getNested(value: unknown, ...keys: string[]): unknown {
  let current: unknown = value;
  for (const key of keys) {
    if (Array.isArray(current)) {
      const index = Number(key);
      if (!Number.isInteger(index)) return undefined;
      current = current[index];
      continue;
    }
    if (!isRecord(current)) return undefined;
    current = current[key];
  }
  return current;
}

function getNestedRecord(value: unknown, ...keys: string[]): JsonRecord | undefined {
  const nested = getNested(value, ...keys);
  return isRecord(nested) ? nested : undefined;
}

function getNestedArray(value: unknown, ...keys: string[]): unknown[] {
  const nested = getNested(value, ...keys);
  return Array.isArray(nested) ? nested : [];
}

function parseJsonText(text: string | undefined): unknown {
  if (!text) return undefined;
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
}

// ─── Schema.org → Widget product mapper ──────────────────────────────────────

interface SchemaImage { url?: string; alternateName?: string }
interface SchemaProp  { name?: string; value?: string; "@id"?: string }
interface SchemaGroup {
  productGroupID?: string;
  hasVariant?: SchemaVariant[];
  url?: string;
  name?: string;
  additionalProperty?: SchemaProp[];
  image?: SchemaImage[];
}
interface SchemaVariant {
  productID?: string;
  url?: string;
  name?: string;
  description?: string;
  sku?: string;
  brand?: { name?: string };
  additionalProperty?: SchemaProp[];
  isVariantOf?: SchemaGroup;
  image?: SchemaImage[];
  offers?: {
    lowPrice?: number;
    highPrice?: number;
    offers?: Array<{ price?: number; availability?: string }>;
  };
}

function mapVariantToProduct(v: SchemaVariant): Record<string, unknown> | null {
  const group = v.isVariantOf;
  const groupId = group?.productGroupID ?? v.productID;
  if (!groupId) return null;

  const variantProps = v.additionalProperty ?? [];
  const groupProps   = group?.additionalProperty ?? [];
  const allProps     = [...variantProps, ...groupProps];

  const color    = variantProps.find(p => p.name === "Color")?.value ?? "";
  const category = allProps.find(p => p.name === "COLLECTION")?.value ?? "";

  // Collect sizes from group variants
  const sizeSet = new Set<string>();
  for (const gv of group?.hasVariant ?? []) {
    const s = (gv.additionalProperty ?? []).find(p => p.name === "Size")?.value;
    if (s) sizeSet.add(s);
  }
  const thisSize = variantProps.find(p => p.name === "Size")?.value;
  if (thisSize) sizeSet.add(thisSize);

  const images  = (group?.image ?? v.image ?? []).map(i => i.url).filter(Boolean) as string[];
  const price   = v.offers?.lowPrice ?? v.offers?.highPrice ?? 0;
  const highP   = v.offers?.highPrice;
  const inStock = (v.offers?.offers?.[0]?.availability ?? "").includes("InStock");
  const desc    = v.description ?? "";

  return {
    id:               groupId,
    productID:        v.productID ?? groupId,
    sku:              v.sku ?? v.productID ?? "",
    name:             group?.name ?? v.name ?? "",
    description:      desc,
    shortDescription: desc.substring(0, 200),
    price,
    compareAtPrice:   highP !== undefined && highP !== price ? highP : undefined,
    image:            images[0] ?? "",
    gallery:          images,
    category,
    tags:             [],
    sizes:            [...sizeSet],
    color,
    inStock,
    brand:            v.brand?.name ?? "",
    url:              group?.url ?? v.url,
  };
}

/** Try to parse `content[0].text` as a Schema.org product array and build
 * a proper { view: "product-list", products: [...] } structuredContent. */
function buildProductListStructure(result: McpToolResult): Record<string, unknown> | undefined {
  const text = result.content?.[0]?.text;
  const sc = result.structuredContent;
  // Diagnostic logging — remove after root-cause confirmed
  console.error("[decoLive] buildProductListStructure — content text length:", text?.length ?? 0);
  console.error("[decoLive] buildProductListStructure — structuredContent keys:", sc ? Object.keys(sc).join(",") : "null");
  if (text) console.error("[decoLive] buildProductListStructure — text preview:", text.slice(0, 400));
  if (!text) return undefined;

  let raw: unknown;
  try { raw = JSON.parse(text); } catch { return undefined; }
  if (!Array.isArray(raw)) {
    console.error("[decoLive] buildProductListStructure — text is not an array, type:", typeof raw, Array.isArray(raw) ? "array" : isRecord(raw) ? "object keys: " + Object.keys(raw as object).join(",") : "");
    return undefined;
  }
  console.error("[decoLive] buildProductListStructure — array length:", raw.length, "first item keys:", raw[0] ? Object.keys(raw[0] as object).join(",") : "empty");

  const seen     = new Set<string>();
  const products: Record<string, unknown>[] = [];

  for (const item of raw) {
    const variant = item as SchemaVariant;
    const groupId = variant.isVariantOf?.productGroupID ?? variant.productID;
    if (!groupId || seen.has(groupId)) continue;
    seen.add(groupId);
    const mapped = mapVariantToProduct(variant);
    if (mapped) products.push(mapped);
  }

  return { view: "product-list", products };
}

function buildProductDetailStructure(result: McpToolResult): Record<string, unknown> | undefined {
  const structured = isRecord(result.structuredContent)
    ? result.structuredContent
    : parseJsonText(result.content?.[0]?.text);

  if (!isRecord(structured)) return undefined;
  if (structured.view === "product-detail" && isRecord(structured.product)) {
    return structured;
  }

  const rawProduct = isRecord(structured.product) ? structured.product as SchemaVariant : undefined;
  if (!rawProduct) return undefined;

  const product = mapVariantToProduct(rawProduct);
  if (!product) return undefined;

  return { view: "product-detail", product };
}

function extractOptionValue(options: unknown[], name: string): string | undefined {
  const lowered = name.toLowerCase();
  for (const option of options) {
    if (!isRecord(option)) continue;
    if (asString(option.name)?.toLowerCase() === lowered) {
      return asString(option.value);
    }
  }
  return undefined;
}

function buildCartItem(lineNode: unknown, storefrontItem: unknown): JsonRecord | undefined {
  const line = isRecord(lineNode) ? lineNode : undefined;
  const storefront = isRecord(storefrontItem) ? storefrontItem : undefined;
  const merchandise = getNestedRecord(line, "merchandise");
  const platformProduct = getNestedRecord(merchandise, "product");
  const selectedOptions = getNestedArray(merchandise, "selectedOptions");

  const quantity = asNumber(line?.quantity) ?? asNumber(storefront?.quantity) ?? 0;
  if (quantity <= 0) return undefined;

  const size = extractOptionValue(selectedOptions, "size")
    ?? asString(storefront?.item_variant)
    ?? (() => {
      const title = asString(merchandise?.title);
      return title && title !== "Default Title" ? title : undefined;
    })()
    ?? "";

  const color = extractOptionValue(selectedOptions, "color") ?? "";
  const lineTotal = asNumber(getNested(line, "cost", "totalAmount", "amount"));
  const unitPrice = asNumber(getNested(line, "cost", "amountPerQuantity", "amount"))
    ?? asNumber(getNested(merchandise, "price", "amount"))
    ?? asNumber(storefront?.price)
    ?? (lineTotal !== undefined && quantity > 0 ? lineTotal / quantity : undefined)
    ?? 0;

  const image = asString(getNested(platformProduct, "featuredImage", "url"))
    ?? asString(getNested(merchandise, "image", "url"))
    ?? asString(storefront?.image)
    ?? "";

  const productId = asString(platformProduct?.id)
    ?? asString(storefront?.item_group_id)
    ?? asString(merchandise?.id)
    ?? asString(line?.id)
    ?? "";

  const variantId = asString(merchandise?.id)
    ?? asString(storefront?.item_variant)
    ?? productId;

  const handle = asString(platformProduct?.handle);
  const url = asString(getNested(platformProduct, "onlineStoreUrl"))
    ?? asString(storefront?.item_url)
    ?? (handle ? `https://storefront.deco.site/products/${handle}` : undefined);

  return {
    lineId: asString(line?.id),
    size,
    quantity,
    product: {
      id: productId,
      productID: variantId,
      sku: variantId,
      name: asString(platformProduct?.title) ?? asString(storefront?.item_name) ?? asString(merchandise?.title) ?? "Product",
      description: asString(platformProduct?.description) ?? "",
      shortDescription: (asString(platformProduct?.description) ?? "").slice(0, 200),
      price: unitPrice,
      compareAtPrice: asNumber(storefront?.listPrice),
      image,
      gallery: image ? [image] : [],
      category: asString(platformProduct?.productType) ?? asString(storefront?.item_category) ?? "",
      tags: [],
      sizes: size ? [size] : [],
      color,
      inStock: true,
      brand: asString(platformProduct?.vendor) ?? asString(storefront?.item_brand) ?? "",
      url,
    },
  };
}

function buildCartStructure(result: McpToolResult, includeView: boolean): Record<string, unknown> | undefined {
  const structured = isRecord(result.structuredContent)
    ? result.structuredContent
    : parseJsonText(result.content?.[0]?.text);

  if (!isRecord(structured)) return undefined;
  if ((structured.view === "cart" || structured.view === "cart-error") && isRecord(structured.cart)) {
    return structured;
  }

  const platformCart = getNestedRecord(structured, "platformCart") ?? structured;
  const storefront = getNestedRecord(structured, "storefront");

  // Shopify Storefront API uses either lines.nodes (newer) or lines.edges[].node (classic GraphQL)
  const lineNodesRaw = getNestedArray(platformCart, "lines", "nodes");
  const lineEdges = getNestedArray(platformCart, "lines", "edges");
  const lineNodes = lineNodesRaw.length > 0
    ? lineNodesRaw
    : lineEdges.map((edge) => (isRecord(edge) ? edge.node : edge)).filter(isRecord);

  // Also check top-level `lines` if it's a direct array (some deco.cx adapters)
  const linesTopLevel = getNestedArray(platformCart, "lines");
  const resolvedLines = lineNodes.length > 0
    ? lineNodes
    : Array.isArray(linesTopLevel) && linesTopLevel.every(isRecord)
      ? linesTopLevel
      : [];

  console.error("[decoLive] buildCartStructure — platformCart keys:", Object.keys(platformCart).join(","));
  console.error("[decoLive] buildCartStructure — lineNodesRaw:", lineNodesRaw.length, "lineEdges:", lineEdges.length, "linesTopLevel:", linesTopLevel.length);
  if (resolvedLines[0]) console.error("[decoLive] buildCartStructure — first line keys:", Object.keys(resolvedLines[0] as object).join(","));

  const storefrontItems = getNestedArray(storefront, "items");
  const sourceLength = Math.max(resolvedLines.length, storefrontItems.length);
  const items: JsonRecord[] = [];

  for (let index = 0; index < sourceLength; index += 1) {
    const mapped = buildCartItem(resolvedLines[index], storefrontItems[index]);
    if (mapped) items.push(mapped);
  }

  const subtotal = asNumber(storefront?.subtotal)
    ?? asNumber(getNested(platformCart, "cost", "subtotalAmount", "amount"))
    ?? items.reduce((sum, item) => sum + ((item.product as JsonRecord)?.price as number ?? 0) * ((item.quantity as number) ?? 0), 0);
  const total = asNumber(storefront?.total)
    ?? asNumber(getNested(platformCart, "cost", "totalAmount", "amount"))
    ?? subtotal;
  const couponSavings = asNumber(storefront?.discounts) ?? 0;
  const couponCode = asString(storefront?.coupon)
    ?? asString(getNested(platformCart, "discountCodes", "0", "code"));

  return {
    ...(includeView ? { view: items.length ? "cart" : "cart" } : {}),
    cart: {
      items,
      orderFormId: asString(platformCart.id),
      couponCode,
      couponDiscount: couponSavings,
      shippingCost: 0,
      checkoutUrl: asString(platformCart.checkoutUrl)
        ?? asString(storefront?.checkoutHref),
    },
    totals: {
      subtotal,
      couponSavings,
      vendorSavings: 0,
      shipping: 0,
      total,
    },
  };
}

function buildWishlistStructure(result: McpToolResult): Record<string, unknown> | undefined {
  const structured = isRecord(result.structuredContent)
    ? result.structuredContent
    : parseJsonText(result.content?.[0]?.text);

  if (!isRecord(structured)) return undefined;
  if (structured.view === "wishlist") return structured;

  const productIDs = Array.isArray(structured.productIDs)
    ? structured.productIDs.map((value) => asString(value)).filter(Boolean)
    : [];

  if (!productIDs.length && !Array.isArray(structured.productIDs)) return undefined;

  return {
    view: "wishlist",
    wishlistProductIds: productIDs,
  };
}

/**
 * Sanitise structuredContent: the upstream may return an array ([]) for empty
 * results, but the MCP SDK CallToolResult schema requires an object or undefined.
 * For productSearch / productDetail, also attempt to build the correct widget
 * structure from content[0].text when structuredContent is missing/invalid.
 */
function sanitiseResult(result: McpToolResult, capability?: string): McpToolResult {
  const sc = result.structuredContent;
  const scIsObject =
    sc !== null && typeof sc === "object" && !Array.isArray(sc);

  if (capability === "productSearch") {
    const built = buildProductListStructure(result);
    if (built) return { ...result, structuredContent: built };
  }

  if (capability === "productDetail") {
    const built = buildProductDetailStructure(result);
    if (built) return { ...result, structuredContent: built };
  }

  if (capability === "cartView" || capability === "cartAdd" || capability === "cartUpdate") {
    const built = buildCartStructure(result, true);
    if (built) return { ...result, structuredContent: built };
  }

  if (capability === "wishlistView" || capability === "wishlistToggle") {
    const built = buildWishlistStructure(result);
    if (built) return { ...result, structuredContent: built };
  }

  // If upstream gave us a well-formed object already, keep it as-is
  if (scIsObject) {
    return { ...result, structuredContent: sc as Record<string, unknown> };
  }

  return { ...result, structuredContent: undefined };
}

export async function callCapability(
  capability: string,
  args: Record<string, unknown>,
): Promise<McpToolResult> {
  try {
    const registry = await getToolRegistry();
    const tool = registry.capabilityMap.get(capability);

    if (!tool) {
      return {
        content: [{ type: "text", text: `Capability "${capability}" not available on this store.` }],
        structuredContent: { view: "message", message: `Capability "${capability}" not available on this store.` },
        isError: true,
      };
    }

    const translatedArgs = translateArgs(capability, args, tool.name);

    const result = await rpcWithFallback<McpToolResult>("tools/call", {
      name: tool.name,
      arguments: translatedArgs,
    });

    return sanitiseResult(result ?? {
      content: [{ type: "text", text: "No response from upstream tool." }],
      structuredContent: { view: "message", message: "No response from upstream tool." },
    }, capability);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[decoLive] callCapability(${capability}) error:`, msg);
    return {
      content: [{ type: "text", text: `Upstream error: ${msg}` }],
      structuredContent: { view: "message", message: `Upstream error: ${msg}` },
      isError: true,
    };
  }
}


