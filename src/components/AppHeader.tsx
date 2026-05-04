import { Heart, ShoppingCart } from "lucide-react";
import { requestFullscreen } from "../hooks/useOpenAI";
import { getContrastTextColor } from "../color";

interface AppHeaderProps {
  storeName: string;
  logoUrl?: string;
  cartCount: number;
  wishlistCount: number;
  displayMode: string;
  accentColor: string;
  onOpenCart: () => void;
  onOpenWishlist: () => void;
}

export function AppHeader({
  storeName,
  logoUrl,
  cartCount,
  wishlistCount,
  displayMode,
  accentColor,
  onOpenCart,
  onOpenWishlist,
}: AppHeaderProps) {
  const accentTextColor = getContrastTextColor(accentColor);

  return (
    <header className="flex items-center justify-between gap-2 border-b border-[color:var(--ui-border)] pb-3">
      <div className="flex items-center gap-2.5">
        {logoUrl && (
          <img
            src={logoUrl}
            alt={storeName}
            className="h-8 w-8 rounded-lg object-contain"
            loading="eager"
          />
        )}
        <span className="text-sm font-semibold text-[color:var(--ui-text)]">{storeName}</span>
      </div>

      <nav
        className="flex items-center gap-2"
        aria-label="Cart and wishlist actions"
      >
        {wishlistCount > 0 && (
          <button
            type="button"
            onClick={onOpenWishlist}
            aria-label={`Wishlist (${wishlistCount} items)`}
            className="ui-icon-button relative flex h-9 w-9 items-center justify-center rounded-full"
          >
            <Heart className="h-4 w-4" aria-hidden="true" />
            <span
              className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full text-[9px] font-bold text-white"
              style={{ backgroundColor: accentColor, color: accentTextColor }}
            >
              {wishlistCount}
            </span>
          </button>
        )}
        {cartCount > 0 && (
          <button
            type="button"
            onClick={onOpenCart}
            aria-label={`Cart (${cartCount} items)`}
            className="ui-icon-button relative flex h-9 w-9 items-center justify-center rounded-full"
          >
            <ShoppingCart className="h-4 w-4" aria-hidden="true" />
            <span
              className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full text-[9px] font-bold text-white"
              style={{ backgroundColor: accentColor, color: accentTextColor }}
            >
              {cartCount}
            </span>
          </button>
        )}
        {displayMode === "inline" && (
          <button
            type="button"
            onClick={requestFullscreen}
            className="ui-secondary-button rounded-full px-2.5 py-1 text-[11px] font-semibold"
            aria-label="Expand to fullscreen"
          >
            Expand
          </button>
        )}
      </nav>
    </header>
  );
}
