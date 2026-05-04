/**
 * user.ts — User/account tool (view profile).
 *
 * Proxies to the upstream deco.cx "userView" capability.
 *
 * Schema.org vocabulary:
 *   @see https://schema.org/Person
 */
import { callCapability } from "../lib/decoLive.js";

export const viewUserInputSchema = {
  type: "object",
  properties: {},
  additionalProperties: false,
} as const;

export async function handleViewUser(_raw: unknown) {
  return callCapability("userView", {});
}
