/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_WIDGET_ACCENT_COLOR?: string;
  readonly VITE_WIDGET_LOGO_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}