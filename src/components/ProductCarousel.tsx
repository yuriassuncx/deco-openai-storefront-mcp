/**
 * ProductCarousel — horizontal scroll list of products (inline / pip mode).
 *
 * Schema.org:
 * @see https://schema.org/ItemList
 * @see https://schema.org/SearchAction  (when driven by a search query)
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { CartFeedback, Product } from "../types";
import { ProductCard } from "./ProductCard";
import { requestFullscreen } from "../hooks/useOpenAI";

interface ProductCarouselProps {
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

export function ProductCarousel({
  products,
  wishlistIds,
  accentColor,
  query,
  totalFound,
  cartFeedback,
  onOpenDetail,
  onToggleWishlist,
}: ProductCarouselProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canLeft, setCanLeft] = useState(false);
  const [canRight, setCanRight] = useState(false);

  const checkScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setCanLeft(el.scrollLeft > 8);
    setCanRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 8);
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    checkScroll();
    el.addEventListener("scroll", checkScroll, { passive: true });
    const observer = new ResizeObserver(checkScroll);
    observer.observe(el);
    return () => {
      el.removeEventListener("scroll", checkScroll);
      observer.disconnect();
    };
  }, [checkScroll, products]);

  const scroll = (dir: -1 | 1) => {
    scrollRef.current?.scrollBy({ left: dir * 168, behavior: "smooth" });
  };

  const displayed = products.slice(0, 8);
  const resultCount = totalFound ?? products.length;

  return (
    <section
      className="ui-panel-surface space-y-3 rounded-4xl p-4"
      itemScope
      itemType="https://schema.org/ItemList"
      aria-label={query ? `Search results for "${query}"` : "Product recommendations"}
    >
      <header className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[color:var(--ui-subtle)]">
            Results
          </p>
          <h2 className="text-lg font-semibold leading-tight text-[color:var(--ui-text)]" itemProp="name">
            {query ? `"${query}"` : "Recommendations"}
          </h2>
          {resultCount > 0 && (
            <p className="text-sm text-[color:var(--ui-muted)]">
              {resultCount} item{resultCount === 1 ? "" : "s"} found
            </p>
          )}
        </div>
        {products.length > 0 && (
          <button
            type="button"
            onClick={requestFullscreen}
            className="ui-secondary-button shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold"
          >
            See all
          </button>
        )}
      </header>

      <div className="relative">
        {canLeft && (
          <button
            type="button"
            aria-label="Scroll left"
            onClick={() => scroll(-1)}
            className="ui-secondary-button absolute -left-1 top-1/2 z-10 -translate-y-1/2 flex h-8 w-8 items-center justify-center rounded-full p-0 shadow-sm transition-opacity hover:opacity-90"
          >
            <ChevronLeft className="h-4 w-4" aria-hidden="true" />
          </button>
        )}

        <div
          ref={scrollRef}
          className="flex gap-3 overflow-x-auto pb-1 scrollbar-none"
          style={{ scrollSnapType: "x mandatory" }}
          role="list"
          aria-label="Product list"
        >
          {displayed.map((p, i) => (
            <div
              key={p.id}
              style={{ scrollSnapAlign: "start" }}
              role="listitem"
              itemProp="itemListElement"
              itemScope
              itemType="https://schema.org/ListItem"
            >
              <meta itemProp="position" content={String(i + 1)} />
              <ProductCard
                product={p}
                compact
                isWishlisted={wishlistIds.includes(p.id)}
                accentColor={accentColor}
                cartFeedback={cartFeedback}
                onOpen={onOpenDetail}
                onToggleWishlist={onToggleWishlist}
              />
            </div>
          ))}
        </div>

        {canRight && (
          <button
            type="button"
            aria-label="Scroll right"
            onClick={() => scroll(1)}
            className="ui-secondary-button absolute -right-1 top-1/2 z-10 -translate-y-1/2 flex h-8 w-8 items-center justify-center rounded-full p-0 shadow-sm transition-opacity hover:opacity-90"
          >
            <ChevronRight className="h-4 w-4" aria-hidden="true" />
          </button>
        )}
      </div>
    </section>
  );
}
