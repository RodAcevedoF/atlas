import { defineConfig } from "@rsbuild/core";
import { pluginReact } from "@rsbuild/plugin-react";

export default defineConfig({
  plugins: [pluginReact()],
  html: {
    title: "Atlas — Mapped research",
    tags: [{ tag: "link", attrs: { rel: "icon", href: "/favicon.svg", type: "image/svg+xml" } }],
  },
  server: {
    port: 3000,
    proxy: {
      "/api": {
        target: "http://127.0.0.1:3100",
        changeOrigin: true,
        pathRewrite: { "^/api": "" },
      },
    },
  },
  source: {
    entry: { index: "./src/main.tsx" },
  },
});
