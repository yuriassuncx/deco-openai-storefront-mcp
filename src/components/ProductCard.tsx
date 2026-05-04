/**
 * ProductCard — compact or full-width product tile.
 *
 * Schema.org:
 * @see https://schema.org/Product
 * @see https://schema.org/Offer
 */
import clsx from "clsx";
import type { CartFeedback, Product } from "../types";
import { formatPrice, installmentLabel } from "../format";
import { getContrastTextColor } from "../color";
import { ProductImage } from "./shared/ProductImage";
import { WishlistButton } from "./shared/WishlistButton";

interface ProductCardProps {
  /** @see https://schema.org/Product */
  product: Product;
  compact?: boolean;
  isWishlisted: boolean;
  accentColor: string;
  cartFeedback?: CartFeedback | null;
  onOpen: (p: Product) => void;
  onToggleWishlist: (product: Product) => void;
}

export function ProductCard({
  product,
  compact = true,
  isWishlisted,
  accentColor,
  cartFeedback,
  onOpen,
  onToggleWishlist,
}: ProductCardProps) {
  const accentTextColor = getContrastTextColor(accentColor);
  const discount =
    product.compareAtPrice && product.compareAtPrice > product.price
      ? Math.round((1 - product.price / product.compareAtPrice) * 100)
      : 0;

  const justAdded =
    cartFeedback?.productId === product.id &&
    Date.now() - cartFeedback.addedAt < 4000;

  return (
    <article
      role="button"
      tabIndex={0}
      itemScope
      itemType="https://schema.org/Product"
      onClick={() => onOpen(product)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onOpen(product);
        }
      }}
      className={clsx(
        "group flex cursor-pointer flex-col overflow-hidden rounded-[1.75rem] border border-[color:var(--ui-border)] bg-[color:var(--ui-card)] shadow-[var(--ui-shadow-soft)] transition-[transform,box-shadow] duration-200 hover:-translate-y-0.5 hover:shadow-[var(--ui-shadow)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--ui-border-strong)]",
        compact ? "w-40 shrink-0" : "w-full",
      )}
    >
      {/* Image + badges */}
      <figure className="ui-image-surface relative overflow-hidden m-0">
        <ProductImage
          src={product.image}
          alt={`${product.name} — ${product.brand}`}
          className={clsx("w-full aspect-3/4")}
        />
        {discount > 0 && (
          <span
            className="absolute left-2 top-2 rounded-full px-2 py-0.5 text-[10px] font-semibold"
            style={{ backgroundColor: "var(--ui-strong)", color: "var(--ui-strong-text)" }}
          >
            -{discount}%
          </span>
        )}
        {justAdded && (
          <span
            className="absolute left-2 bottom-2 rounded-full px-2 py-0.5 text-[10px] font-semibold"
            style={{ backgroundColor: "var(--ui-strong)", color: "var(--ui-strong-text)" }}
          >
            Added ✓
          </span>
        )}
        <div className="absolute right-2 top-2">
          <WishlistButton
            isWishlisted={isWishlisted}
            label={product.name}
            onToggle={() => onToggleWishlist(product)}
          />
        </div>
      </figure>

      {/* Info */}
      <div className="flex flex-1 flex-col gap-1.5 p-3">
        <div className="flex items-center gap-1.5 flex-wrap">
          <p
            className="text-[9px] font-semibold uppercase tracking-widest text-[color:var(--ui-subtle)]"
            itemProp="brand"
          >
            {product.brand}
          </p>
          <span className="rounded-full border border-[color:var(--ui-border)] bg-[color:var(--ui-pill)] px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.16em] text-[color:var(--ui-muted)]">
            {product.category}
          </span>
        </div>
        <p
          className={clsx(
            "line-clamp-2 font-medium leading-snug text-[color:var(--ui-text)]",
            compact ? "text-xs" : "text-sm",
          )}
          itemProp="name"
        >
          {product.name}
        </p>

        {/* Pricing — schema.org Offer */}
        <div
          className="mt-auto min-h-14 space-y-0.5 pt-1"
          itemProp="offers"
          itemScope
          itemType="https://schema.org/Offer"
        >
          {product.compareAtPrice && product.compareAtPrice > product.price && (
            <p className="text-[10px] text-[color:var(--ui-subtle)] line-through">
              {formatPrice(product.compareAtPrice)}
            </p>
          )}
          <p
            className={clsx(
              "font-semibold text-[color:var(--ui-text)]",
              compact ? "text-sm" : "text-base",
            )}
            itemProp="price"
            content={String(product.price)}
          >
            {formatPrice(product.price)}
          </p>
          <meta itemProp="availability" content={product.inStock ? "https://schema.org/InStock" : "https://schema.org/OutOfStock"} />
          {product.installments && product.installments.count > 1 && (
            <p className="text-[10px] text-[color:var(--ui-muted)]">
              {installmentLabel(product.installments)}
            </p>
          )}
        </div>
      </div>

      {/* CTA */}
      <div className="px-3 pb-3">
        <div
          className="rounded-full px-3 py-2 text-center text-sm font-semibold text-white transition-opacity duration-200 group-hover:opacity-85"
          style={{ backgroundColor: accentColor, color: accentTextColor }}
          aria-hidden="true"
        >
          View details
        </div>
      </div>
    </article>
  );
}
