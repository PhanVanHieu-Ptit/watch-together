import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
export default defineConfig({
  plugins: [react()],
  server: {
    strictPort: true,
    // Preserve the browser Host so the backend can validate the request Origin.
    proxy: {
      "/api": { target: "http://127.0.0.1:3001", changeOrigin: false },
      "/socket.io": { target: "http://127.0.0.1:3001", changeOrigin: false, ws: true },
    },
  },
});
