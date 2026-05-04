import { Heart, ShoppingCart } from "lucide-react";
import type { CartFeedback } from "../types";
import { formatPrice } from "../format";
import { getContrastTextColor } from "../color";

interface MiniCartBarProps {
  cartCount: number;
  cartTotal: number;
  wishlistCount: number;
  cartFeedback?: CartFeedback | null;
  accentColor: string;
  onOpenCart: () => void;
  onOpenWishlist: () => void;
}

export function MiniCartBar({
  cartCount,
  cartTotal,
  wishlistCount,
  cartFeedback,
  accentColor,
  onOpenCart,
  onOpenWishlist,
}: MiniCartBarProps) {
  if (cartCount <= 0 && wishlistCount <= 0) return null;

  const accentTextColor = getContrastTextColor(accentColor);

  const feedbackActive =
    cartFeedback != null && Date.now() - cartFeedback.addedAt < 4000;

  return (
    <div
      className="pointer-events-none fixed bottom-0 left-0 right-0 z-30 px-4 pb-[calc(env(safe-area-inset-bottom)+0.75rem)]"
      aria-live="polite"
    >
      <div className="ui-floating-surface pointer-events-auto mx-auto flex max-w-4xl flex-col gap-2 rounded-[1.75rem] px-4 py-3 text-[color:var(--ui-text)] sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 flex-1 items-center justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[color:var(--ui-subtle)]">
              {cartCount > 0 ? "Your cart" : "Saved"}
            </p>
            <p className="truncate text-sm font-medium text-[color:var(--ui-text)]">
              {feedbackActive && cartFeedback
                ? `${cartFeedback.productName} added ✓`
                : cartCount > 0
                  ? `${cartCount} item${cartCount === 1 ? "" : "s"}`
                  : `${wishlistCount} saved`}
            </p>
          </div>
          {cartCount > 0 && (
            <div className="shrink-0 text-right">
              <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[color:var(--ui-subtle)]">
                Total
              </p>
              <p className="text-sm font-semibold">{formatPrice(cartTotal)}</p>
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-2 sm:flex sm:w-auto">
          {wishlistCount > 0 && (
            <button
              type="button"
              onClick={onOpenWishlist}
              aria-label={`View wishlist (${wishlistCount} items)`}
              className="ui-pill-button rounded-full px-3 py-2 text-xs font-semibold"
            >
              <span className="inline-flex items-center gap-1.5">
                <Heart className="h-3.5 w-3.5" aria-hidden="true" />
                Saved ({wishlistCount})
              </span>
            </button>
          )}
          {cartCount > 0 && (
            <button
              type="button"
              onClick={onOpenCart}
              aria-label={`View cart (${cartCount} items)`}
              className="rounded-full px-3 py-2 text-xs font-semibold transition-colors hover:opacity-90"
              style={{ backgroundColor: accentColor || "#fff", color: accentTextColor }}
            >
              <span className="inline-flex items-center gap-1.5">
                <ShoppingCart className="h-3.5 w-3.5" aria-hidden="true" />
                View cart
              </span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
