/**
 * App — root component for the OpenAI Storefront Widget.
 *
 * Dispatches to the correct view component based on:
 *   1. widgetState.activeModalView  (user-initiated navigation)
 *   2. toolOutput.view              (last MCP tool response)
 *
 * All MCP tool structuredContent shapes are handled here:
 *   "product-list"   → ProductCarousel (inline) / ProductGrid (fullscreen)
 *   "product-detail" → ProductDetail
 *   "outfit"         → OutfitView
 *   "cart"           → CartView
 *   "cart-error"     → MessageView (error)
 *   "wishlist"       → WishlistView
 *   "categories"     → CategoriesView
 *   "orders"         → OrdersView
 *   "message"        → MessageView
 *   suggestions/top-searches → SuggestionsView
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties } from "react";
import clsx from "clsx";

import { useOpenAiGlobal, callTool } from "./hooks/useOpenAI";
import { useWidgetState } from "./hooks/useWidgetState";

import { AppHeader } from "./components/AppHeader";
import { MiniCartBar } from "./components/MiniCartBar";
import { LoadingSpinner } from "./components/shared/LoadingSpinner";
import { BackButton } from "./components/shared/BackButton";
import { ProductCarousel } from "./components/ProductCarousel";
import { ProductGrid } from "./components/ProductGrid";
import { ProductDetail } from "./components/ProductDetail";
import { OutfitView } from "./components/OutfitView";
import { CartView } from "./components/CartView";
import { WishlistView } from "./components/WishlistView";
import { CategoriesView } from "./components/CategoriesView";
import { SuggestionsView } from "./components/SuggestionsView";
import { OrdersView } from "./components/OrdersView";
import { MessageView } from "./components/MessageView";

import type { CartFeedback, Product, StorefrontCapabilities, ToolMeta, ToolOutput } from "./types";

const WIDGET_ACCENT_COLOR = import.meta.env.VITE_WIDGET_ACCENT_COLOR?.trim() || "#000000";
const WIDGET_LOGO_URL = import.meta.env.VITE_WIDGET_LOGO_URL?.trim() || "";

type ToolOutputEnvelope =
  | ToolOutput
  | {
    structuredContent?: ToolOutput | null;
  }
  | null;

function sameStringList(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  return a.every((value, index) => value === b[index]);
}

function extractStructuredToolOutput(value: ToolOutputEnvelope): ToolOutput {
  if (!value || typeof value !== "object") {
    return null;
  }

  if ("structuredContent" in value) {
    return value.structuredContent ?? null;
  }

  return value as ToolOutput;
}

function isCollectionLikeView(value: ToolOutput): boolean {
  if (!value) {
    return false;
  }

  return value.view === "product-list"
    || (value.view === "wishlist" && Array.isArray(value.wishlist) && value.wishlist.length > 0)
    || value.view === "categories"
    || value.view === "orders"
    || Array.isArray(value.suggestions)
    || Array.isArray(value.topSearches);
}

export function App() {
  const rawToolOutput = useOpenAiGlobal<ToolOutputEnvelope>("toolOutput");
  const toolMeta = useOpenAiGlobal<ToolMeta>("toolResponseMetadata");
  const theme = useOpenAiGlobal<string>("theme") ?? "light";
  const displayMode = useOpenAiGlobal<string>("displayMode") ?? "inline";

  const toolOutput = useMemo(
    () => extractStructuredToolOutput(rawToolOutput),
    [rawToolOutput],
  );
  const [toolOutputOverride, setToolOutputOverride] = useState<ToolOutput>(null);
  const [isCartPending, setIsCartPending] = useState(false);
  const [isWishlistPending, setIsWishlistPending] = useState(false);
  const previousCollectionViewRef = useRef<ToolOutput>(null);

  const [widgetState, updateWidgetState] = useWidgetState();

  const storeName = toolMeta?.storeName ?? "Store";
  const storefrontUrl = toolMeta?.storefrontUrl as string | undefined;
  const accentColor = WIDGET_ACCENT_COLOR;
  const logoUrl = WIDGET_LOGO_URL;

  // Capabilities map: tells the widget the real tool names for each action.
  // Falls back to sensible canonical names when not present.
  const capabilities: StorefrontCapabilities = toolMeta?.capabilities ?? {};

  const { wishlistIds, cartCount, cartTotal, cartFeedback } = widgetState;

  useEffect(() => {
    if (isCollectionLikeView(toolOutput)) {
      previousCollectionViewRef.current = toolOutput;
      setToolOutputOverride(null);
    }
  }, [toolOutput]);

  useEffect(() => {
    if (toolOutput?.view === "cart" || toolOutput?.view === "cart-error" || toolOutput?.cart) {
      setIsCartPending(false);
    } else if (isCartPending && toolOutput !== null && toolOutput !== undefined) {
      // Response came back but without cart data — stop spinning
      setIsCartPending(false);
    }
    if (
      toolOutput?.view === "wishlist"
      || Array.isArray(toolOutput?.wishlist)
      || Array.isArray(toolOutput?.wishlistProductIds)
    ) {
      setIsWishlistPending(false);
    }
  }, [toolOutput]);

  useEffect(() => {
    if (toolOutput?.cart) {
      const nextCartCount = toolOutput.cart.items.reduce((sum, item) => sum + item.quantity, 0);
      const nextCartTotal = toolOutput.totals?.total
        ?? toolOutput.cart.items.reduce((sum, item) => sum + item.product.price * item.quantity, 0);

      updateWidgetState((prev) => {
        if ((prev.cartCount ?? 0) === nextCartCount && (prev.cartTotal ?? 0) === nextCartTotal) {
          return prev;
        }

        return {
          ...prev,
          cartCount: nextCartCount,
          cartTotal: nextCartTotal,
        };
      });
    }

    if (Array.isArray(toolOutput?.wishlistProductIds)) {
      updateWidgetState((prev) => {
        const nextWishlistIds = toolOutput.wishlistProductIds ?? [];
        if (sameStringList(prev.wishlistIds, nextWishlistIds)) {
          return prev;
        }

        if (nextWishlistIds.length === 0 && prev.wishlistIds.length > 0) {
          return prev;
        }

        return {
          ...prev,
          wishlistIds: nextWishlistIds,
        };
      });
    }
  }, [toolOutput?.cart, toolOutput?.totals, toolOutput?.wishlistProductIds, updateWidgetState]);

  const visibleToolOutput = toolOutputOverride ?? toolOutput;

  const preserveCurrentView = useCallback(() => {
    const snapshot = previousCollectionViewRef.current
      ?? (isCollectionLikeView(visibleToolOutput) ? visibleToolOutput : null);

    if (snapshot) {
      setToolOutputOverride(snapshot);
    }
  }, [visibleToolOutput]);

  const shellStyle = useMemo<CSSProperties>(() => {
    const isDark = theme === "dark";

    return {
      colorScheme: isDark ? "dark" : "light",
      "--ui-bg": isDark ? "#0b0d10" : "#f7f4ee",
      "--ui-surface": isDark ? "#11151a" : "#fffcf6",
      "--ui-surface-elevated": isDark ? "#171c22" : "#ffffff",
      "--ui-image-surface": isDark ? "#1b2129" : "#f1eee8",
      "--ui-card": isDark ? "#151a20" : "#ffffff",
      "--ui-border": isDark ? "rgba(255,255,255,0.10)" : "rgba(17,24,39,0.08)",
      "--ui-border-strong": isDark ? "rgba(255,255,255,0.18)" : "rgba(17,24,39,0.14)",
      "--ui-text": isDark ? "#f5f7fb" : "#111318",
      "--ui-muted": isDark ? "rgba(245,247,251,0.70)" : "rgba(17,19,24,0.64)",
      "--ui-subtle": isDark ? "rgba(245,247,251,0.48)" : "rgba(17,19,24,0.42)",
      "--ui-pill": isDark ? "rgba(255,255,255,0.08)" : "rgba(17,19,24,0.05)",
      "--ui-pill-strong": isDark ? "rgba(255,255,255,0.12)" : "rgba(17,19,24,0.08)",
      "--ui-strong": isDark ? "#f5f7fb" : "#111318",
      "--ui-strong-text": isDark ? "#111318" : "#ffffff",
      "--ui-danger": isDark ? "#ff8c83" : "#d92d20",
      "--ui-danger-soft": isDark ? "rgba(255,140,131,0.16)" : "rgba(217,45,32,0.12)",
      "--ui-shadow-soft": isDark
        ? "0 12px 28px rgba(0,0,0,0.24)"
        : "0 12px 28px rgba(15, 23, 42, 0.08)",
      "--ui-shadow": isDark
        ? "0 22px 50px rgba(0,0,0,0.35)"
        : "0 20px 48px rgba(15, 23, 42, 0.10)",
    } as CSSProperties;
  }, [theme]);

  // ── Wishlist toggle ────────────────────────────────────────────────────────
  const toggleWishlist = useCallback(
    (product: Product) => {
      const wishlistId = product.id;
      const isWishlisted = widgetState.wishlistIds.includes(wishlistId);
      updateWidgetState((prev) => ({
        ...prev,
        wishlistIds: isWishlisted
          ? prev.wishlistIds.filter((x) => x !== wishlistId)
          : [...prev.wishlistIds, wishlistId],
      }));
      preserveCurrentView();
      // Use the capability-mapped tool name, fall back to the canonical name.
      callTool(capabilities.wishlistToggle ?? "wishlist_toggle", {
        productID: product.productID || product.id,
        productGroupID: product.id,
        action: isWishlisted ? "remove" : "add",
      });
    },
    [widgetState.wishlistIds, updateWidgetState, capabilities.wishlistToggle, preserveCurrentView],
  );

  // ── Add to cart ────────────────────────────────────────────────────────────
  const addToCart = useCallback(
    (product: Product, size: string) => {
      const feedback: CartFeedback = {
        productId: product.id,
        productName: product.name,
        size,
        addedAt: Date.now(),
      };
      updateWidgetState((prev) => ({
        ...prev,
        cartCount: (prev.cartCount ?? 0) + 1,
        cartTotal: (prev.cartTotal ?? 0) + product.price,
        cartFeedback: feedback,
      }));
      preserveCurrentView();
      callTool(capabilities.cartAdd ?? "add_to_cart", {
        productId: product.id,
        sku: product.sku,
        size,
        quantity: 1,
      });
    },
    [updateWidgetState, capabilities.cartAdd, preserveCurrentView],
  );

  // ── Navigation ─────────────────────────────────────────────────────────────
  const openDetail = useCallback(
    (product: Product, outfitPairs?: Product[]) => {
      updateWidgetState((prev) => ({
        ...prev,
        activeModalView: "product-detail",
        activeProduct: product,
        activeOutfitPairs: outfitPairs ?? null,
      }));
    },
    [updateWidgetState],
  );

  const closeModal = useCallback(() => {
    setIsCartPending(false);
    setIsWishlistPending(false);
    updateWidgetState((prev) => ({
      ...prev,
      activeModalView: null,
      activeProduct: null,
      activeOutfitPairs: null,
    }));
  }, [updateWidgetState]);

  const restorePreviousCollectionView = useCallback(() => {
    if (previousCollectionViewRef.current) {
      setToolOutputOverride(previousCollectionViewRef.current);
      return;
    }

    closeModal();
  }, [closeModal]);

  const openCart = useCallback(
    () => {
      preserveCurrentView();
      setIsCartPending(true);
      updateWidgetState((prev) => ({ ...prev, activeModalView: "cart" }));
      callTool(capabilities.cartView ?? "view_cart", {});
    },
    [updateWidgetState, capabilities.cartView, preserveCurrentView],
  );

  const openWishlist = useCallback(
    () => {
      preserveCurrentView();
      updateWidgetState((prev) => ({ ...prev, activeModalView: "wishlist" }));
      if (wishlistIds.length === 0) {
        setIsWishlistPending(true);
        callTool(capabilities.wishlistView ?? "view_wishlist", {});
      }
    },
    [updateWidgetState, capabilities.wishlistView, preserveCurrentView, wishlistIds.length],
  );

  // ── View resolution ────────────────────────────────────────────────────────
  const activeModal = widgetState.activeModalView;

  // Wishlist products: prefer live toolOutput.wishlist, fall back to known
  // wishlistIds filtered from the most recent product list in toolOutput.
  const wishlistProducts = useMemo<Product[]>(() => {
    if (toolOutput?.wishlist) return toolOutput.wishlist;
    const products: Product[] =
      visibleToolOutput?.products ??
      visibleToolOutput?.outfitItems ??
      (visibleToolOutput?.product ? [visibleToolOutput.product] : []);
    return products.filter((p) => wishlistIds.includes(p.id));
  }, [toolOutput?.wishlist, visibleToolOutput, wishlistIds]);

  // ── Render ─────────────────────────────────────────────────────────────────
  const renderBody = () => {
    // ── Inline product detail overlay ──────────────────────────────────────
    if (activeModal === "product-detail" && widgetState.activeProduct) {
      return (
        <ProductDetail
          product={widgetState.activeProduct}
          outfitPairs={widgetState.activeOutfitPairs ?? undefined}
          wishlistIds={wishlistIds}
          accentColor={accentColor}
          cartFeedback={cartFeedback}
          onToggleWishlist={toggleWishlist}
          onAddToCart={addToCart}
          onOpenDetail={(p) => openDetail(p)}
          onBack={closeModal}
        />
      );
    }

    // ── Cart overlay ────────────────────────────────────────────────────────
    if (activeModal === "cart") {
      return (
        <div className="space-y-4">
          <BackButton onClick={closeModal} />
          {toolOutput?.cart ? (
            <CartView
              cart={toolOutput.cart}
              totals={toolOutput.totals}
              accentColor={accentColor}
              capabilities={capabilities}
              storefrontUrl={storefrontUrl}
              onOpenDetail={openDetail}
            />
          ) : isCartPending ? (
            <LoadingSpinner accentColor={accentColor} label="Loading cart..." />
          ) : (
            <p className="text-sm text-[color:var(--ui-muted)]">No cart data available.</p>
          )}
        </div>
      );
    }

    // ── Wishlist overlay ────────────────────────────────────────────────────
    if (activeModal === "wishlist") {
      return (
        <div className="space-y-4">
          <BackButton onClick={closeModal} />
          {isWishlistPending ? (
            <LoadingSpinner accentColor={accentColor} label="Loading wishlist..." />
          ) : (
            <WishlistView
              products={toolOutput?.wishlist ?? wishlistProducts}
              wishlistIds={wishlistIds}
              accentColor={accentColor}
              onOpenDetail={openDetail}
              onToggleWishlist={toggleWishlist}
            />
          )}
        </div>
      );
    }

    // ── Tool output views ───────────────────────────────────────────────────
    if (!visibleToolOutput) {
      return <LoadingSpinner accentColor={accentColor} />;
    }

    const view = visibleToolOutput.view;

    // product-list
    if (view === "product-list") {
      const products = visibleToolOutput.products ?? [];
      if (displayMode === "fullscreen") {
        return (
          <ProductGrid
            products={products}
            wishlistIds={wishlistIds}
            accentColor={accentColor}
            query={visibleToolOutput.query}
            totalFound={visibleToolOutput.totalFound}
            cartFeedback={cartFeedback}
            onOpenDetail={openDetail}
            onToggleWishlist={toggleWishlist}
          />
        );
      }
      return (
        <ProductCarousel
          products={products}
          wishlistIds={wishlistIds}
          accentColor={accentColor}
          query={visibleToolOutput.query}
          totalFound={visibleToolOutput.totalFound}
          cartFeedback={cartFeedback}
          onOpenDetail={openDetail}
          onToggleWishlist={toggleWishlist}
        />
      );
    }

    // product-detail
    if (view === "product-detail" && visibleToolOutput.product) {
      return (
        <ProductDetail
          product={visibleToolOutput.product}
          outfitPairs={visibleToolOutput.outfitPairs}
          wishlistIds={wishlistIds}
          accentColor={accentColor}
          cartFeedback={cartFeedback}
          onToggleWishlist={toggleWishlist}
          onAddToCart={addToCart}
          onOpenDetail={openDetail}
          onBack={previousCollectionViewRef.current ? restorePreviousCollectionView : undefined}
        />
      );
    }

    // outfit — from recommendOutfit tool
    if (view === "outfit" && visibleToolOutput.anchor) {
      return (
        <OutfitView
          anchor={visibleToolOutput.anchor}
          outfitItems={visibleToolOutput.outfitItems ?? []}
          totalOutfitPrice={visibleToolOutput.totalOutfitPrice}
          wishlistIds={wishlistIds}
          accentColor={accentColor}
          onOpenDetail={openDetail}
          onToggleWishlist={toggleWishlist}
        />
      );
    }

    // cart
    if (view === "cart" && visibleToolOutput.cart) {
      return (
        <CartView
          cart={visibleToolOutput.cart}
          totals={visibleToolOutput.totals}
          accentColor={accentColor}
          capabilities={capabilities}
          storefrontUrl={storefrontUrl}
          onOpenDetail={openDetail}
        />
      );
    }

    // cart-error
    if (view === "cart-error") {
      return (
        <MessageView
          error={visibleToolOutput.error ?? "Could not update cart. Please try again."}
          accentColor={accentColor}
        />
      );
    }

    // wishlist
    if (view === "wishlist") {
      return (
        <WishlistView
          products={visibleToolOutput.wishlist ?? []}
          wishlistIds={wishlistIds}
          accentColor={accentColor}
          onOpenDetail={openDetail}
          onToggleWishlist={toggleWishlist}
        />
      );
    }

    // categories
    if (view === "categories" && visibleToolOutput.categories) {
      return (
        <CategoriesView
          categories={visibleToolOutput.categories}
          accentColor={accentColor}
        />
      );
    }

    // suggestions / top-searches
    if (visibleToolOutput.suggestions ?? visibleToolOutput.topSearches) {
      return (
        <SuggestionsView
          suggestions={visibleToolOutput.suggestions}
          topSearches={visibleToolOutput.topSearches}
        />
      );
    }

    // orders
    if (view === "orders" && visibleToolOutput.orders) {
      return <OrdersView orders={visibleToolOutput.orders} />;
    }

    // message / error
    if (view === "message" || visibleToolOutput.message || visibleToolOutput.error) {
      return (
        <MessageView
          message={visibleToolOutput.message}
          error={visibleToolOutput.error}
          suggestions={visibleToolOutput.suggestions}
          accentColor={accentColor}
        />
      );
    }

    // fallback: still waiting for a tool call
    return <LoadingSpinner accentColor={accentColor} />;
  };

  const hasBarContent = (cartCount ?? 0) > 0 || wishlistIds.length > 0;

  return (
    <div
      data-theme={theme}
      className={clsx(
        "min-h-full font-sans antialiased bg-[color:var(--ui-bg)] text-[color:var(--ui-text)]",
      )}
      style={shellStyle}
    >
      <div
        className={clsx(
          "mx-auto flex flex-col gap-4 p-4",
          displayMode === "fullscreen" ? "max-w-2xl" : "",
        )}
        style={{
          paddingBottom: hasBarContent ? "5rem" : undefined,
        }}
      >
        <AppHeader
          storeName={storeName}
          logoUrl={logoUrl}
          cartCount={cartCount ?? 0}
          wishlistCount={wishlistIds.length}
          displayMode={displayMode}
          accentColor={accentColor}
          onOpenCart={openCart}
          onOpenWishlist={openWishlist}
        />
        <main>{renderBody()}</main>
      </div>

      <MiniCartBar
        cartCount={cartCount ?? 0}
        cartTotal={cartTotal ?? 0}
        wishlistCount={wishlistIds.length}
        cartFeedback={cartFeedback}
        accentColor={accentColor}
        onOpenCart={openCart}
        onOpenWishlist={openWishlist}
      />
    </div>
  );
}
