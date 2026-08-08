import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const backendOrigin = (
    env.VITE_API_URL ||
    env.VITE_BASE_URL ||
    "http://localhost:3000"
  ).replace(/\/$/, "");

  return {
    plugins: [react()],
    server: {
      port: 5173,
      headers: {
        "Cross-Origin-Opener-Policy": "same-origin-allow-popups",
      },
      proxy: {
        "/api": {
          target: backendOrigin,
          changeOrigin: true,
          secure: false,
        },
        "/socket.io": {
          target: backendOrigin,
          ws: true,
          changeOrigin: true,
        },
      },
    },
  };
});
