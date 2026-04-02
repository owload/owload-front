import path from "path"
import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"
import { VitePWA } from "vite-plugin-pwa"
import { defineConfig } from "vite"
import {sri} from 'vite-plugin-sri3'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      srcDir: "src",
      filename: "service-worker.ts",
      strategies: "injectManifest",
      injectRegister: false,
      manifest: false,
      injectManifest: {
        injectionPoint: undefined,
      },
      devOptions: {
        enabled: true,
        type: 'module'
      }
    }),
    sri({ignoreMissingAsset: true})
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
})