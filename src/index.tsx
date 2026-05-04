/**
 * index.tsx — widget entry point.
 * Imports global styles and mounts the root App component.
 */
import "./index.css";
import { createRoot } from "react-dom/client";
import { App } from "./App";

const rootEl = document.getElementById("openai-storefront-root");
if (rootEl) {
  createRoot(rootEl).render(<App />);
}
