/**
 * useOpenAI — typed bindings for the window.openai Apps SDK globals.
 *
 * @see https://developers.openai.com/apps-sdk/concepts/widget-globals
 */

import { useCallback } from "react";
import { useSyncExternalStore } from "react";
import type { EcommerceState, ToolMeta, ToolOutput } from "../types";

// ─── window.openai global typings ─────────────────────────────────────────────

declare global {
  interface Window {
    openai?: {
      theme?: "light" | "dark";
      displayMode?: "pip" | "inline" | "fullscreen";
      maxHeight?: number;
      locale?: string;
      toolInput?: Record<string, unknown>;
      toolOutput?: ToolOutput;
      toolResponseMetadata?: ToolMeta;
      widgetState?: EcommerceState;
      setWidgetState?: (state: EcommerceState) => Promise<void>;
      sendFollowUpMessage?: (args: {
        prompt: string;
        scrollToBottom?: boolean;
      }) => Promise<void>;
      callTool?: (
        name: string,
        args: Record<string, unknown>,
      ) => Promise<{ result: string }>;
      requestDisplayMode?: (args: {
        mode: "pip" | "inline" | "fullscreen";
      }) => Promise<{ mode: "pip" | "inline" | "fullscreen" }>;
      requestModal?: (args: {
        title?: string;
        params?: Record<string, unknown>;
      }) => Promise<unknown>;
      requestClose?: () => Promise<void>;
      openExternal?: (payload: { href: string }) => void;
    };
  }
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

const SET_GLOBALS_EVENT = "openai:set_globals";

/**
 * Subscribe to any window.openai global value and re-render when it changes.
 * ChatGPT fires the "openai:set_globals" event whenever toolOutput,
 * widgetState, theme, displayMode etc. change.
 */
export function useOpenAiGlobal<T>(
  key: keyof NonNullable<Window["openai"]>,
): T | null {
  return useSyncExternalStore<T | null>(
    useCallback((onChange) => {
      if (typeof window === "undefined") return () => {};
      window.addEventListener(SET_GLOBALS_EVENT, onChange as EventListener, {
        passive: true,
      });
      return () =>
        window.removeEventListener(SET_GLOBALS_EVENT, onChange as EventListener);
    }, []),
    () => (window.openai?.[key] as T) ?? null,
    () => null,
  );
}

// ─── Action helpers ───────────────────────────────────────────────────────────

/** Send a follow-up message in the ChatGPT thread. */
export function sendMessage(prompt: string): void {
  void window.openai?.sendFollowUpMessage?.({ prompt, scrollToBottom: true });
}

/** Directly invoke an MCP tool without a user message. */
export function callTool(name: string, args: Record<string, unknown>): void {
  void window.openai?.callTool?.(name, args);
}

/** Request the widget to expand to fullscreen mode. */
export function requestFullscreen(): void {
  void window.openai?.requestDisplayMode?.({ mode: "fullscreen" });
}

/** Open a URL in the user's browser (outside the ChatGPT window). */
export function openExternal(href: string): void {
  window.openai?.openExternal?.({ href });
}
