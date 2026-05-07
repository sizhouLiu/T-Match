import { defineConfig } from 'vite'
import webExtension from 'vite-plugin-web-extension'
import { copyFileSync, mkdirSync } from 'fs'
import { resolve } from 'path'

export default defineConfig({
  plugins: [
    webExtension({
      manifest: 'manifest.json',
      additionalInputs: ['src/popup/index.html'],
    }),
    {
      name: 'copy-icons',
      closeBundle() {
        const iconsDir = resolve(__dirname, 'dist/icons')
        mkdirSync(iconsDir, { recursive: true })
        for (const icon of ['icon16.png', 'icon48.png', 'icon128.png']) {
          copyFileSync(resolve(__dirname, 'icons', icon), resolve(iconsDir, icon))
        }
      },
    },
  ],
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
})
