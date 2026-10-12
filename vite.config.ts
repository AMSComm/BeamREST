import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'
import fs from 'node:fs'

const pkg = JSON.parse(
  fs.readFileSync(new URL('./package.json', import.meta.url), 'utf-8')
)

export default defineConfig({
  plugins: [react(), tailwindcss()],
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
  clearScreen: false,
  server: {
    port: 1421,
    strictPort: true,
    host: true,
  },
  envPrefix: ['VITE_', 'TAURI_'],
})
