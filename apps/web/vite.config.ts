import path from "path"
import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"
import { defineConfig, loadEnv } from "vite"

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "")
  const targetUrl = env.VITE_TRACCAR_URL || "http://localhost:8082"

  // Clean the URL if it already has /api in it, so we don't proxy to /api/api
  const cleanTarget = targetUrl.replace(/\/api\/?$/, "")

  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    server: {
      proxy: {
        "/api/socket": {
          target: cleanTarget.replace(/^http/, "ws"),
          ws: true,
          changeOrigin: true,
        },
        "/api": {
          target: cleanTarget,
          changeOrigin: true,
        },
      },
    },
  }
})
