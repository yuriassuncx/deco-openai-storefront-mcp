/**
 * CartView — shopping cart contents and totals.
 *
 * Schema.org:
 * @see https://schema.org/Order      — cart as a pre-purchase order
 * @see https://schema.org/OrderItem  — each line item
 * @see https://schema.org/PriceSpecification — totals breakdown
 */
import { ShoppingCart } from "lucide-react";
import type { Cart, CartTotals, Product, StorefrontCapabilities } from "../types";
import { formatPrice } from "../format";
import { getContrastTextColor } from "../color";
import { ProductImage } from "./shared/ProductImage";
import { sendMessage, callTool, openExternal } from "../hooks/useOpenAI";

interface CartViewProps {
  /** @see https://schema.org/Order */
  cart: Cart;
  totals?: CartTotals;
  accentColor: string;
  capabilities?: StorefrontCapabilities;
  storefrontUrl?: string;
  onOpenDetail: (p: Product) => void;
}

export function CartView({ cart, totals, accentColor, capabilities, storefrontUrl, onOpenDetail }: CartViewProps) {
  const accentTextColor = getContrastTextColor(accentColor);
  const itemCount = cart.items.reduce((sum, item) => sum + item.quantity, 0);
  const total =
    totals?.total ??
    cart.items.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
  const updateToolName = capabilities?.cartUpdate ?? "update_cart_item";
  const removeToolName = capabilities?.cartRemove ?? updateToolName;

  const updateItemQuantity = (lineId: string | undefined, quantity: number, productId?: string, sku?: string) => {
    if (!lineId) return;
    callTool(updateToolName, {
      lineId,
      quantity,
      productId,
      sku,
    });
  };

  const removeItem = (lineId: string | undefined, productId?: string, sku?: string) => {
    if (!lineId) return;
    callTool(removeToolName, {
      lineId,
      quantity: 0,
      productId,
      sku,
    });
  };

  if (cart.items.length === 0) {
    return (
      <div
        className="flex flex-col items-center gap-3 py-12 text-[color:var(--ui-muted)]"
        role="status"
        aria-label="Cart empty"
      >
        <ShoppingCart className="h-10 w-10" aria-hidden="true" />
        <p className="text-sm font-medium">Your cart is empty</p>
        <button
          type="button"
          onClick={() => sendMessage("Show me something to buy")}
          className="ui-secondary-button rounded-full px-4 py-2 text-xs font-semibold"
        >
          Browse products
        </button>
      </div>
    );
  }

  return (
    <section
      className="space-y-4"
      itemScope
      itemType="https://schema.org/Order"
      aria-label="Your cart"
    >
      <h2 className="text-base font-semibold text-[color:var(--ui-text)]">
        Your cart ({itemCount} item{itemCount === 1 ? "" : "s"})
      </h2>

      <ul className="space-y-2" role="list">
        {cart.items.map((item, i) => (
          <li
            key={item.lineId ?? `${item.product.id}-${item.size}-${i}`}
            className="ui-card-surface flex gap-3 rounded-2xl p-3"
            itemProp="orderedItem"
            itemScope
            itemType="https://schema.org/OrderItem"
          >
            <button
              type="button"
              onClick={() => onOpenDetail(item.product)}
              className="shrink-0"
              aria-label={`View ${item.product.name}`}
            >
              <ProductImage
                src={item.product.image}
                alt={item.product.name}
                className="h-16 w-16 rounded-xl"
              />
            </button>
            <div className="flex min-w-0 flex-1 flex-col justify-between gap-1">
              <div>
                <p className="truncate text-sm font-medium text-[color:var(--ui-text)]" itemProp="name">
                  {item.product.name}
                </p>
                {item.size && (
                  <p className="text-xs text-[color:var(--ui-muted)]">Size: {item.size}</p>
                )}
              </div>
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-semibold text-[color:var(--ui-text)]">
                  {formatPrice(item.product.price * item.quantity)}
                </p>
                {/* Quantity controls */}
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    aria-label="Decrease quantity"
                    onClick={() => updateItemQuantity(item.lineId, item.quantity - 1, item.product.id, item.product.sku)}
                    disabled={!item.lineId}
                    className="ui-secondary-button flex h-7 w-7 items-center justify-center rounded-full p-0 text-sm font-semibold"
                  >
                    −
                  </button>
                  <span
                    className="min-w-6 text-center text-sm font-medium text-[color:var(--ui-text)]"
                    itemProp="orderQuantity"
                    content={String(item.quantity)}
                  >
                    {item.quantity}
                  </span>
                  <button
                    type="button"
                    aria-label="Increase quantity"
                    onClick={() => updateItemQuantity(item.lineId, item.quantity + 1, item.product.id, item.product.sku)}
                    disabled={!item.lineId}
                    className="ui-secondary-button flex h-7 w-7 items-center justify-center rounded-full p-0 text-sm font-semibold"
                  >
                    +
                  </button>
                  <button
                    type="button"
                    aria-label={`Remove ${item.product.name} from cart`}
                    onClick={() => removeItem(item.lineId, item.product.id, item.product.sku)}
                    disabled={!item.lineId}
                    className="ui-danger-button ml-1 flex h-7 w-7 items-center justify-center rounded-full text-[color:var(--ui-subtle)] transition-colors"
                  >
                    ×
                  </button>
                </div>
              </div>
            </div>
          </li>
        ))}
      </ul>

      {/* Totals — @see https://schema.org/PriceSpecification */}
      {totals && (
        <div
          className="space-y-1.5 rounded-2xl border border-[color:var(--ui-border)] bg-[color:var(--ui-surface)] p-3 text-sm"
          itemProp="priceSpecification"
          itemScope
          itemType="https://schema.org/PriceSpecification"
        >
          <div className="flex justify-between text-[color:var(--ui-muted)]">
            <span>Subtotal</span>
            <span>{formatPrice(totals.subtotal)}</span>
          </div>
          {totals.couponSavings > 0 && (
            <div className="flex justify-between text-green-700">
              <span>Coupon savings</span>
              <span>-{formatPrice(totals.couponSavings)}</span>
            </div>
          )}
          {totals.vendorSavings > 0 && (
            <div className="flex justify-between text-green-700">
              <span>Discount</span>
              <span>-{formatPrice(totals.vendorSavings)}</span>
            </div>
          )}
          <div className="flex justify-between text-[color:var(--ui-muted)]">
            <span>Shipping</span>
            <span>{totals.shipping === 0 ? "Free" : formatPrice(totals.shipping)}</span>
          </div>
          <div className="flex justify-between border-t border-[color:var(--ui-border)] pt-1.5 font-semibold text-[color:var(--ui-text)]">
            <span>Total</span>
            <span itemProp="price" content={String(totals.total)}>
              {formatPrice(totals.total)}
            </span>
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={() => {
          const checkoutUrl =
            cart.checkoutUrl ??
            (cart.orderFormId
              ? `${storefrontUrl ?? "https://storefront.deco.site"}/cart/c/${cart.orderFormId}`
              : null);
          if (checkoutUrl) {
            openExternal(checkoutUrl);
            return;
          }
          sendMessage("Proceed to checkout");
        }}
        className="w-full rounded-full py-3 text-sm font-semibold text-white transition-opacity hover:opacity-85"
        style={{ backgroundColor: accentColor, color: accentTextColor }}
      >
        Checkout — {formatPrice(total)}
      </button>
    </section>
  );
}
