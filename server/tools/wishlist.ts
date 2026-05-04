/**
 * wishlist.ts — Wishlist tools (view, toggle add/remove).
 *
 * Proxies to the upstream deco.cx "wishlistView" and "wishlistToggle" capabilities.
 *
 * Schema.org vocabulary:
 *   @see https://schema.org/WishList
 */
import { z } from "zod";
import { callCapability } from "../lib/decoLive.js";

// ─── view_wishlist ────────────────────────────────────────────────────────────

export const viewWishlistInputSchema = {
  type: "object",
  properties: {},
  additionalProperties: false,
} as const;

export const viewWishlistInputParser = z.object({}).passthrough();

export async function handleViewWishlist(_raw: unknown) {
  return callCapability("wishlistView", {});
}

// ─── wishlist_toggle ──────────────────────────────────────────────────────────

export const wishlistToggleInputSchema = {
  type: "object",
  properties: {
    productID: {
      type: "string",
      description: "Product ID to add or remove from the wishlist.",
    },
    productGroupID: {
      type: "string",
      description: "Product group ID. Defaults to productID if not provided.",
    },
    action: {
      type: "string",
      enum: ["add", "remove"],
      description: "Whether to add or remove the product.",
    },
  },
  required: ["productID"],
  additionalProperties: false,
} as const;

export const wishlistToggleInputParser = z.object({
  productID: z.string().min(1),
  productGroupID: z.string().optional(),
  action: z.enum(["add", "remove"]).optional(),
});

export async function handleWishlistToggle(raw: unknown) {
  const args = wishlistToggleInputParser.parse(raw);
  return callCapability("wishlistToggle", {
    productID: args.productID,
    productGroupID: args.productGroupID ?? args.productID,
    action: args.action ?? "add",
  });
}
