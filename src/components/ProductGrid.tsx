/**
 * ProductGrid — 2-column grid layout for fullscreen mode.
 *
 * Schema.org:
 * @see https://schema.org/ItemList
 * @see https://schema.org/SearchAction  (when driven by a search query)
 */
import type { CartFeedback, Product } from "../types";
import { ProductCard } from "./ProductCard";

interface ProductGridProps {
  /** @see https://schema.org/ItemList */
  products: Product[];
  wishlistIds: string[];
  accentColor: string;
  /** @see https://schema.org/SearchAction */
  query?: string;
  totalFound?: number;
  cartFeedback?: CartFeedback | null;
  onOpenDetail: (p: Product) => void;
  onToggleWishlist: (product: Product) => void;
}

export function ProductGrid({
  products,
  wishlistIds,
  accentColor,
  query,
  totalFound,
  cartFeedback,
  onOpenDetail,
  onToggleWishlist,
}: ProductGridProps) {
  const resultCount = totalFound ?? products.length;

  return (
    <section
      className="space-y-4"
      itemScope
      itemType="https://schema.org/ItemList"
      aria-label={query ? `Search results for "${query}"` : "Product list"}
    >
      <header className="flex items-center justify-between gap-2">
        <div>
          <h2 className="text-base font-semibold text-[color:var(--ui-text)]" itemProp="name">
            {query ? `"${query}"` : "Products"}
          </h2>
          {resultCount > 0 && (
            <p className="text-sm text-[color:var(--ui-muted)]">
              {resultCount} item{resultCount === 1 ? "" : "s"} found
            </p>
          )}
        </div>
      </header>

      <div
        className="grid grid-cols-2 gap-3 sm:grid-cols-3"
        role="list"
        aria-label="Products"
      >
        {products.map((p, i) => (
          <div
            key={p.id}
            role="listitem"
            itemProp="itemListElement"
            itemScope
            itemType="https://schema.org/ListItem"
          >
            <meta itemProp="position" content={String(i + 1)} />
            <ProductCard
              product={p}
              compact={false}
              isWishlisted={wishlistIds.includes(p.id)}
              accentColor={accentColor}
              cartFeedback={cartFeedback}
              onOpen={onOpenDetail}
              onToggleWishlist={onToggleWishlist}
            />
          </div>
        ))}
      </div>
    </section>
  );
}
