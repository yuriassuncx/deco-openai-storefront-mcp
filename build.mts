/**
 * build.mts — Builds the widget React app into a single self-contained HTML file.
 * Output: assets/storefront-widget.html (served by the MCP server via resources/read)
 *
 * Run: pnpm build
 */

import react from "@vitejs/plugin-react";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "vite";
import tailwindcss from "@tailwindcss/vite";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const tempDir = path.join(__dirname, ".build");
const assetsDir = path.join(__dirname, "assets");
const jsOut = path.join(tempDir, "widget.js");
const cssOut = path.join(tempDir, "widget.css");
const htmlOut = path.join(assetsDir, "storefront-widget.html");

const widgetDir = path.join(__dirname, "src");

await build({
  root: widgetDir,
  plugins: [tailwindcss(), react()],
  esbuild: {
    jsx: "automatic",
    jsxImportSource: "react",
    target: "es2022",
  },
  build: {
    target: "es2022",
    outDir: tempDir,
    emptyOutDir: true,
    minify: "esbuild",
    cssCodeSplit: false,
    rollupOptions: {
      input: path.join(widgetDir, "index.tsx"), // src/index.tsx
      output: {
        format: "es",
        entryFileNames: "widget.js",
        inlineDynamicImports: true,
        assetFileNames: (info) =>
          info.name?.endsWith(".css") ? "widget.css" : "[name][extname]",
      },
    },
  },
});

const js = fs.existsSync(jsOut) ? fs.readFileSync(jsOut, "utf8") : "";
const css = fs.existsSync(cssOut) ? fs.readFileSync(cssOut, "utf8") : "";

const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="color-scheme" content="light dark" />
  <style>${css}</style>
</head>
<body>
  <div id="openai-storefront-root"></div>
  <script type="module">${js}</script>
</body>
</html>`;

fs.mkdirSync(assetsDir, { recursive: true });
fs.writeFileSync(htmlOut, html, "utf8");

// Cleanup temp dir
fs.rmSync(tempDir, { recursive: true, force: true });

console.log(`\n  ✓ Widget built → assets/storefront-widget.html (${(html.length / 1024).toFixed(0)} KB)\n`);
