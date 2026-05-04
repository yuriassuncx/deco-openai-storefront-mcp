import { Heart } from "lucide-react";
import clsx from "clsx";

interface WishlistButtonProps {
  isWishlisted: boolean;
  /** Product name for accessible label */
  label: string;
  onToggle: () => void;
}

/**
 * Toggle button to add/remove a product from the wishlist.
 * @see https://schema.org/WantAction
 */
export function WishlistButton({ isWishlisted, label, onToggle }: WishlistButtonProps) {
  return (
    <button
      type="button"
      aria-label={isWishlisted ? `Remove ${label} from wishlist` : `Save ${label} to wishlist`}
      aria-pressed={isWishlisted}
      onClick={(e) => {
        e.stopPropagation();
        onToggle();
      }}
      className="flex h-8 w-8 items-center justify-center rounded-full border border-[color:var(--ui-border)] bg-[color:var(--ui-surface-elevated)] transition-colors hover:bg-[color:var(--ui-pill)]"
    >
      <Heart
        aria-hidden="true"
        className={clsx(
          "h-3.5 w-3.5 transition-colors",
          isWishlisted ? "fill-current text-[color:var(--ui-text)]" : "text-[color:var(--ui-subtle)]",
        )}
      />
    </button>
  );
}
