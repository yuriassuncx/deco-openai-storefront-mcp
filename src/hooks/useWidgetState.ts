/**
 * useWidgetState — persistent ecommerce client state synced with ChatGPT.
 *
 * State is kept in three places simultaneously:
 *   1. React local state (instant, no lag)
 *   2. localStorage (survives page refreshes within the same origin)
 *   3. window.openai.setWidgetState (synced back to ChatGPT session)
 *
 * ChatGPT passes widgetState back in via window.openai.widgetState on every
 * new tool call, which we sync into local state via useOpenAiGlobal.
 */

import { useCallback, useEffect, useState } from "react";
import { useOpenAiGlobal } from "./useOpenAI";
import type { EcommerceState } from "../types";

const STORAGE_KEY = "openai-storefront-widget-state-v1";

function readPersistedState(): EcommerceState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<EcommerceState>;
    if (!parsed.sessionId) return null;
    return {
      sessionId: parsed.sessionId,
      wishlistIds: Array.isArray(parsed.wishlistIds) ? parsed.wishlistIds : [],
      activeModalView: parsed.activeModalView ?? null,
      activeProduct: parsed.activeProduct ?? null,
      activeOutfitPairs: parsed.activeOutfitPairs ?? null,
      cartCount: typeof parsed.cartCount === "number" ? parsed.cartCount : 0,
      cartTotal: typeof parsed.cartTotal === "number" ? parsed.cartTotal : 0,
      cartFeedback: parsed.cartFeedback ?? null,
      styleMemory: parsed.styleMemory ?? { refinements: [] },
      savedLooks: Array.isArray(parsed.savedLooks) ? parsed.savedLooks : [],
    };
  } catch {
    return null;
  }
}

function generateSessionId(): string {
  return `s-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

function defaultEcommerceState(): EcommerceState {
  return (
    readPersistedState() ?? {
      sessionId: generateSessionId(),
      wishlistIds: [],
      activeModalView: null,
      activeProduct: null,
      activeOutfitPairs: null,
      cartCount: 0,
      cartTotal: 0,
      cartFeedback: null,
      styleMemory: { refinements: [] },
      savedLooks: [],
    }
  );
}

export type WidgetStateUpdater = (
  updater: (prev: EcommerceState) => EcommerceState,
) => void;

/**
 * Returns [state, update] where update accepts a functional updater.
 * Writes through to localStorage and window.openai.setWidgetState.
 */
export function useWidgetState(): [EcommerceState, WidgetStateUpdater] {
  const serverState = useOpenAiGlobal<EcommerceState>("widgetState");

  const [localState, setLocalState] = useState<EcommerceState>(
    () => serverState ?? defaultEcommerceState(),
  );

  useEffect(() => {
    if (serverState != null) setLocalState(serverState);
  }, [serverState]);

  const update = useCallback<WidgetStateUpdater>((updater) => {
    setLocalState((prev) => {
      const next = updater(prev);
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch { /* storage full or private mode */ }
      void window.openai?.setWidgetState?.(next);
      return next;
    });
  }, []);

  return [localState, update];
}
