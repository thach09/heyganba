/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Base URL của backend API, gồm cả context-path (VD: https://heyganba-api.onrender.com/api/v1). */
  readonly VITE_API_BASE_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
