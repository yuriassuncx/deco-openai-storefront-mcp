/**
 * getProduct — fetch full product detail.
 *
 * Proxies to the upstream deco.cx "productDetail" capability.
 *
 * Schema.org vocabulary:
 *   @see https://schema.org/Product
 *   @see https://schema.org/Offer
 */
import { z } from "zod";
import { callCapability } from "../lib/decoLive.js";

export const getProductInputSchema = {
  type: "object",
  properties: {
    slug: {
      type: "string",
      description: "Product URL slug or path. E.g.: 'floral-dress-summer-2024'",
    },
  },
  required: ["slug"],
  additionalProperties: false,
} as const;

export const getProductInputParser = z.object({
  slug: z.string().min(1),
});

export async function handleGetProduct(raw: unknown) {
  const args = getProductInputParser.parse(raw);
  return callCapability("productDetail", { slug: args.slug });
}
