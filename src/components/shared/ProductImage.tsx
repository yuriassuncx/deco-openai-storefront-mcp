import { useState } from "react";
import { Package } from "lucide-react";
import clsx from "clsx";

interface ProductImageProps {
  src?: string;
  alt: string;
  className?: string;
}

/**
 * Renders a product image with a placeholder fallback.
 * Uses lazy loading for performance.
 * @see https://schema.org/image
 */
export function ProductImage({ src, alt, className }: ProductImageProps) {
  const [errored, setErrored] = useState(false);

  if (!src || errored) {
    return (
      <div
        className={clsx(
          "flex items-center justify-center bg-[color:var(--ui-image-surface)] text-[color:var(--ui-subtle)]",
          className,
        )}
        aria-hidden="true"
      >
        <Package className="h-8 w-8" />
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      loading="lazy"
      decoding="async"
      onError={() => setErrored(true)}
      className={clsx("object-cover", className)}
      itemProp="image"
    />
  );
}
