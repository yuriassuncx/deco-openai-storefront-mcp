/**
 * WishlistView — saved / wishlisted products.
 *
 * Schema.org:
 * @see https://schema.org/ItemList  — the wishlist as a named collection
 * @see https://schema.org/WantAction — intent behind saving items
 */
import { Heart } from "lucide-react";
import type { Product } from "../types";
import { ProductCard } from "./ProductCard";
import { sendMessage } from "../hooks/useOpenAI";

interface WishlistViewProps {
  /** @see https://schema.org/ItemList */
  products: Product[];
  wishlistIds: string[];
  accentColor: string;
  onOpenDetail: (p: Product) => void;
  onToggleWishlist: (product: Product) => void;
}

export function WishlistView({
  products,
  wishlistIds,
  accentColor,
  onOpenDetail,
  onToggleWishlist,
}: WishlistViewProps) {
  if (products.length === 0) {
    return (
      <div
        className="flex flex-col items-center gap-3 py-12 text-[color:var(--ui-muted)]"
        role="status"
        aria-label="Wishlist empty"
      >
        <Heart className="h-10 w-10" aria-hidden="true" />
        <p className="text-sm font-medium">Your wishlist is empty</p>
        <button
          type="button"
          onClick={() => sendMessage("Show me products to save")}
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
      itemType="https://schema.org/ItemList"
      aria-label="Your wishlist"
    >
      <h2 className="text-base font-semibold text-[color:var(--ui-text)]" itemProp="name">
        Saved items ({products.length})
      </h2>
      <div className="grid grid-cols-2 gap-3" role="list">
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
              onOpen={onOpenDetail}
              onToggleWishlist={onToggleWishlist}
            />
          </div>
        ))}
      </div>
    </section>
  );
}
