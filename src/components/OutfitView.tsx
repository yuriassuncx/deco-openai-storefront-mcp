/**
 * OutfitView — outfit recommendation anchored on one hero product.
 *
 * Schema.org:
 * @see https://schema.org/ItemList    — the complete outfit as an ordered list
 * @see https://schema.org/isRelatedTo — relationship between anchor and supporting items
 * @see https://schema.org/Product
 */
import type { Product } from "../types";
import { formatPrice } from "../format";
import { getContrastTextColor } from "../color";
import { ProductImage } from "./shared/ProductImage";
import { WishlistButton } from "./shared/WishlistButton";
import { sendMessage } from "../hooks/useOpenAI";

interface OutfitViewProps {
  /** Hero / anchor product @see https://schema.org/Product */
  anchor: Product;
  /** Supporting items — @see https://schema.org/isRelatedTo */
  outfitItems: Product[];
  totalOutfitPrice?: number;
  wishlistIds: string[];
  accentColor: string;
  onOpenDetail: (p: Product) => void;
  onToggleWishlist: (product: Product) => void;
}

export function OutfitView({
  anchor,
  outfitItems,
  totalOutfitPrice,
  wishlistIds,
  accentColor,
  onOpenDetail,
  onToggleWishlist,
}: OutfitViewProps) {
  const accentTextColor = getContrastTextColor(accentColor);

  return (
    <section
      className="space-y-4"
      itemScope
      itemType="https://schema.org/ItemList"
      aria-label="Outfit recommendation"
    >
      <header>
        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[color:var(--ui-subtle)]">
          Complete look
        </p>
        <h2 className="text-lg font-semibold leading-tight text-[color:var(--ui-text)]" itemProp="name">
          Built around{" "}
          <span className="italic">{anchor.name}</span>
        </h2>
        {totalOutfitPrice && (
          <p className="text-sm text-[color:var(--ui-muted)]">
            Full outfit: {formatPrice(totalOutfitPrice)}
          </p>
        )}
      </header>

      {/* Hero anchor item */}
      <div className="ui-image-surface relative overflow-hidden rounded-2xl border border-[color:var(--ui-border)]">
        <button
          type="button"
          onClick={() => onOpenDetail(anchor)}
          className="w-full text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--ui-border-strong)]"
          aria-label={`View ${anchor.name}`}
        >
          <ProductImage
            src={anchor.image}
            alt={anchor.name}
            className="aspect-square w-full"
          />
        </button>
        <div className="absolute right-3 top-3">
          <WishlistButton
            isWishlisted={wishlistIds.includes(anchor.id)}
            label={anchor.name}
            onToggle={() => onToggleWishlist(anchor)}
          />
        </div>
        <div className="absolute bottom-3 left-3 right-12">
          <div className="ui-floating-surface rounded-xl p-2">
            <p className="line-clamp-1 text-xs font-semibold text-[color:var(--ui-text)]">{anchor.name}</p>
            <p className="text-xs text-[color:var(--ui-muted)]">{formatPrice(anchor.price)}</p>
          </div>
        </div>
      </div>

      {/* Supporting items */}
      {outfitItems.length > 0 && (
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[color:var(--ui-subtle)]">
            Also wear
          </p>
          <div
            className="flex gap-3 overflow-x-auto pb-1 scrollbar-none"
            role="list"
          >
            {outfitItems.map((p, i) => (
              <div
                key={p.id}
                className="shrink-0 w-32"
                role="listitem"
                itemProp="itemListElement"
                itemScope
                itemType="https://schema.org/ListItem"
              >
                <meta itemProp="position" content={String(i + 2)} />
                <div
                  itemProp="isRelatedTo"
                  itemScope
                  itemType="https://schema.org/Product"
                >
                  <div className="ui-card-surface relative overflow-hidden rounded-2xl">
                    <button
                      type="button"
                      onClick={() => onOpenDetail(p)}
                      className="w-full"
                      aria-label={`View ${p.name}`}
                    >
                      <ProductImage
                        src={p.image}
                        alt={p.name}
                        className="aspect-3/4 w-full"
                      />
                    </button>
                    <div className="absolute right-1.5 top-1.5">
                      <WishlistButton
                        isWishlisted={wishlistIds.includes(p.id)}
                        label={p.name}
                        onToggle={() => onToggleWishlist(p)}
                      />
                    </div>
                  </div>
                  <div className="mt-1.5 px-0.5">
                    <p className="line-clamp-2 text-[11px] font-medium text-[color:var(--ui-text)]" itemProp="name">
                      {p.name}
                    </p>
                    <p className="text-[11px] text-[color:var(--ui-muted)]">{formatPrice(p.price)}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* CTA: add all to cart */}
      <button
        type="button"
        onClick={() =>
          sendMessage(`Add the complete outfit to my cart`)
        }
        className="w-full rounded-full py-3 text-sm font-semibold text-white transition-opacity hover:opacity-85"
        style={{ backgroundColor: accentColor, color: accentTextColor }}
      >
        Add full look to cart
        {totalOutfitPrice ? ` — ${formatPrice(totalOutfitPrice)}` : ""}
      </button>
    </section>
  );
}
