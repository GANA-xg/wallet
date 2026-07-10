import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";

const port = process.env.PORT ? Number(process.env.PORT) : 3000;
const basePath = process.env.BASE_PATH ?? "/";

// Conditionally load Replit-specific plugins (only when REPL_ID is set)
const replitPlugins: any[] = [];
if (process.env.REPL_ID) {
  try {
    const runtimeErrorOverlay = (await import("@replit/vite-plugin-runtime-error-modal")).default;
    replitPlugins.push(runtimeErrorOverlay());
    const { cartographer } = await import("@replit/vite-plugin-cartographer");
    replitPlugins.push(
      cartographer({
        root: path.resolve(import.meta.dirname, ".."),
      }),
    );
  } catch {
    // Replit plugins not available — skip (production build)
  }
}

export default defineConfig({
  base: basePath,
  plugins: [
    react(),
    tailwindcss(),
    ...replitPlugins,
  ],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "src"),
    },
  },
  root: path.resolve(import.meta.dirname),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist"),
    emptyOutDir: true,
  },
  server: {
    port,
    host: "0.0.0.0",
    allowedHosts: true,
    fs: {
      strict: true,
    },
  },
  preview: {
    port,
    host: "0.0.0.0",
    allowedHosts: true,
  },
});
