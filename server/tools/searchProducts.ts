/**
 * searchProducts — full-text product search.
 *
 * Proxies to the upstream deco.cx "productSearch" capability.
 *
 * Schema.org vocabulary:
 *   @see https://schema.org/SearchAction
 *   @see https://schema.org/ItemList
 *   @see https://schema.org/Product
 */
import { z } from "zod";
import { callCapability } from "../lib/decoLive.js";

export const searchProductsInputSchema = {
  type: "object",
  properties: {
    query: {
      type: "string",
      description:
        "Natural-language search. E.g.: 'floral dress for party', 'casual summer look', " +
        "'something cheaper', 'do you have long dresses?'. " +
        "If the user asks for recommendations without a specific query, pass an empty string.",
    },
    count: {
      type: "number",
      description: "Number of results to return (default: 10).",
    },
  },
  required: ["query"],
  additionalProperties: false,
} as const;

export const searchProductsInputParser = z.object({
  query: z.string(),
  count: z.number().int().positive().optional(),
});

export async function handleSearchProducts(raw: unknown) {
  const args = searchProductsInputParser.parse(raw);
  return callCapability("productSearch", { query: args.query, count: args.count ?? 10 });
}
