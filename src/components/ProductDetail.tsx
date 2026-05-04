/**
 * ProductDetail — full product detail panel.
 *
 * Schema.org:
 * @see https://schema.org/Product
 * @see https://schema.org/Offer
 * @see https://schema.org/isRelatedTo  (outfit pairs)
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import { ShoppingCart } from "lucide-react";
import clsx from "clsx";
import type { CartFeedback, Product } from "../types";
import { formatPrice, installmentLabel } from "../format";
import { getContrastTextColor } from "../color";
import { ProductImage } from "./shared/ProductImage";
import { WishlistButton } from "./shared/WishlistButton";
import { BackButton } from "./shared/BackButton";
import { sendMessage } from "../hooks/useOpenAI";

interface ProductDetailProps {
  /** @see https://schema.org/Product */
  product: Product;
  /** Products that complete the outfit — @see https://schema.org/isRelatedTo */
  outfitPairs?: Product[];
  wishlistIds: string[];
  accentColor: string;
  cartFeedback?: CartFeedback | null;
  onToggleWishlist: (product: Product) => void;
  onAddToCart: (product: Product, size: string) => void;
  onOpenDetail?: (product: Product) => void;
  onBack?: () => void;
}

export function ProductDetail({
  product,
  outfitPairs,
  wishlistIds,
  accentColor,
  cartFeedback,
  onToggleWishlist,
  onAddToCart,
  onOpenDetail,
  onBack,
}: ProductDetailProps) {
  const accentTextColor = getContrastTextColor(accentColor);
  const [selectedSize, setSelectedSize] = useState<string | null>(
    product.sizes.length === 1 ? (product.sizes[0] ?? null) : null,
  );
  const [galleryIdx, setGalleryIdx] = useState(0);

  useEffect(() => {
    setSelectedSize(
      product.sizes.length === 1 ? (product.sizes[0] ?? null) : null,
    );
    setGalleryIdx(0);
  }, [product.id]);

  const images = useMemo(
    () =>
      [product.image, ...(product.gallery ?? [])].filter(Boolean) as string[],
    [product],
  );

  const isWishlisted = wishlistIds.includes(product.id);
  const showFeedback =
    cartFeedback != null &&
    cartFeedback.productId === product.id &&
    Date.now() - cartFeedback.addedAt < 4000;

  const handleAddToCart = useCallback(() => {
    if (product.sizes.length > 0 && selectedSize === null) return;
    onAddToCart(product, selectedSize ?? "");
  }, [product, selectedSize, onAddToCart]);

  return (
    <article
      className="space-y-5"
      itemScope
      itemType="https://schema.org/Product"
    >
      {onBack && <BackButton onClick={onBack} label="Back to results" />}

      {/* Image gallery */}
      <figure className="ui-image-surface relative overflow-hidden rounded-2xl border border-[color:var(--ui-border)] m-0">
        <ProductImage
          src={images[galleryIdx]}
          alt={`${product.name} — image ${galleryIdx + 1}`}
          className="aspect-square w-full"
        />
        <div className="absolute right-3 top-3">
          <WishlistButton
            isWishlisted={isWishlisted}
            label={product.name}
            onToggle={() => onToggleWishlist(product)}
          />
        </div>
        {images.length > 1 && (
          <div
            className="absolute bottom-3 left-0 right-0 flex justify-center gap-1.5"
            role="tablist"
            aria-label="Product gallery"
          >
            {images.map((_, i) => (
              <button
                key={i}
                type="button"
                role="tab"
                aria-selected={i === galleryIdx}
                aria-label={`Gallery image ${i + 1}`}
                onClick={() => setGalleryIdx(i)}
                className={clsx(
                  "h-1.5 rounded-full transition-all duration-200",
                  i === galleryIdx ? "w-4 bg-[color:var(--ui-text)]" : "w-1.5 bg-[color:var(--ui-subtle)]",
                )}
              />
            ))}
          </div>
        )}
      </figure>

      {/* Product info */}
      <div className="space-y-2">
        <p
          className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[color:var(--ui-subtle)]"
          itemProp="brand"
          itemScope
          itemType="https://schema.org/Brand"
        >
          <span itemProp="name">{product.brand}</span>
        </p>
        <h2 className="text-xl font-semibold leading-snug text-[color:var(--ui-text)]" itemProp="name">
          {product.name}
        </h2>

        {/* Offer / price */}
        <div
          itemProp="offers"
          itemScope
          itemType="https://schema.org/Offer"
        >
          <meta
            itemProp="availability"
            content={
              product.inStock
                ? "https://schema.org/InStock"
                : "https://schema.org/OutOfStock"
            }
          />
          <div className="flex items-baseline gap-2">
            <span
              className="text-lg font-semibold text-[color:var(--ui-text)]"
              itemProp="price"
              content={String(product.price)}
            >
              {formatPrice(product.price)}
            </span>
            {product.compareAtPrice && product.compareAtPrice > product.price && (
              <span className="text-sm text-[color:var(--ui-subtle)] line-through">
                {formatPrice(product.compareAtPrice)}
              </span>
            )}
          </div>
          {product.installments && product.installments.count > 1 && (
            <p className="text-xs text-[color:var(--ui-muted)]">
              {installmentLabel(product.installments)}
            </p>
          )}
        </div>

        {product.shortDescription && (
          <p
            className="text-sm leading-relaxed text-[color:var(--ui-muted)]"
            itemProp="description"
          >
            {product.shortDescription}
          </p>
        )}
      </div>

      {/* Size selector */}
      {product.sizes.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-[color:var(--ui-muted)]">
            Size{selectedSize ? `: ${selectedSize}` : ""}
          </p>
          <div className="flex flex-wrap gap-2" role="group" aria-label="Select size">
            {product.sizes.map((size) => (
              <button
                key={size}
                type="button"
                aria-pressed={selectedSize === size}
                onClick={() => setSelectedSize(size)}
                className={clsx(
                  "rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors",
                  selectedSize === size
                    ? "border-transparent text-white"
                    : "border-[color:var(--ui-border)] bg-transparent text-[color:var(--ui-text)] hover:border-[color:var(--ui-border-strong)] hover:bg-[color:var(--ui-pill)]",
                )}
                style={
                  selectedSize === size
                    ? { backgroundColor: accentColor, color: accentTextColor }
                    : undefined
                }
              >
                {size}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* CTAs */}
      <div className="flex gap-2">
        <button
          type="button"
          disabled={product.sizes.length > 0 && selectedSize === null}
          onClick={handleAddToCart}
          className="flex flex-1 items-center justify-center gap-2 rounded-full py-3 text-sm font-semibold text-white transition-opacity disabled:cursor-not-allowed disabled:opacity-40"
          style={{ backgroundColor: accentColor, color: accentTextColor }}
        >
          <ShoppingCart className="h-4 w-4" aria-hidden="true" />
          {showFeedback ? "Added to cart ✓" : "Add to cart"}
        </button>

        <button
          type="button"
          onClick={() =>
            sendMessage(`Show me outfit suggestions with ${product.name}`)
          }
          className="ui-secondary-button rounded-full px-4 py-3 text-sm font-medium"
        >
          Style it
        </button>
      </div>

      {/* Outfit pairs — @see https://schema.org/isRelatedTo */}
      {outfitPairs && outfitPairs.length > 0 && (
        <section className="space-y-3 pt-2" aria-label="Complete the look">
          <h3 className="text-sm font-semibold text-[color:var(--ui-text)]">Complete the look</h3>
          <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-none">
            {outfitPairs.map((p) => (
              <div
                key={p.id}
                className="shrink-0 w-32"
                itemProp="isRelatedTo"
                itemScope
                itemType="https://schema.org/Product"
              >
                <button
                  type="button"
                  onClick={() => onOpenDetail?.(p)}
                  className="ui-card-surface w-full rounded-2xl overflow-hidden text-left hover:border-[color:var(--ui-border-strong)]"
                >
                  <ProductImage
                    src={p.image}
                    alt={p.name}
                    className="aspect-3/4 w-full"
                  />
                  <div className="p-2">
                    <p className="line-clamp-2 text-[11px] font-medium text-[color:var(--ui-text)]" itemProp="name">
                      {p.name}
                    </p>
                    <p className="text-[11px] text-[color:var(--ui-muted)]">{formatPrice(p.price)}</p>
                  </div>
                </button>
              </div>
            ))}
          </div>
        </section>
      )}
    </article>
  );
}
