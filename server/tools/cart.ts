/**
 * cart.ts — Shopping cart tools (view, add, update/remove).
 *
 * Proxies to the upstream deco.cx "cartView", "cartAdd", "cartUpdate" capabilities.
 *
 * Schema.org vocabulary:
 *   @see https://schema.org/Order   — the cart
 *   @see https://schema.org/AddAction
 *   @see https://schema.org/UpdateAction
 */
import { z } from "zod";
import { callCapability } from "../lib/decoLive.js";

// ─── view_cart ────────────────────────────────────────────────────────────────

export const viewCartInputSchema = {
  type: "object",
  properties: {},
  additionalProperties: false,
} as const;

export const viewCartInputParser = z.object({}).passthrough();

export async function handleViewCart(_raw: unknown) {
  return callCapability("cartView", {});
}

// ─── add_to_cart ──────────────────────────────────────────────────────────────

export const addToCartInputSchema = {
  type: "object",
  properties: {
    productId: {
      type: "string",
      description: "Product ID.",
    },
    sku: {
      type: "string",
      description: "SKU / variant ID / merchandise ID.",
    },
    quantity: {
      type: "number",
      description: "Quantity to add (default: 1).",
    },
    size: {
      type: "string",
      description: "Size variant (e.g. 'M', '42', 'G').",
    },
  },
  required: ["sku"],
  additionalProperties: false,
} as const;

export const addToCartInputParser = z.object({
  productId: z.string().optional(),
  sku: z.string().min(1),
  quantity: z.number().int().positive().optional(),
  size: z.string().optional(),
});

export async function handleAddToCart(raw: unknown) {
  const args = addToCartInputParser.parse(raw);
  return callCapability("cartAdd", {
    productId: args.productId,
    sku: args.sku,
    quantity: args.quantity ?? 1,
    size: args.size,
  });
}

// ─── update_cart_item ─────────────────────────────────────────────────────────

export const updateCartItemInputSchema = {
  type: "object",
  properties: {
    lineId: {
      type: "string",
      description: "Cart line item ID (uniqueId / line ID).",
    },
    quantity: {
      type: "number",
      description: "New quantity. Pass 0 to remove the item.",
    },
    productId: {
      type: "string",
      description: "Product ID (required by some platforms).",
    },
    sku: {
      type: "string",
      description: "SKU (required by some platforms).",
    },
  },
  required: ["lineId", "quantity"],
  additionalProperties: false,
} as const;

export const updateCartItemInputParser = z.object({
  lineId: z.string().min(1),
  quantity: z.number().int().min(0),
  productId: z.string().optional(),
  sku: z.string().optional(),
});

export async function handleUpdateCartItem(raw: unknown) {
  const args = updateCartItemInputParser.parse(raw);
  return callCapability("cartUpdate", {
    lineId: args.lineId,
    quantity: args.quantity,
    productId: args.productId,
    sku: args.sku,
  });
}
